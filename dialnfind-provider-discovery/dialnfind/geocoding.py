"""Optional geocoding via permitted APIs, with a persistent cache.

GEOCODING_PROVIDER=none      (default) -- no geocoding
GEOCODING_PROVIDER=nominatim -- OSM Nominatim; usage policy: <=1 req/s, identifying UA, caching, ODbL attribution
GEOCODING_PROVIDER=opencage  -- OpenCage (API key in GEOCODING_API_KEY)

Coarse results (city/suburb/postcode centroids) are discarded: they would give a
false impression of the business's exact location.
"""

from __future__ import annotations

from .config import Settings
from .crawler import Crawler, FetchError
from .logging_setup import event, get_logger
from .models import Location, Provider
from .state import StateStore

log = get_logger("geocode")

COARSE_TYPES = {
    "country", "state", "state_district", "county", "region", "district", "city", "town",
    "village", "municipality", "city_district", "suburb", "neighbourhood", "quarter", "postcode",
    "hamlet", "island", "continent",
}
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OPENCAGE_URL = "https://api.opencagedata.com/geocode/v1/json"


class Geocoder:
    def __init__(self, settings: Settings, crawler: Crawler, state: StateStore) -> None:
        self.cfg = settings.geocoding
        self.crawler = crawler
        self.state = state

    @property
    def enabled(self) -> bool:
        if not self.cfg.enabled or self.cfg.provider == "none":
            return False
        if self.cfg.provider == "opencage" and not self.cfg.api_key:
            log.warning("GEOCODING_PROVIDER=opencage but GEOCODING_API_KEY is missing; geocoding disabled")
            return False
        return self.cfg.provider in ("nominatim", "opencage")

    def geocode(self, provider: Provider, location: Location) -> bool:
        """Fill lat/lon for a provider with an address but no coordinates. Returns True if set."""
        if provider.latitude is not None or not provider.address:
            return False
        parts = [provider.address]
        for extra in (provider.city or location.city, provider.state or location.state, location.country):
            if extra and extra.lower() not in provider.address.lower():
                parts.append(extra)
        query = ", ".join(parts)
        key = f"geo:{self.cfg.provider}:{query.lower()}"
        cached = self.state.cache_get(key, self.cfg.cache_hours * 3600)
        if cached is None:
            try:
                cached = self._lookup(query)
            except FetchError as exc:
                log.warning("Geocoding failed for %r: %s", query, exc)
                return False
            self.state.cache_put(key, cached)
        if not cached:
            return False
        provider.latitude, provider.longitude = cached["lat"], cached["lon"]
        provider.field_sources["latitude"] = f"geocoded:{self.cfg.provider}:{cached.get('type', '')}"
        event(log, "GEOCODE", "%s -> %.5f,%.5f (%s)", provider.provider_name, cached["lat"], cached["lon"], cached.get("type"))
        return True

    def _lookup(self, query: str) -> dict[str, object]:
        if self.cfg.provider == "nominatim":
            data = self.crawler.fetch_json(
                "GET", NOMINATIM_URL,
                params={"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "in"},
                min_delay=max(1.0, self.cfg.request_delay),
            )
            if not data:
                return {}
            hit = data[0]
            kind = hit.get("addresstype") or hit.get("type") or ""
            if kind in COARSE_TYPES:
                return {}
            return {"lat": float(hit["lat"]), "lon": float(hit["lon"]), "type": kind}
        data = self.crawler.fetch_json(
            "GET", OPENCAGE_URL,
            params={"q": query, "key": self.cfg.api_key, "countrycode": "in", "limit": 1, "no_annotations": 1},
            min_delay=self.cfg.request_delay,
        )
        results = data.get("results") or []
        if not results:
            return {}
        hit = results[0]
        kind = (hit.get("components") or {}).get("_type", "")
        if kind in COARSE_TYPES or int(hit.get("confidence", 0)) < 7:
            return {}
        geometry = hit.get("geometry") or {}
        return {"lat": float(geometry["lat"]), "lon": float(geometry["lng"]), "type": kind}
