"""Licensed web-search APIs (official JSON endpoints, user-supplied credentials).

Supported: Brave Search API, Google Programmable Search (Custom Search JSON API).
Search engine *result pages* are never fetched or parsed. Result URLs on blocked
domains (directories/social networks that forbid scraping) are dropped.
"""

from __future__ import annotations

import hashlib
from typing import Any

from ..crawler import FetchError
from ..logging_setup import get_logger
from ..models import SOURCE_SEARCH_API, Candidate, Location
from ..normalization import is_blocked, normalize_url
from .base import DiscoverySource

log = get_logger("source.search_api")

BRAVE_URL = "https://api.search.brave.com/res/v1/web/search"
GOOGLE_CSE_URL = "https://www.googleapis.com/customsearch/v1"


class SearchAPISource(DiscoverySource):
    name = "search_api"
    config_key = "licensed_search_api"
    query_mode = "query"

    def available(self) -> tuple[bool, str]:
        cfg = self.ctx.settings.search_api
        if cfg.provider == "brave":
            return (bool(cfg.brave_api_key), "BRAVE_SEARCH_API_KEY not set")
        if cfg.provider == "google_cse":
            ok = bool(cfg.google_cse_api_key and cfg.google_cse_cx)
            return (ok, "GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX not set")
        return False, f"unknown search API provider {cfg.provider!r}"

    def discover(self, query: str, location: Location, category: str) -> list[Candidate]:
        cfg = self.ctx.settings.search_api
        cache_key = "search:" + hashlib.sha1(f"{cfg.provider}|{query}|{cfg.results_per_query}".encode()).hexdigest()
        urls = self.ctx.state.cache_get(cache_key, cfg.cache_hours * 3600)
        if urls is None:
            try:
                urls = self._search(query)
            except FetchError as exc:
                raise RuntimeError(f"search API error: {exc}") from exc
            self.ctx.state.cache_put(cache_key, urls)
        out = []
        for url in urls:
            norm = normalize_url(url)
            if not norm or is_blocked(norm, self.ctx.settings.blocked_domains):
                continue
            out.append(Candidate(source_name=SOURCE_SEARCH_API, query=query, category=category, url=norm))
        return out

    def _search(self, query: str) -> list[str]:
        cfg = self.ctx.settings.search_api
        n = max(1, min(cfg.results_per_query, 20))
        if cfg.provider == "brave":
            data: dict[str, Any] = self.ctx.crawler.fetch_json(
                "GET", BRAVE_URL,
                params={"q": query, "count": n, "country": "IN", "safesearch": "moderate"},
                headers={"X-Subscription-Token": cfg.brave_api_key, "Accept": "application/json"},
                min_delay=cfg.request_delay,
            )
            return [r.get("url", "") for r in (data.get("web") or {}).get("results", [])]
        data = self.ctx.crawler.fetch_json(
            "GET", GOOGLE_CSE_URL,
            params={"key": cfg.google_cse_api_key, "cx": cfg.google_cse_cx, "q": query, "num": min(n, 10), "gl": "in"},
            min_delay=cfg.request_delay,
        )
        return [item.get("link", "") for item in data.get("items", []) or []]
