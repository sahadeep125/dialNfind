"""Shared helpers for bulk open place datasets (Overture Maps, Foursquare OS Places).

Both publish GeoParquet files that DuckDB reads straight from object storage, filtered to
the search bounding box, so a whole city costs one query. The extract is cached as a
local parquet file so reruns (and --resume) never download it again.
"""

from __future__ import annotations

import hashlib
import re
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from ..classification import CategoryRule
from ..extraction import find_locality, mentions_any
from ..logging_setup import get_logger
from ..models import Evidence, Location, RawRecord
from ..normalization import clean_phone, clean_text, is_blocked, normalize_email, normalize_pincode, normalize_url

log = get_logger("source.places")

STATE_CODES = {"WB": "West Bengal", "SK": "Sikkim", "BR": "Bihar", "AS": "Assam"}


def cached_extract(
    cache_dir: str | Path,
    prefix: str,
    cache_key: str,
    max_age_hours: float,
    build: Callable[[Path], None],
) -> Path:
    """Path of a cached parquet extract, running ``build(path)`` when it is missing or stale."""
    digest = hashlib.sha1(cache_key.encode()).hexdigest()[:12]
    path = Path(cache_dir) / f"{prefix}_{digest}.parquet"
    if path.exists() and time.time() - path.stat().st_mtime < max_age_hours * 3600:
        log.info("Using cached %s extract %s", prefix, path)
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp.parquet")
    build(tmp)
    tmp.replace(path)
    return path


def read_rows(path: Path) -> list[dict[str, Any]]:
    import duckdb

    con = duckdb.connect()
    try:
        rel = con.execute("SELECT * FROM read_parquet(?)", [str(path)])
        columns = [d[0] for d in rel.description]
        return [dict(zip(columns, row, strict=True)) for row in rel.fetchall()]
    finally:
        con.close()


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def split_values(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return [str(v) for v in value if v]
    return [v.strip() for v in re.split(r"[;,]", str(value)) if v.strip()]


def fill_contact(rec: RawRecord, phones: Any, emails: Any, websites: Any, blocked_domains: list[str], how: str) -> None:
    rec.phones = list(dict.fromkeys(p for p in (clean_phone(x) for x in split_values(phones)) if p))
    if rec.phones:
        rec.field_sources["phone"] = how
    rec.emails = list(dict.fromkeys(e for e in (normalize_email(x) for x in split_values(emails)) if e))
    for raw in split_values(websites):
        url = normalize_url(raw)
        if url and not is_blocked(url, blocked_domains):
            rec.website = url
            rec.field_sources["website"] = how
            break


def fill_address(
    rec: RawRecord,
    location: Location,
    profile: dict[str, Any],
    *,
    freeform: str,
    locality: str,
    postcode: str,
    region: str,
    how: str,
) -> None:
    """The place lies inside the city's search box, so the city is the target city unless the
    dataset names a different one that is not a known locality of it."""
    freeform, locality = clean_text(freeform), clean_text(locality)
    known = profile.get("localities", [])
    city_terms = [location.city, *profile.get("aliases", [])]
    rec.pincode = normalize_pincode(postcode or "")
    parts = [freeform]
    if locality and not mentions_any(freeform, [locality]):
        parts.append(locality)
    rec.address = ", ".join(p for p in parts if p)
    if rec.address:
        rec.field_sources["address"] = how
    if locality and mentions_any(locality, city_terms):
        rec.city = location.city
        rec.locality = find_locality(freeform, known)
    else:
        rec.city = location.city
        rec.field_sources["city"] = "derived:bbox"
        rec.locality = find_locality(locality, known) or find_locality(freeform, known) or locality
    state = clean_text(region or "")
    rec.state = STATE_CODES.get(state.upper(), state) or location.state
    if not state:
        rec.field_sources["state"] = "derived:bbox"
    rec.country = location.country


def humanize(tag: str) -> str:
    return tag.replace("_", " ")


def rule_matches(rec: RawRecord, rule: CategoryRule) -> bool:
    """Cheap prefilter before classification: a dataset category the rule knows, or a rule
    keyword / name pattern in the business name."""
    tags = {t.lower() for t in rec.evidence.osm_tags}
    if any(t.lower() in tags for t in (*rule.strong_tags, *rule.weak_tags)):
        return True
    name = rec.provider_name
    if rule.osm_name_regex and re.search(rule.osm_name_regex, name, re.I):
        return True
    return any(pattern.search(name) for _, pattern in rule._kw)


def evidence_for(tags: list[str], categories_text: list[str]) -> Evidence:
    return Evidence(structured=" | ".join(dict.fromkeys(t for t in categories_text if t)), osm_tags=tags)
