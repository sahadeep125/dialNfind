"""Overture Maps places (https://docs.overturemaps.org/guides/places/).

Open data: most records are CDLA-Permissive-2.0, the Foursquare-contributed ones Apache-2.0.
One DuckDB query per run downloads every place inside the search box from the public S3
bucket (no key needed); records are then matched to categories by their Overture taxonomy
(``taxonomy.primary`` plus its ``hierarchy``) or by rule keywords in the business name.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from ..logging_setup import get_logger
from ..models import SOURCE_OVERTURE, Candidate, Location, RawRecord
from ..normalization import clean_text
from ._places import (
    cached_extract,
    evidence_for,
    fill_address,
    fill_contact,
    humanize,
    read_rows,
    rule_matches,
    sql_literal,
)
from .base import DiscoverySource
from .osm import BBox, resolve_bbox

log = get_logger("source.overture")

OVERTURE_ATTRIBUTION = (
    "Overture Maps Foundation places, CDLA-Permissive-2.0 / Apache-2.0 (https://overturemaps.org)"
)
CLOSED = {"permanently_closed", "temporarily_closed", "closed"}


def build_overture_query(url: str, bbox: BBox, out_path: str) -> str:
    south, west, north, east = bbox
    return f"""
COPY (
  SELECT id,
         names."primary" AS name,
         phones, websites, emails, addresses,
         taxonomy."primary" AS category,
         taxonomy.hierarchy AS hierarchy,
         taxonomy.alternates AS alternates,
         confidence, operating_status,
         bbox.xmin AS lon, bbox.ymin AS lat
  FROM read_parquet({sql_literal(url)}, hive_partitioning = 1)
  WHERE bbox.xmin >= {west} AND bbox.xmax <= {east}
    AND bbox.ymin >= {south} AND bbox.ymax <= {north}
) TO {sql_literal(out_path)} (FORMAT parquet)
"""


def place_to_record(
    row: dict[str, Any],
    location: Location,
    profile: dict[str, Any],
    *,
    blocked_domains: list[str],
    min_confidence: float,
) -> RawRecord | None:
    name = clean_text(row.get("name"))
    if not name or row.get("id") is None:
        return None
    if str(row.get("operating_status") or "").lower() in CLOSED:
        return None
    confidence = row.get("confidence")
    if confidence is not None and float(confidence) < min_confidence:
        return None
    pid = str(row["id"])
    rec = RawRecord(
        source_name=SOURCE_OVERTURE,
        source_url=f"overture:place/{pid}",
        provider_name=name,
        discovered_via=SOURCE_OVERTURE,
        has_structured_data=True,
        record_key=f"overture:{pid}",
    )
    rec.field_sources["provider_name"] = "overture"
    fill_contact(rec, row.get("phones"), row.get("emails"), row.get("websites"), blocked_domains, "overture")
    addresses = row.get("addresses") or []
    first = addresses[0] if addresses else {}
    fill_address(
        rec, location, profile,
        freeform=first.get("freeform") or "", locality=first.get("locality") or "",
        postcode=first.get("postcode") or "", region=first.get("region") or "", how="overture",
    )
    if row.get("lat") is not None and row.get("lon") is not None:
        rec.latitude, rec.longitude = float(row["lat"]), float(row["lon"])
        rec.field_sources["latitude"] = "overture-geometry"
    primary = str(row.get("category") or "")
    tags = [primary, *(row.get("hierarchy") or [])]
    rec.evidence = evidence_for(
        [f"overture={t}" for t in dict.fromkeys(t for t in tags if t)],
        [humanize(a) for a in (row.get("alternates") or [])],
    )
    rec.structured_types = [f"overture:{primary}"] if primary else []
    return rec


class OvertureSource(DiscoverySource):
    name = "overture"
    config_key = "overture"
    query_mode = "once"

    def available(self) -> tuple[bool, str]:
        try:
            import duckdb  # noqa: F401
        except ImportError:
            return False, "duckdb is not installed (pip install -r requirements.txt)"
        return True, ""

    def _extract(self, location: Location) -> Path:
        cfg = self.ctx.settings.overture
        bbox = resolve_bbox(self.ctx, location)
        url = cfg.base_url.format(release=cfg.release)

        def build(path: Path) -> None:
            import duckdb

            log.info("Downloading Overture places %s for %s (one query, may take a few minutes)", cfg.release, bbox)
            con = duckdb.connect()
            try:
                if url.startswith("s3://"):
                    con.execute("INSTALL httpfs; LOAD httpfs;")
                    con.execute(f"SET s3_region={sql_literal(cfg.s3_region)};")
                con.execute(build_overture_query(url, bbox, str(path)))
            finally:
                con.close()

        return cached_extract(
            Path(self.ctx.settings.output_dir), "overture", f"{url}|{bbox}", cfg.cache_hours, build
        )

    def discover(self, query: str, location: Location, category: str) -> list[Candidate]:
        cfg = self.ctx.settings.overture
        rows = read_rows(self._extract(location))
        profile = self.ctx.settings.location_profile()
        rules = list(self.ctx.rules.values())
        out: list[Candidate] = []
        skipped = 0
        for row in rows:
            rec = place_to_record(
                row, location, profile,
                blocked_domains=self.ctx.settings.blocked_domains, min_confidence=cfg.min_confidence,
            )
            if rec is None:
                skipped += 1
                continue
            if not any(rule_matches(rec, rule) for rule in rules):
                continue
            rec.discovery_query = query
            out.append(Candidate(source_name=SOURCE_OVERTURE, query=query, category="",
                                 url=rec.website, name=rec.provider_name, prefilled=rec))
        log.info("Overture: %d places in area, %d closed/low confidence, %d match a category",
                 len(rows), skipped, len(out))
        return out
