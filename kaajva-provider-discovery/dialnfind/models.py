"""Core data models.

Everything is a plain dataclass so records serialize cleanly to SQLite/JSON.
Empty values are always ``""`` (or ``None`` for coordinates) -- never placeholders.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, fields
from datetime import UTC, datetime
from typing import Any

# Record-level source types (who produced the data in a RawRecord).
SOURCE_WEBSITE = "website"
SOURCE_OSM = "osm"
SOURCE_OVERTURE = "overture"
SOURCE_FOURSQUARE = "fsq"
SOURCE_DIRECTORY = "directory"
SOURCE_SEARCH_API = "search_api"
SOURCE_MANUAL = "manual"

CLAIM_STATUS_UNCLAIMED = "unclaimed"
VERIFICATION_NONE = "none"
DISCOVERED = "discovered"


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


@dataclass(frozen=True)
class Location:
    city: str
    state: str = ""
    country: str = "India"

    def label(self) -> str:
        return ", ".join(p for p in (self.city, self.state, self.country) if p)


@dataclass
class Evidence:
    """Text used for classification/scoring. Kept internally, never exported verbatim."""

    structured: str = ""  # JSON-LD serviceType/description/offers, OSM descriptive tags
    meta: str = ""  # title, meta description, headings
    body: str = ""  # visible page text (truncated)
    osm_tags: list[str] = field(default_factory=list)  # "craft=electrician"

    def merged_with(self, other: Evidence) -> Evidence:
        return Evidence(
            structured=_join_text(self.structured, other.structured),
            meta=_join_text(self.meta, other.meta),
            body=_join_text(self.body, other.body, limit=40_000),
            osm_tags=sorted(set(self.osm_tags) | set(other.osm_tags)),
        )


def _join_text(a: str, b: str, limit: int = 20_000) -> str:
    if not a:
        return b[:limit]
    if not b or b in a:
        return a[:limit]
    return f"{a}\n{b}"[:limit]


@dataclass
class RawRecord:
    """One business as seen by one source (a crawled website, an OSM element, ...)."""

    source_name: str  # SOURCE_* constant
    source_url: str
    provider_name: str = ""
    phones: list[str] = field(default_factory=list)  # E.164, validated
    whatsapp: str = ""
    emails: list[str] = field(default_factory=list)
    website: str = ""
    address: str = ""
    locality: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    country: str = ""
    latitude: float | None = None
    longitude: float | None = None
    description: str = ""
    opening_hours: str = ""
    has_structured_data: bool = False
    structured_types: list[str] = field(default_factory=list)
    discovery_query: str = ""
    discovery_category: str = ""
    discovered_via: str = ""  # source that produced the candidate (manual, osm, search_api...)
    field_sources: dict[str, str] = field(default_factory=dict)  # field -> how it was obtained
    evidence: Evidence = field(default_factory=Evidence)
    scraped_at: str = field(default_factory=utc_now)
    record_key: str = ""  # stable id within the state DB

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RawRecord:
        known = {f.name for f in fields(cls)}
        payload = {k: v for k, v in data.items() if k in known}
        ev = payload.get("evidence") or {}
        payload["evidence"] = Evidence(**ev) if isinstance(ev, dict) else ev
        return cls(**payload)


@dataclass
class Candidate:
    """Something a discovery source found: a URL to crawl and/or a prefilled record."""

    source_name: str
    query: str
    category: str
    url: str = ""
    name: str = ""
    prefilled: RawRecord | None = None

    def key(self) -> str:
        if self.prefilled is not None and self.prefilled.record_key:
            return self.prefilled.record_key
        return f"url:{self.url}"

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["prefilled"] = self.prefilled.to_dict() if self.prefilled else None
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Candidate:
        pre = data.get("prefilled")
        return cls(
            source_name=data["source_name"],
            query=data.get("query", ""),
            category=data.get("category", ""),
            url=data.get("url", ""),
            name=data.get("name", ""),
            prefilled=RawRecord.from_dict(pre) if pre else None,
        )


@dataclass
class Provider:
    """A merged, classified, scored provider -- one output row."""

    provider_id: str = ""
    provider_name: str = ""
    normalized_name: str = ""
    primary_category: str = ""
    secondary_categories: list[str] = field(default_factory=list)
    phone: str = ""
    additional_phones: list[str] = field(default_factory=list)
    whatsapp: str = ""
    email: str = ""
    additional_emails: list[str] = field(default_factory=list)
    website: str = ""
    address: str = ""
    locality: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    country: str = ""
    latitude: float | None = None
    longitude: float | None = None
    description: str = ""
    opening_hours: str = ""
    hours_structured: list[dict[str, str]] = field(default_factory=list)
    source_url: str = ""
    source_domain: str = ""
    source_type: str = DISCOVERED
    source_urls: list[str] = field(default_factory=list)
    source_domains: list[str] = field(default_factory=list)
    source_types: list[str] = field(default_factory=list)
    source_confidence: str = "low"
    discovery_query: str = ""
    is_claimed: bool = False
    claim_status: str = CLAIM_STATUS_UNCLAIMED
    verification_status: str = VERIFICATION_NONE
    data_quality_score: int = 0
    relevance_score: int = 0
    duplicate_candidate: bool = False
    duplicate_group_id: str = ""
    merged_record_count: int = 1
    has_structured_data: bool = False
    classification_method: str = "rules"
    # How the primary category is known: "evidence" (dataset category, page text, OSM tag),
    # "name" (a full service phrase in the business name) or "weak" (shop type or name pattern only).
    category_evidence: str = ""
    field_sources: dict[str, str] = field(default_factory=dict)
    score_breakdown: dict[str, dict[str, int]] = field(default_factory=dict)
    review_reasons: list[str] = field(default_factory=list)
    scraped_at: str = ""
    # internal only
    evidence: Evidence = field(default_factory=Evidence)
    record_keys: list[str] = field(default_factory=list)

    def to_dict(self, *, include_internal: bool = False) -> dict[str, Any]:
        data = asdict(self)
        if not include_internal:
            data.pop("evidence", None)
            data.pop("record_keys", None)
        return data
