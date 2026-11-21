"""Business directories that explicitly permit automated access.

Disabled by default and empty by default. Each configured directory must set
``permission_confirmed: true`` after you have checked its terms and robots.txt.
Only schema.org business data published on the listing page is used; listing
pages are fetched through the normal crawler (robots.txt, delays, blocklist).
"""

from __future__ import annotations

import hashlib
import re

from ..extraction import parse_page, resolve_place, truncate_words
from ..logging_setup import get_logger
from ..models import SOURCE_DIRECTORY, Candidate, Evidence, Location, RawRecord
from ..normalization import host_of, is_blocked
from .base import DiscoverySource

log = get_logger("source.directory")


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


class DirectorySource(DiscoverySource):
    name = "directory"
    config_key = "directories"
    query_mode = "category"

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._done_seeds: set[str] = set()

    def _directories(self) -> list[dict]:
        return [d for d in self.ctx.settings.directories if isinstance(d, dict) and d.get("permission_confirmed") is True]

    def available(self) -> tuple[bool, str]:
        return (bool(self._directories()), "no directories with permission_confirmed: true in config.yaml")

    def discover(self, query: str, location: Location, category: str) -> list[Candidate]:
        out: list[Candidate] = []
        profile = self.ctx.settings.location_profile()
        for directory in self._directories():
            for seed in directory.get("seed_urls", []):
                url = seed.format(city=_slug(location.city), category=_slug(category))
                if url in self._done_seeds:
                    continue  # category-independent seed already processed this run
                self._done_seeds.add(url)
                result = self.ctx.crawler.fetch_page(url)
                if not result.ok:
                    log.info("[SKIP] directory page %s: %s", url, result.reason)
                    continue
                page = parse_page(result.text, result.final_url)
                for biz in page.businesses:
                    if not biz.name:
                        continue
                    ident = hashlib.sha1(f"{biz.name}|{','.join(biz.phones)}".encode()).hexdigest()[:12]
                    place = resolve_place(
                        address_locality=biz.address_locality, region=biz.region, country=biz.country,
                        full_address=biz.full_address, location=location, profile=profile,
                    )
                    website = biz.url if biz.url and host_of(biz.url) != host_of(url) else ""
                    if website and is_blocked(website, self.ctx.settings.blocked_domains):
                        website = ""
                    rec = RawRecord(
                        source_name=SOURCE_DIRECTORY,
                        source_url=result.final_url,
                        provider_name=biz.name,
                        phones=biz.phones,
                        emails=biz.emails,
                        website=website,
                        address=biz.full_address,
                        pincode=biz.postal_code,
                        city=place["city"], locality=place["locality"],
                        state=place["state"], country=place["country"],
                        latitude=biz.latitude, longitude=biz.longitude,
                        opening_hours=biz.opening_hours,
                        description=truncate_words(biz.description, self.ctx.settings.extraction.description_max_chars),
                        has_structured_data=True,
                        structured_types=biz.types,
                        discovery_query=query,
                        discovery_category=category,
                        discovered_via=SOURCE_DIRECTORY,
                        evidence=Evidence(structured=" | ".join(biz.services + [biz.description])),
                        record_key=f"directory:{host_of(url)}:{ident}",
                        field_sources={"provider_name": "directory:json-ld"},
                    )
                    out.append(Candidate(source_name=SOURCE_DIRECTORY, query=query, category=category,
                                         url=website, name=biz.name, prefilled=rec))
        return out
