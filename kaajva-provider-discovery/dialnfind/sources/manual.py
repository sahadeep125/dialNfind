"""User-supplied list of business websites (--input-urls)."""

from __future__ import annotations

from pathlib import Path

from ..logging_setup import get_logger
from ..models import SOURCE_MANUAL, Candidate, Location
from ..normalization import normalize_url
from .base import DiscoverySource

log = get_logger("source.manual")


def read_url_file(path: str | Path) -> list[tuple[str, str]]:
    """Lines of ``url`` or ``url, Category``; ``#`` starts a comment."""
    entries: list[tuple[str, str]] = []
    with open(path, encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            url_part, _, category = line.partition(",")
            url = normalize_url(url_part.strip())
            if not url:
                log.warning("%s:%d: not a valid URL: %r", path, lineno, url_part.strip())
                continue
            entries.append((url, category.strip()))
    return entries


class ManualSource(DiscoverySource):
    name = "manual"
    config_key = "manual_urls"
    query_mode = "once"

    def available(self) -> tuple[bool, str]:
        path = self.ctx.settings.input_urls
        if not path:
            return False, "no --input-urls file given"
        if not Path(path).exists():
            return False, f"URL file not found: {path}"
        return True, ""

    def discover(self, query: str, location: Location, category: str) -> list[Candidate]:
        return [
            Candidate(source_name=SOURCE_MANUAL, query=f"manual:{Path(self.ctx.settings.input_urls).name}",
                      category=cat, url=url)
            for url, cat in read_url_file(self.ctx.settings.input_urls)
        ]
