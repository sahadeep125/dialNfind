"""OpenStreetMap via the Overpass API.

Data (c) OpenStreetMap contributors, available under the Open Database License (ODbL).
Exports that contain OSM-derived records must keep this attribution; the JSON export
metadata and README carry it. Queries are cached and spaced out per the Overpass
fair-use policy.
"""

from __future__ import annotations

import hashlib
import math
import re
from typing import Any

from ..crawler import FetchError
from ..geocoding import NOMINATIM_URL
from ..extraction import find_locality, mentions_any, truncate_words
from ..logging_setup import get_logger
from ..models import SOURCE_OSM, Candidate, Evidence, Location, RawRecord
from ..normalization import clean_phone, clean_text, is_blocked, normalize_email, normalize_pincode, normalize_url
from .base import DiscoverySource

log = get_logger("source.osm")

OSM_ATTRIBUTION = "© OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright)"
CATEGORY_TAG_KEYS = ("shop", "craft", "amenity", "office", "service", "trade", "repair")


def _ql_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


BBox = tuple[float, float, float, float]  # south, west, north, east
KM_PER_DEG_LAT = 111.0


def pad_bbox(bbox: BBox, km: float) -> BBox:
    south, west, north, east = bbox
    dlat = km / KM_PER_DEG_LAT
    dlon = km / (KM_PER_DEG_LAT * max(0.1, math.cos(math.radians((south + north) / 2))))
    return (round(south - dlat, 5), round(west - dlon, 5), round(north + dlat, 5), round(east + dlon, 5))


def build_overpass_query(
    bbox: BBox,
    tags: list[str],
    name_regexes: list[str] | None = None,
    timeout: int = 90,
) -> str:
    """One small query for all categories inside a bounding box.

    Tags are grouped per key into a single regex (``craft ~ ^(hvac|plumber)$``) and all
    name patterns into one case-insensitive regex, so the query has a handful of
    statements instead of one per tag -- cheap for public Overpass servers."""
    by_key: dict[str, list[str]] = {}
    bare_keys: list[str] = []
    for tag in dict.fromkeys(tags):
        key, sep, value = (part.strip() for part in tag.partition("="))
        if sep and value:
            by_key.setdefault(key, []).append(re.escape(value))
        elif key:
            bare_keys.append(key)
    body = [
        f'  nwr["{_ql_string(key)}"~"^({_ql_string("|".join(values))})$"];' for key, values in by_key.items()
    ]
    body += [f'  nwr["{_ql_string(key)}"];' for key in dict.fromkeys(bare_keys)]
    # Overpass regexes are POSIX ERE: drop Python-only word boundaries (the Python side
    # still applies the exact pattern to what comes back).
    names = [rx.replace("\\b", "") for rx in dict.fromkeys(name_regexes or []) if rx]
    if names:
        body.append(f'  nwr["name"~"{_ql_string("|".join(names))}",i];')
    south, west, north, east = bbox
    return (
        f"[out:json][timeout:{int(timeout)}][bbox:{south},{west},{north},{east}];\n"
        "(\n" + "\n".join(body) + "\n);\n"
        "out center tags;"
    )


def element_matches(element: dict[str, Any], tags: list[str], name_regex: str = "") -> bool:
    etags: dict[str, str] = element.get("tags") or {}
    for tag in tags:
        key, sep, value = tag.partition("=")
        if key in etags and (not sep or etags[key] == value):
            return True
    return bool(name_regex and re.search(name_regex, etags.get("name", ""), re.I))


def _split_multi(value: str) -> list[str]:
    return [v.strip() for v in re.split(r"[;,/]", value or "") if v.strip()]


def element_to_record(
    element: dict[str, Any],
    location: Location,
    profile: dict[str, Any],
    *,
    category: str,
    query: str,
    blocked_domains: list[str],
    description_max_chars: int = 300,
) -> RawRecord | None:
    tags: dict[str, str] = element.get("tags") or {}
    name = clean_text(tags.get("name:en") or tags.get("name"))
    if not name:
        return None
    etype, eid = element.get("type", "node"), element.get("id")
    rec = RawRecord(
        source_name=SOURCE_OSM,
        source_url=f"https://www.openstreetmap.org/{etype}/{eid}",
        provider_name=name,
        discovery_query=query,
        discovery_category=category,
        discovered_via=SOURCE_OSM,
        has_structured_data=True,
        record_key=f"osm:{etype}/{eid}",
    )
    fs = rec.field_sources
    fs["provider_name"] = "osm-tag"

    phones: list[str] = []
    for key in ("phone", "contact:phone", "mobile", "contact:mobile"):
        phones += [p for p in (clean_phone(x) for x in _split_multi(tags.get(key, ""))) if p]
    rec.phones = list(dict.fromkeys(phones))
    if rec.phones:
        fs["phone"] = "osm-tag"
    wa = tags.get("contact:whatsapp", "")
    rec.whatsapp = clean_phone(_split_multi(wa)[0]) if wa else ""
    rec.emails = [e for e in (normalize_email(x) for k in ("email", "contact:email") for x in _split_multi(tags.get(k, ""))) if e]

    for key in ("website", "contact:website", "url"):
        url = normalize_url(tags.get(key, ""))
        if url and not is_blocked(url, blocked_domains):
            rec.website = url
            fs["website"] = "osm-tag"
            break

    street = " ".join(p for p in (tags.get("addr:housenumber", ""), tags.get("addr:street", "")) if p)
    locality_tag = tags.get("addr:suburb") or tags.get("addr:neighbourhood") or tags.get("addr:quarter") or ""
    parts = [tags.get("addr:full", ""), street, tags.get("addr:place", ""), locality_tag,
             tags.get("addr:city", ""), tags.get("addr:postcode", "")]
    rec.address = ", ".join(dict.fromkeys(clean_text(p) for p in parts if clean_text(p)))
    if rec.address:
        fs["address"] = "osm-tag"
    rec.pincode = normalize_pincode(tags.get("addr:postcode", ""))
    rec.locality = clean_text(locality_tag) or find_locality(rec.address, profile.get("localities", []))
    city_terms = [location.city, *profile.get("aliases", [])]
    if tags.get("addr:city"):
        city_tag = clean_text(tags["addr:city"])
        rec.city = location.city if mentions_any(city_tag, city_terms) else city_tag
    else:
        rec.city = location.city
        fs["city"] = "derived:osm_bbox"
    if tags.get("addr:state"):
        rec.state = clean_text(tags["addr:state"])
    elif rec.city == location.city:
        rec.state = location.state
        fs["state"] = "derived:osm_bbox"
    country = clean_text(tags.get("addr:country", ""))
    rec.country = "India" if country.upper() in ("IN", "IND", "INDIA") else country
    if not rec.country and rec.city == location.city:
        rec.country = location.country
        fs["country"] = "derived:osm_bbox"

    lat = element.get("lat", (element.get("center") or {}).get("lat"))
    lon = element.get("lon", (element.get("center") or {}).get("lon"))
    if lat is not None and lon is not None:
        rec.latitude, rec.longitude = float(lat), float(lon)
        fs["latitude"] = "osm-geometry"
    rec.opening_hours = clean_text(tags.get("opening_hours", ""))
    if tags.get("description"):
        rec.description = truncate_words(tags["description"], description_max_chars)

    osm_tags = [f"{k}={v}" for k, v in tags.items() if k in CATEGORY_TAG_KEYS]
    osm_tags += [f"{k}={v}" for k, v in tags.items() if k.startswith(("service:", "repair:")) and v == "yes"]
    rec.structured_types = [f"osm:{t}" for t in osm_tags[:3]]
    descriptive = [tags.get("description", "")] + [
        k.split(":", 1)[1].replace("_", " ") for k, v in tags.items() if k.startswith(("service:", "repair:")) and v == "yes"
    ]
    rec.evidence = Evidence(structured=" | ".join(d for d in descriptive if d), osm_tags=osm_tags)
    return rec


def resolve_bbox(ctx: Any, location: Location) -> BBox:
    """Search area shared by the map sources: config ``osm.bbox`` or one cached Nominatim
    lookup of the city, padded by ``osm.bbox_padding_km``."""
    cfg = ctx.settings.osm
    if cfg.bbox:
        if len(cfg.bbox) != 4:
            raise RuntimeError("osm.bbox must be [south, west, north, east]")
        return tuple(float(v) for v in cfg.bbox)  # type: ignore[return-value]
    query = ", ".join(p for p in (location.city, location.state, location.country) if p)
    key = f"osm-bbox:{query.lower()}"
    cached = ctx.state.cache_get(key, 30 * 24 * 3600)
    if cached is None:
        try:
            hits = ctx.crawler.fetch_json(
                "GET", NOMINATIM_URL,
                params={"q": query, "format": "jsonv2", "limit": 1},
                min_delay=1.1,  # Nominatim policy: max 1 request/second
            )
        except FetchError as exc:
            raise RuntimeError(
                f"could not look up the area of {query!r} ({exc}); set osm.bbox in config.yaml"
            ) from exc
        if not hits:
            raise RuntimeError(f"Nominatim found no place {query!r}; set osm.bbox in config.yaml")
        s_, n_, w_, e_ = (float(v) for v in hits[0]["boundingbox"])
        cached = [s_, w_, n_, e_]
        ctx.state.cache_put(key, cached)
    bbox = pad_bbox(tuple(cached), cfg.bbox_padding_km)  # type: ignore[arg-type]
    log.info("Search area for %s: %s", location.city, ",".join(map(str, bbox)))
    return bbox


class OSMSource(DiscoverySource):
    """Fetches all configured categories with ONE Overpass query per run (cached),
    then assigns elements to categories by their tags."""

    name = "osm"
    config_key = "osm"
    query_mode = "category"

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._elements: list[dict[str, Any]] | None = None
        self._error = ""

    def _all_elements(self, location: Location) -> list[dict[str, Any]]:
        if self._elements is not None:
            return self._elements
        if self._error:
            raise RuntimeError(self._error)  # don't hammer Overpass once it has failed this run
        cfg = self.ctx.settings.osm
        rules = list(self.ctx.rules.values())
        bbox = self._bbox(location)
        ql = build_overpass_query(
            bbox,
            [t for r in rules for t in (*r.osm_tags, *r.osm_weak_tags)],
            [r.osm_name_regex for r in rules if r.osm_name_regex],
            cfg.timeout,
        )
        cache_key = "overpass:" + hashlib.sha1(ql.encode()).hexdigest()
        data = self.ctx.state.cache_get(cache_key, cfg.cache_hours * 3600)
        errors = []
        for endpoint in cfg.endpoints if data is None else []:
            try:
                data = self.ctx.crawler.fetch_json(
                    "POST", endpoint, data={"data": ql}, min_delay=cfg.request_delay, timeout=cfg.timeout + 30,
                    retries=0,  # fall through to the next endpoint instead of re-running a heavy query
                )
            except FetchError as exc:  # includes "server too busy" HTML answers
                errors.append(f"{endpoint}: {exc}")
                log.warning("Overpass endpoint failed (%s); trying next if configured", exc)
                continue
            if not isinstance(data, dict) or ("remark" in data and not data.get("elements")):
                remark = data.get("remark", "unexpected response") if isinstance(data, dict) else "unexpected response"
                errors.append(f"{endpoint}: {remark[:200]}")  # server-side timeout/overload
                log.warning("Overpass endpoint %s: %s; trying next if configured", endpoint, remark[:120])
                data = None
                continue
            self.ctx.state.cache_put(cache_key, data)
            break
        if data is None:
            self._error = "Overpass query failed on all endpoints: " + " | ".join(errors)
            raise RuntimeError(self._error)
        self._elements = list(data.get("elements", []))
        log.info("Overpass returned %d elements for %s", len(self._elements), location.city)
        return self._elements

    def _bbox(self, location: Location) -> BBox:
        return resolve_bbox(self.ctx, location)

    def discover(self, query: str, location: Location, category: str) -> list[Candidate]:
        rule = self.ctx.rules.get(category)
        if rule is None or not (rule.osm_tags or rule.osm_weak_tags or rule.osm_name_regex):
            log.debug("No OSM tags configured for %r; skipping OSM for this category", category)
            return []
        profile = self.ctx.settings.location_profile()
        out: list[Candidate] = []
        seen: set[str] = set()
        for element in self._all_elements(location):
            if not element_matches(element, [*rule.osm_tags, *rule.osm_weak_tags], rule.osm_name_regex):
                continue
            rec = element_to_record(
                element, location, profile, category=category, query=query,
                blocked_domains=self.ctx.settings.blocked_domains,
                description_max_chars=self.ctx.settings.extraction.description_max_chars,
            )
            if rec is None or rec.record_key in seen:
                continue
            seen.add(rec.record_key)
            out.append(Candidate(source_name=SOURCE_OSM, query=query, category=category,
                                 url=rec.website, name=rec.provider_name, prefilled=rec))
        return out
