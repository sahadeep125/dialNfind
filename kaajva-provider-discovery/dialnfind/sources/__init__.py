"""Discovery source registry. Add a new source by subclassing DiscoverySource and
registering it here; enable/disable it under `sources:` in config.yaml."""

from __future__ import annotations

from .base import DiscoverySource, SourceContext
from .directory import DirectorySource
from .foursquare import FoursquareSource
from .manual import ManualSource
from .osm import OSMSource
from .overture import OvertureSource
from .search_api import SearchAPISource
from .website import WebsiteSource

DISCOVERY_SOURCES: list[type[DiscoverySource]] = [
    ManualSource, OvertureSource, FoursquareSource, OSMSource, DirectorySource, SearchAPISource,
]


def build_sources(ctx: SourceContext) -> list[DiscoverySource]:
    toggles = ctx.settings.sources
    return [cls(ctx) for cls in DISCOVERY_SOURCES if getattr(toggles, cls.config_key, False)]


__all__ = [
    "DISCOVERY_SOURCES",
    "DiscoverySource",
    "DirectorySource",
    "FoursquareSource",
    "ManualSource",
    "OSMSource",
    "OvertureSource",
    "SearchAPISource",
    "SourceContext",
    "WebsiteSource",
    "build_sources",
]
