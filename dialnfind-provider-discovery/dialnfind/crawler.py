"""Polite HTTP client.

Every network request in the tool goes through :class:`Crawler`, which enforces:

* the blocked-domain list (checked again after every redirect hop),
* robots.txt (page fetches) and its Crawl-delay,
* per-domain rate limiting,
* bounded retries with exponential backoff for temporary errors only,
* an honest, descriptive User-Agent.

When a site answers with a bot challenge / CAPTCHA / access denial the domain is
skipped for the rest of the run. Nothing here attempts to get around such protection.
"""

from __future__ import annotations

import json
import re
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urljoin, urlsplit

import httpx

from .config import Settings
from .logging_setup import event, get_logger
from .normalization import is_blocked, normalize_url
from .rate_limiter import DomainRateLimiter, backoff_delay
from .robots import RobotsChecker
from .state import StateStore

log = get_logger("crawler")

RETRYABLE_STATUSES = {429, 500, 502, 503, 504}
HTML_TYPES = ("text/html", "application/xhtml+xml")
MAX_RETRY_AFTER = 120.0
_CHALLENGE_MARKERS = (
    "cf-chl", "challenge-platform", "just a moment...", "attention required", "captcha",
    "_incapsula_resource", "px-captcha", "ddos-guard", "verify you are human", "bot detection",
)

OUTCOME_OK = "ok"
OUTCOME_FAILED = "failed"
OUTCOME_SKIPPED = "skipped"
OUTCOME_BLOCKED = "blocked"


class FetchError(Exception):
    pass


@dataclass
class FetchResult:
    url: str
    final_url: str = ""
    status: int = 0
    content_type: str = ""
    text: str = ""
    outcome: str = OUTCOME_OK
    reason: str = ""
    truncated: bool = False

    @property
    def ok(self) -> bool:
        return self.outcome == OUTCOME_OK


@dataclass
class _Response:
    url: str
    status: int
    headers: httpx.Headers
    content: bytes
    charset: str | None
    truncated: bool = False
    history: list[str] = field(default_factory=list)


def _netloc(url: str) -> str:
    return urlsplit(url).netloc.lower()


def looks_like_challenge(headers: httpx.Headers, body: bytes) -> bool:
    if headers.get("cf-mitigated", "").lower() == "challenge":
        return True
    sample = body[:20_000].decode("utf-8", errors="ignore").lower()
    return any(marker in sample for marker in _CHALLENGE_MARKERS)


def _decode(content: bytes, charset: str | None) -> str:
    if not charset:
        m = re.search(rb"<meta[^>]+charset=[\"']?([\w-]+)", content[:4096], re.I)
        charset = m.group(1).decode("ascii", "ignore") if m else "utf-8"
    try:
        return content.decode(charset, errors="replace")
    except LookupError:
        return content.decode("utf-8", errors="replace")


class Crawler:
    def __init__(
        self,
        settings: Settings,
        state: StateStore | None,
        *,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.settings = settings
        self.cfg = settings.crawler
        self._sleep = sleep
        self.client = httpx.Client(
            headers={
                "User-Agent": settings.user_agent,
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
                "Accept-Language": "en-IN,en;q=0.9",
            },
            timeout=httpx.Timeout(self.cfg.timeout),
            follow_redirects=False,
            transport=transport,
        )
        self.limiter = DomainRateLimiter(self.cfg.request_delay, sleep=sleep)
        self.robots = RobotsChecker(self._fetch_robots, state, settings.user_agent, self.cfg.robots_cache_hours)
        self._skipped_domains: dict[str, str] = {}
        self._guard = threading.Lock()

    def close(self) -> None:
        self.client.close()

    # ------------------------------------------------------------ public API

    def domain_skip_reason(self, url: str) -> str:
        return self._skipped_domains.get(_netloc(url), "")

    def skip_domain(self, url: str, reason: str) -> None:
        with self._guard:
            self._skipped_domains.setdefault(_netloc(url), reason)

    def fetch_page(self, url: str) -> FetchResult:
        """GET an HTML page, honouring blocklist, robots.txt and redirects."""
        current = normalize_url(url)
        if not current:
            return FetchResult(url, outcome=OUTCOME_FAILED, reason="invalid URL")
        for _hop in range(self.cfg.max_redirects + 1):
            refusal = self._precheck(current)
            if refusal:
                refusal.url = url
                return refusal
            resp = self._send("GET", current)
            if isinstance(resp, FetchResult):
                resp.url = url
                return resp
            if 300 <= resp.status < 400:
                location = resp.headers.get("location")
                if not location:
                    return FetchResult(url, current, resp.status, outcome=OUTCOME_FAILED, reason="redirect without Location")
                nxt = normalize_url(urljoin(current, location))
                if not nxt:
                    return FetchResult(url, current, resp.status, outcome=OUTCOME_FAILED, reason="bad redirect target")
                current = nxt
                continue
            return self._to_page_result(url, current, resp)
        return FetchResult(url, current, outcome=OUTCOME_FAILED, reason="too many redirects")

    def fetch_json(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | str | None = None,
        headers: dict[str, str] | None = None,
        min_delay: float | None = None,
        timeout: float | None = None,
        retries: int | None = None,
    ) -> Any:
        """Call an official JSON API (Overpass, search API, geocoder).

        APIs are accessed under their own usage policies rather than robots.txt,
        but the blocklist, rate limiting and retry rules still apply.
        """
        if is_blocked(url, self.settings.blocked_domains):
            raise FetchError(f"blocked domain: {url}")
        if min_delay:
            self.limiter.set_delay(_netloc(url), min_delay)
        resp = self._send(
            method, url, params=params, data=data, headers=headers, max_bytes=50_000_000, timeout=timeout,
            retries=retries,
        )
        if isinstance(resp, FetchResult):
            raise FetchError(f"{resp.outcome}: {resp.reason}")
        if resp.status != 200:
            snippet = resp.content[:300].decode("utf-8", "ignore")
            raise FetchError(f"HTTP {resp.status}: {snippet}")
        try:
            return json.loads(resp.content.decode(resp.charset or "utf-8", errors="replace"))
        except json.JSONDecodeError as exc:
            raise FetchError(f"invalid JSON from {url}: {exc}") from exc

    # ------------------------------------------------------------ internals

    def _precheck(self, url: str) -> FetchResult | None:
        if is_blocked(url, self.settings.blocked_domains):
            return FetchResult(url, url, outcome=OUTCOME_BLOCKED, reason="blocked domain (terms of service / policy)")
        if reason := self.domain_skip_reason(url):
            return FetchResult(url, url, outcome=OUTCOME_SKIPPED, reason=reason)
        rules = self.robots.rules_for(url)
        delay = rules.crawl_delay()
        if delay is not None:
            if delay > self.cfg.max_crawl_delay:
                reason = f"robots.txt Crawl-delay {delay:.0f}s exceeds max_crawl_delay"
                self.skip_domain(url, reason)
                return FetchResult(url, url, outcome=OUTCOME_SKIPPED, reason=reason)
            self.limiter.set_delay(_netloc(url), delay)
        if not rules.allowed(url):
            if rules.status in (401, 403) or rules.status == 0 or rules.status >= 500:
                self.skip_domain(url, f"robots.txt unavailable (HTTP {rules.status or 'error'}) - treated as disallow")
            return FetchResult(url, url, outcome=OUTCOME_SKIPPED, reason="disallowed by robots.txt")
        return None

    def _send(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | str | None = None,
        headers: dict[str, str] | None = None,
        max_bytes: int | None = None,
        timeout: float | None = None,
        retries: int | None = None,
    ) -> _Response | FetchResult:
        host = _netloc(url)
        limit = max_bytes or self.cfg.max_response_bytes
        last_error = ""
        max_retries = self.cfg.max_retries if retries is None else retries
        for attempt in range(max_retries + 1):
            self.limiter.wait(host)
            try:
                with self.client.stream(
                    method, url, params=params, data=data, headers=headers,
                    timeout=httpx.Timeout(timeout) if timeout else httpx.USE_CLIENT_DEFAULT,
                ) as resp:
                    content, truncated = self._read(resp, limit)
                    status = resp.status_code
                    if status in RETRYABLE_STATUSES or status in (401, 403):
                        if looks_like_challenge(resp.headers, content):
                            reason = f"bot protection / challenge page (HTTP {status}) - not bypassed"
                            self.skip_domain(url, reason)
                            return FetchResult(url, url, status, outcome=OUTCOME_SKIPPED, reason=reason)
                    if status in (401, 403):
                        return FetchResult(url, url, status, outcome=OUTCOME_SKIPPED, reason=f"access denied (HTTP {status})")
                    if status in RETRYABLE_STATUSES:
                        last_error = f"HTTP {status}"
                        wait = self._retry_after(resp.headers) or backoff_delay(attempt)
                        if attempt < max_retries and wait <= MAX_RETRY_AFTER:
                            event(log, "RETRY", "%s %s in %.1fs (attempt %d)", url, last_error, wait, attempt + 1, level=30)
                            self._sleep(wait)
                            continue
                        if status == 429:
                            self.skip_domain(url, "rate limited by server (HTTP 429)")
                        return FetchResult(url, url, status, outcome=OUTCOME_FAILED, reason=last_error)
                    return _Response(url, status, resp.headers, content, resp.charset_encoding, truncated)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = f"{type(exc).__name__}: {exc}"[:300]
                if attempt < max_retries:
                    wait = backoff_delay(attempt)
                    event(log, "RETRY", "%s %s in %.1fs", url, type(exc).__name__, wait, level=30)
                    self._sleep(wait)
                    continue
        return FetchResult(url, url, outcome=OUTCOME_FAILED, reason=last_error or "request failed")

    @staticmethod
    def _read(resp: httpx.Response, limit: int) -> tuple[bytes, bool]:
        buf = bytearray()
        for chunk in resp.iter_bytes():
            buf.extend(chunk)
            if len(buf) > limit:
                return bytes(buf[:limit]), True
        return bytes(buf), False

    @staticmethod
    def _retry_after(headers: httpx.Headers) -> float | None:
        value = headers.get("retry-after", "").strip()
        return float(value) if value.isdigit() else None

    def _to_page_result(self, url: str, final_url: str, resp: _Response) -> FetchResult:
        ctype = resp.headers.get("content-type", "").split(";")[0].strip().lower()
        base = FetchResult(url, final_url, resp.status, ctype, truncated=resp.truncated)
        if resp.status in (404, 410):
            base.outcome, base.reason = OUTCOME_FAILED, f"HTTP {resp.status}"
            return base
        if not 200 <= resp.status < 300:
            base.outcome, base.reason = OUTCOME_FAILED, f"unexpected HTTP {resp.status}"
            return base
        is_html = ctype in HTML_TYPES or (not ctype and b"<html" in resp.content[:2048].lower())
        if not is_html:
            base.outcome, base.reason = OUTCOME_SKIPPED, f"non-HTML content ({ctype or 'unknown'})"
            return base
        base.text = _decode(resp.content, resp.charset)
        return base

    def _fetch_robots(self, robots_url: str) -> tuple[int, str]:
        if is_blocked(robots_url, self.settings.blocked_domains):
            return 403, ""
        self.limiter.wait(_netloc(robots_url))
        try:
            resp = self.client.get(robots_url, follow_redirects=True)
        except (httpx.TimeoutException, httpx.TransportError):
            return 0, ""
        return resp.status_code, resp.text[:512_000] if resp.status_code < 300 else ""
