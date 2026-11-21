"""Deterministic + fuzzy deduplication and multi-source merging.

Signals, strongest first:

* same normalized phone                          -> merge
* same website (registrable domain / shared-host path) -> merge
* fuzzy name >= merge threshold AND location agreement
  (same PIN, same locality, similar address, or coordinates < 150 m)
  AND no conflicting phones                        -> merge
* fuzzy name >= candidate threshold otherwise      -> NOT merged; both rows flagged
  ``duplicate_candidate`` with a shared ``duplicate_group_id`` for manual review.
"""

from __future__ import annotations

import hashlib
import math
from collections import defaultdict
from dataclasses import dataclass, field

from rapidfuzz import fuzz

from .config import DedupSettings
from .logging_setup import event, get_logger
from .models import SOURCE_WEBSITE, Evidence, Provider, RawRecord
from .normalization import (
    core_name,
    host_of,
    normalize_name,
    parse_opening_hours,
    rank_emails,
    site_key,
    squash,
)

log = get_logger("dedup")

SAME_PLACE_METERS = 150.0


class UnionFind:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> bool:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if rb < ra:
            ra, rb = rb, ra
        self.parent[rb] = ra  # lowest index wins -> deterministic
        return True


@dataclass
class _Keys:
    core: str
    squashed: str
    phones: frozenset[str]
    site: str
    pincode: str
    locality: str
    address: str
    lat: float | None
    lon: float | None
    source: str


@dataclass
class DedupResult:
    providers: list[Provider]
    merged_away: int = 0
    candidate_pairs: list[tuple[int, int, float]] = field(default_factory=list)


def name_similarity(a: str, b: str) -> float:
    """Similarity of two *core* names (see normalization.core_name), 0-100."""
    if not a or not b:
        return 0.0
    sa, sb = squash(a), squash(b)
    if min(len(sa), len(sb)) < 4:
        return 100.0 if sa == sb else 0.0
    return max(fuzz.token_sort_ratio(a, b), fuzz.ratio(sa, sb))


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _keys(rec: RawRecord, settings: DedupSettings, city_stopwords: set[str]) -> _Keys:
    core = core_name(rec.provider_name, city_stopwords)
    return _Keys(
        core=core,
        squashed=squash(core),
        phones=frozenset(rec.phones),
        site=site_key(rec.website, settings.shared_hosting_domains) if rec.website else "",
        pincode=rec.pincode,
        locality=rec.locality.lower(),
        address=normalize_name(rec.address),
        lat=rec.latitude,
        lon=rec.longitude,
        source=rec.source_name,
    )


def _location_agrees(a: _Keys, b: _Keys, settings: DedupSettings) -> bool:
    if a.pincode and a.pincode == b.pincode:
        return True
    if a.locality and a.locality == b.locality:
        return True
    if a.address and b.address and fuzz.token_set_ratio(a.address, b.address) >= settings.address_match_threshold:
        return True
    if None not in (a.lat, a.lon, b.lat, b.lon):
        return haversine_m(a.lat, a.lon, b.lat, b.lon) <= SAME_PLACE_METERS  # type: ignore[arg-type]
    return False


def _phones_conflict(a: _Keys, b: _Keys) -> bool:
    return bool(a.phones and b.phones and not (a.phones & b.phones))


def _candidate_pairs(keys: list[_Keys]) -> set[tuple[int, int]]:
    """Blocking: only compare names sharing a 3-char prefix or a distinctive token."""
    buckets: defaultdict[str, list[int]] = defaultdict(list)
    for i, k in enumerate(keys):
        if not k.squashed:
            continue
        buckets["p:" + k.squashed[:3]].append(i)
        for token in k.core.split():
            if len(token) >= 4:
                buckets["t:" + token].append(i)
    pairs: set[tuple[int, int]] = set()
    for members in buckets.values():
        if len(members) > 500:  # pathological bucket, skip
            continue
        for x in range(len(members)):
            for y in range(x + 1, len(members)):
                pairs.add((members[x], members[y]))
    return pairs


def deduplicate(
    records: list[RawRecord],
    settings: DedupSettings,
    source_priority: list[str],
    city_stopwords: set[str] | None = None,
) -> DedupResult:
    stop = {w.lower() for w in (city_stopwords or set())}
    keys = [_keys(r, settings, stop) for r in records]
    uf = UnionFind(len(records))

    def merge(i: int, j: int, reason: str) -> None:
        if uf.union(i, j):
            event(
                log, "DUPLICATE", "%r matched %r (%s)", records[j].provider_name, records[i].provider_name, reason
            )

    # 1. strong: phone
    by_phone: dict[str, int] = {}
    for i, k in enumerate(keys):
        for phone in sorted(k.phones):
            if phone in by_phone:
                merge(by_phone[phone], i, f"same phone {phone}")
            else:
                by_phone[phone] = i

    # 2. strong: website identity (unless two same-source records publish different phones,
    #    e.g. two OSM dealers pointing at one brand website)
    by_site: dict[str, list[int]] = defaultdict(list)
    for i, k in enumerate(keys):
        if k.site:
            by_site[k.site].append(i)
    for site, members in by_site.items():
        first = members[0]
        for i in members[1:]:
            a, b = keys[first], keys[i]
            if a.source == b.source and a.source != SOURCE_WEBSITE and _phones_conflict(a, b):
                continue
            merge(first, i, f"same website {site}")

    # 3. fuzzy name + location
    candidates: list[tuple[int, int, float]] = []
    for i, j in sorted(_candidate_pairs(keys)):
        if uf.find(i) == uf.find(j):
            continue
        sim = name_similarity(keys[i].core, keys[j].core)
        if sim < settings.name_candidate_threshold:
            continue
        if (
            sim >= settings.name_merge_threshold
            and _location_agrees(keys[i], keys[j], settings)
            and not _phones_conflict(keys[i], keys[j])
        ):
            merge(i, j, f"name {sim:.0f}% + same location")
        else:
            candidates.append((i, j, sim))

    groups: dict[int, list[int]] = defaultdict(list)
    for i in range(len(records)):
        groups[uf.find(i)].append(i)
    ordered_roots = sorted(groups)
    providers = [merge_records([records[i] for i in groups[root]], source_priority) for root in ordered_roots]
    root_to_provider = {root: idx for idx, root in enumerate(ordered_roots)}

    # possible duplicates across providers: flag, don't merge
    flag_uf = UnionFind(len(providers))
    flagged_pairs: list[tuple[int, int, float]] = []
    for i, j, sim in candidates:
        pi, pj = sorted((root_to_provider[uf.find(i)], root_to_provider[uf.find(j)]))
        if pi != pj and not any(a == pi and b == pj for a, b, _ in flagged_pairs):
            flag_uf.union(pi, pj)
            flagged_pairs.append((pi, pj, sim))
            event(
                log, "DUPLICATE", "possible duplicate (not merged): %r ~ %r (%.0f%%)",
                providers[pi].provider_name, providers[pj].provider_name, sim, level=20,
            )
    flagged = {p for pair in flagged_pairs for p in pair[:2]}
    for idx in flagged:
        root = flag_uf.find(idx)
        providers[idx].duplicate_candidate = True
        providers[idx].duplicate_group_id = "dup_" + hashlib.sha1(
            providers[root].record_keys[0].encode()
        ).hexdigest()[:10]
    return DedupResult(providers=providers, merged_away=len(records) - len(providers), candidate_pairs=flagged_pairs)


def _richness(rec: RawRecord) -> int:
    return sum(
        bool(v)
        for v in (rec.provider_name, rec.phones, rec.emails, rec.website, rec.address, rec.pincode,
                  rec.opening_hours, rec.latitude, rec.has_structured_data)
    )


def merge_records(records: list[RawRecord], source_priority: list[str]) -> Provider:
    """Merge one duplicate group. Higher-priority sources win each field; empty
    values never overwrite filled ones; list fields are unioned."""
    rank = {name: i for i, name in enumerate(source_priority)}
    ordered = sorted(records, key=lambda r: (rank.get(r.source_name, len(rank)), -_richness(r), r.record_key))
    p = Provider()
    p.record_keys = [r.record_key for r in ordered]
    p.merged_record_count = len(ordered)

    def first(attr: str) -> tuple[str, RawRecord | None]:
        for r in ordered:
            value = getattr(r, attr)
            if value:
                return value, r
        return "", None

    for attr in ("provider_name", "whatsapp", "website", "description", "opening_hours", "discovery_query"):
        value, src = first(attr)
        setattr(p, attr, value)
        if src is not None and attr != "discovery_query":
            how = src.field_sources.get(attr, "")
            p.field_sources[attr] = f"{src.source_name}:{how}" if how else src.source_name

    # address block comes from a single record so parts stay consistent
    addr_src = next((r for r in ordered if r.address), None) or next(
        (r for r in ordered if r.city or r.pincode), None
    )
    if addr_src is not None:
        p.address, p.locality, p.city = addr_src.address, addr_src.locality, addr_src.city
        p.state, p.pincode, p.country = addr_src.state, addr_src.pincode, addr_src.country
        p.field_sources["address"] = addr_src.source_name
        for attr in ("locality", "city", "state", "pincode", "country"):
            if not getattr(p, attr):
                value, src = first(attr)
                setattr(p, attr, value)
        for attr in ("city", "state", "country"):
            if addr_src.field_sources.get(attr):
                p.field_sources[attr] = f"{addr_src.source_name}:{addr_src.field_sources[attr]}"

    geo = next((r for r in ordered if r.latitude is not None and r.longitude is not None), None)
    if geo is not None:
        p.latitude, p.longitude = geo.latitude, geo.longitude
        p.field_sources["latitude"] = f"{geo.source_name}:{geo.field_sources.get('latitude', '')}".rstrip(":")

    phones = list(dict.fromkeys(ph for r in ordered for ph in r.phones))
    if phones:
        p.phone, p.additional_phones = phones[0], phones[1:]
        src = next(r for r in ordered if phones[0] in r.phones)
        p.field_sources["phone"] = f"{src.source_name}:{src.field_sources.get('phone', '')}".rstrip(":")
    emails = rank_emails([e for r in ordered for e in r.emails], host_of(p.website) if p.website else "")
    if emails:
        p.email, p.additional_emails = emails[0], emails[1:]

    p.normalized_name = normalize_name(p.provider_name)
    p.hours_structured = parse_opening_hours(p.opening_hours)
    p.has_structured_data = any(r.has_structured_data for r in ordered)
    p.source_url = ordered[0].source_url
    p.source_domain = host_of(ordered[0].source_url)
    p.source_urls = list(dict.fromkeys(r.source_url for r in ordered if r.source_url))
    p.source_domains = list(dict.fromkeys(host_of(u) for u in p.source_urls if host_of(u)))
    p.source_types = list(dict.fromkeys(r.source_name for r in ordered))
    p.scraped_at = max(r.scraped_at for r in ordered)
    evidence = Evidence()
    for r in ordered:
        evidence = evidence.merged_with(r.evidence)
    p.evidence = evidence
    p.provider_id = provider_id(p)
    return p


def provider_id(p: Provider) -> str:
    """Stable id derived from the strongest identity signal available."""
    if p.phone:
        basis = "phone:" + p.phone
    elif p.website:
        basis = "site:" + site_key(p.website)
    else:
        basis = f"record:{p.record_keys[0] if p.record_keys else p.normalized_name}"
    return "nh_" + hashlib.sha1(basis.encode("utf-8")).hexdigest()[:12]
