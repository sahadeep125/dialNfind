"""robots.txt handling (RFC 9309 semantics, conservative on errors)."""

from __future__ import annotations

import threading
from collections.abc import Callable
from dataclasses import dataclass
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

from .logging_setup import event, get_logger
from .state import StateStore

log = get_logger("robots")

# fetcher(robots_url) -> (status_code, body). status 0 = network failure.
RobotsFetcher = Callable[[str], tuple[int, str]]


@dataclass
class RobotsRules:
    parser: RobotFileParser
    agent: str
    status: int

    def allowed(self, url: str) -> bool:
        return self.parser.can_fetch(self.agent, url)

    def crawl_delay(self) -> float | None:
        delay = self.parser.crawl_delay(self.agent)
        return float(delay) if delay is not None else None


def parse_robots(status: int, body: str, agent: str) -> RobotsRules:
    """Build rules from a robots.txt response.

    * 2xx         -> parse the file
    * 401/403     -> disallow everything (access is restricted)
    * other 4xx   -> no robots.txt, allow everything
    * 5xx/network -> unreachable, disallow everything (RFC 9309 §2.3.1.4)
    """
    parser = RobotFileParser()
    if 200 <= status < 300:
        parser.parse(body.splitlines())
    elif status in (401, 403):
        parser.disallow_all = True
    elif 400 <= status < 500:
        parser.allow_all = True
    else:
        parser.disallow_all = True
    parser.modified()
    return RobotsRules(parser=parser, agent=agent, status=status)


def origin_of(url: str) -> str:
    parts = urlsplit(url)
    return f"{parts.scheme}://{parts.netloc}".lower()


class RobotsChecker:
    def __init__(self, fetcher: RobotsFetcher, state: StateStore | None, agent: str, cache_hours: float) -> None:
        self._fetcher = fetcher
        self._state = state
        self._agent = agent
        self._max_age = cache_hours * 3600
        self._rules: dict[str, RobotsRules] = {}
        self._locks: dict[str, threading.Lock] = {}
        self._guard = threading.Lock()

    def rules_for(self, url: str) -> RobotsRules:
        origin = origin_of(url)
        with self._guard:
            lock = self._locks.setdefault(origin, threading.Lock())
        with lock:
            if origin in self._rules:
                return self._rules[origin]
            cached = self._state.get_robots(origin, self._max_age) if self._state else None
            if cached is not None:
                status, body = cached
            else:
                status, body = self._fetcher(f"{origin}/robots.txt")
                # Only persist definitive answers; retry unreachable robots.txt next run.
                if self._state and status and status < 500:
                    self._state.put_robots(origin, status, body)
                event(log, "ROBOTS", "%s -> HTTP %s", origin, status or "unreachable", level=10)
            rules = parse_robots(status, body, self._agent)
            self._rules[origin] = rules
            return rules

    def can_fetch(self, url: str) -> bool:
        return self.rules_for(url).allowed(url)

    def crawl_delay(self, url: str) -> float | None:
        return self.rules_for(url).crawl_delay()
