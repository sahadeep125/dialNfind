"""Configuration loading: defaults < config.yaml < environment < CLI."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from . import TOOL_NAME, __version__

log = logging.getLogger(__name__)

MIN_REQUEST_DELAY = 1.0
MAX_CONCURRENCY = 8

# CLI source names -> config.yaml `sources:` keys
SOURCE_ALIASES: dict[str, str] = {
    "osm": "osm",
    "overture": "overture",
    "fsq": "foursquare",
    "foursquare": "foursquare",
    "website": "websites",
    "websites": "websites",
    "manual": "manual_urls",
    "manual_urls": "manual_urls",
    "search_api": "licensed_search_api",
    "licensed_search_api": "licensed_search_api",
    "directory": "directories",
    "directories": "directories",
}


@dataclass
class CrawlerSettings:
    request_delay: float = 2.0
    max_pages_per_domain: int = 5
    timeout: float = 15.0
    max_retries: int = 2
    max_concurrent_domains: int = 3
    max_response_bytes: int = 3_000_000
    max_redirects: int = 5
    max_attempts_per_url: int = 3
    robots_cache_hours: float = 24.0
    max_crawl_delay: float = 120.0


@dataclass
class ScoringSettings:
    minimum_relevance: int = 50
    minimum_quality: int = 40
    reject_below_relevance: int = 20


@dataclass
class SourceToggles:
    osm: bool = True
    overture: bool = True
    foursquare: bool = False
    websites: bool = True
    manual_urls: bool = True
    licensed_search_api: bool = False
    directories: bool = False


@dataclass
class OSMSettings:
    endpoints: list[str] = field(
        default_factory=lambda: [
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.private.coffee/api/interpreter",
        ]
    )
    request_delay: float = 5.0
    timeout: int = 90
    bbox: list[float] = field(default_factory=list)  # [south, west, north, east]; empty = look up city
    bbox_padding_km: float = 2.0
    cache_hours: float = 168.0


@dataclass
class OvertureSettings:
    """Overture Maps places (open data, CDLA-Permissive-2.0 / Apache-2.0), read with DuckDB.
    The search area is the same bounding box the OSM source uses."""

    release: str = "2026-09-23.1"
    base_url: str = "s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*"
    s3_region: str = "us-west-2"
    min_confidence: float = 0.3  # many real local shops score 0.3-0.5; the classifier still filters
    cache_hours: float = 720.0  # the downloaded extract is kept as a parquet file in output_dir


@dataclass
class FoursquareSettings:
    """Foursquare OS Places (Apache-2.0). Needs an access token (FSQ_TOKEN in .env) for the
    Hugging Face dataset; the source is skipped without one."""

    release_date: str = ""  # e.g. "2025-09-09"; picks the dt=... release folder
    base_url: str = "hf://datasets/foursquare/fsq-os-places/release/dt={release_date}/places/parquet/*.parquet"
    token: str = ""
    max_age_days: int = 730  # drop places not refreshed for this long
    cache_hours: float = 720.0


@dataclass
class SearchAPISettings:
    provider: str = "brave"
    results_per_query: int = 10
    request_delay: float = 1.5
    cache_hours: float = 168.0
    max_queries_per_category: int = 3
    brave_api_key: str = ""
    google_cse_api_key: str = ""
    google_cse_cx: str = ""


@dataclass
class GeocodingSettings:
    enabled: bool = False
    provider: str = "none"
    request_delay: float = 1.1
    cache_hours: float = 720.0
    api_key: str = ""


@dataclass
class ExtractionSettings:
    include_description: bool = True
    description_max_chars: int = 300


@dataclass
class DedupSettings:
    name_merge_threshold: int = 92
    name_candidate_threshold: int = 85
    address_match_threshold: int = 85
    shared_hosting_domains: list[str] = field(default_factory=list)


@dataclass
class AISettings:
    enabled: bool = False
    api_key: str = ""
    model: str = "claude-haiku-4-5"


@dataclass
class Settings:
    city: str = "Siliguri"
    state: str = "West Bengal"
    country: str = "India"
    contact_email: str = ""
    output_dir: str = "output"
    state_db: str = "output/discovery.db"
    output: str = ""
    categories_file: str = "categories.txt"
    input_urls: str = ""
    max_results: int = 500
    min_score: int | None = None
    resume: bool = False
    dry_run: bool = False
    crawler: CrawlerSettings = field(default_factory=CrawlerSettings)
    scoring: ScoringSettings = field(default_factory=ScoringSettings)
    sources: SourceToggles = field(default_factory=SourceToggles)
    osm: OSMSettings = field(default_factory=OSMSettings)
    overture: OvertureSettings = field(default_factory=OvertureSettings)
    foursquare: FoursquareSettings = field(default_factory=FoursquareSettings)
    search_api: SearchAPISettings = field(default_factory=SearchAPISettings)
    geocoding: GeocodingSettings = field(default_factory=GeocodingSettings)
    extraction: ExtractionSettings = field(default_factory=ExtractionSettings)
    dedup: DedupSettings = field(default_factory=DedupSettings)
    ai: AISettings = field(default_factory=AISettings)
    source_priority: list[str] = field(
        default_factory=lambda: ["website", "overture", "fsq", "osm", "directory", "search_api", "manual"]
    )
    # categories.json shared with the dialnfind server; every rule must map onto it.
    dialnfind_categories: str = "../server/prisma/data/categories.json"
    # --export-dialnfind: the bundle the server imports on deploy.
    bundle_output: str = ""
    blocked_domains: list[str] = field(default_factory=list)
    directories: list[dict[str, Any]] = field(default_factory=list)
    locations: dict[str, dict[str, Any]] = field(default_factory=dict)
    category_rules: dict[str, dict[str, Any]] = field(default_factory=dict)

    @property
    def user_agent(self) -> str:
        contact = self.contact_email or "not-configured"
        return f"{TOOL_NAME}/{__version__.rsplit('.', 1)[0]} (+contact: {contact})"

    @property
    def min_relevance(self) -> int:
        return self.min_score if self.min_score is not None else self.scoring.minimum_relevance

    def output_path(self) -> Path:
        if self.output:
            return Path(self.output)
        slug = self.city.strip().lower().replace(" ", "_") or "providers"
        return Path(self.output_dir) / f"{slug}_providers.csv"

    def location_profile(self) -> dict[str, Any]:
        """Per-city aliases/localities from config (case-insensitive lookup)."""
        for name, profile in self.locations.items():
            if name.strip().lower() == self.city.strip().lower():
                return profile or {}
        return {}

    def enabled_sources(self) -> list[str]:
        return [name for name, value in vars(self.sources).items() if value]


def _apply_section(target: Any, data: dict[str, Any] | None) -> None:
    if not data:
        return
    for key, value in data.items():
        if hasattr(target, key):
            setattr(target, key, value)
        else:
            log.warning("Unknown config key ignored: %s.%s", type(target).__name__, key)


def load_settings(config_path: str | Path | None) -> Settings:
    settings = Settings()
    if config_path and Path(config_path).exists():
        with open(config_path, encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
        sections = {
            "crawler": settings.crawler,
            "scoring": settings.scoring,
            "sources": settings.sources,
            "osm": settings.osm,
            "overture": settings.overture,
            "foursquare": settings.foursquare,
            "search_api": settings.search_api,
            "geocoding": settings.geocoding,
            "extraction": settings.extraction,
            "dedup": settings.dedup,
        }
        for key, value in data.items():
            if key in sections:
                _apply_section(sections[key], value)
            elif hasattr(settings, key):
                setattr(settings, key, value if value is not None else getattr(settings, key))
            else:
                log.warning("Unknown config key ignored: %s", key)
    elif config_path:
        log.warning("Config file %s not found; using defaults", config_path)
    _apply_env(settings)
    return settings


def _env(name: str) -> str:
    return os.environ.get(name, "").strip()


def _apply_env(s: Settings) -> None:
    if v := _env("CONTACT_EMAIL"):
        s.contact_email = v
    if v := _env("REQUEST_DELAY"):
        s.crawler.request_delay = float(v)
    if v := _env("MAX_CONCURRENT_DOMAINS"):
        s.crawler.max_concurrent_domains = int(v)
    if v := _env("MAX_PAGES_PER_DOMAIN"):
        s.crawler.max_pages_per_domain = int(v)
    if v := _env("GEOCODING_PROVIDER"):
        s.geocoding.provider = v.lower()
        s.geocoding.enabled = v.lower() != "none"
    s.geocoding.api_key = _env("GEOCODING_API_KEY") or s.geocoding.api_key
    if v := _env("SEARCH_API_PROVIDER"):
        s.search_api.provider = v.lower()
    s.search_api.brave_api_key = _env("BRAVE_SEARCH_API_KEY")
    s.search_api.google_cse_api_key = _env("GOOGLE_CSE_API_KEY")
    s.search_api.google_cse_cx = _env("GOOGLE_CSE_CX")
    s.foursquare.token = _env("FSQ_TOKEN") or _env("HF_TOKEN") or s.foursquare.token
    if v := _env("FSQ_RELEASE_DATE"):
        s.foursquare.release_date = v
    s.ai.api_key = _env("ANTHROPIC_API_KEY")
    if v := _env("ANTHROPIC_MODEL"):
        s.ai.model = v


def apply_source_selection(settings: Settings, csv: str) -> None:
    """--sources osm,website -> enable exactly those."""
    wanted = {part.strip().lower() for part in csv.split(",") if part.strip()}
    unknown = wanted - SOURCE_ALIASES.keys()
    if unknown:
        raise ValueError(
            f"Unknown source(s): {', '.join(sorted(unknown))}. "
            f"Valid: osm, overture, fsq, website, manual, search_api, directory"
        )
    enabled = {SOURCE_ALIASES[w] for w in wanted}
    for key in vars(settings.sources):
        setattr(settings.sources, key, key in enabled)


def enforce_limits(settings: Settings) -> None:
    c = settings.crawler
    if c.request_delay < MIN_REQUEST_DELAY:
        log.warning("request_delay %.2fs is too aggressive; using %.1fs", c.request_delay, MIN_REQUEST_DELAY)
        c.request_delay = MIN_REQUEST_DELAY
    if c.max_concurrent_domains > MAX_CONCURRENCY:
        log.warning("concurrency %d capped at %d", c.max_concurrent_domains, MAX_CONCURRENCY)
        c.max_concurrent_domains = MAX_CONCURRENCY
    c.max_concurrent_domains = max(1, c.max_concurrent_domains)
    c.max_pages_per_domain = max(1, min(c.max_pages_per_domain, 20))
    c.max_retries = max(0, min(c.max_retries, 5))
    if settings.geocoding.provider == "none":
        settings.geocoding.enabled = False


def load_categories(path: str | Path) -> list[str]:
    categories: list[str] = []
    seen: set[str] = set()
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            name = line.split("#", 1)[0].strip()
            if name and name.lower() not in seen:
                seen.add(name.lower())
                categories.append(name)
    if not categories:
        raise ValueError(f"No categories found in {path}")
    return categories
