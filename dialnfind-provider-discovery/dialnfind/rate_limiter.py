"""Per-domain politeness delays and retry backoff."""

from __future__ import annotations

import random
import threading
import time
from collections import defaultdict
from collections.abc import Callable


class DomainRateLimiter:
    """Guarantees at least ``delay`` seconds between request starts on the same domain.

    Requests to one domain are serialized; different domains proceed independently.
    """

    def __init__(
        self,
        default_delay: float,
        *,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.default_delay = default_delay
        self._clock = clock
        self._sleep = sleep
        self._next_allowed: dict[str, float] = {}
        self._delays: dict[str, float] = {}
        self._locks: defaultdict[str, threading.Lock] = defaultdict(threading.Lock)
        self._registry_lock = threading.Lock()

    def set_delay(self, domain: str, delay: float) -> None:
        """Raise the delay for one domain (e.g. robots.txt Crawl-delay). Never lowers it."""
        with self._registry_lock:
            self._delays[domain] = max(delay, self._delays.get(domain, self.default_delay))

    def delay_for(self, domain: str) -> float:
        return self._delays.get(domain, self.default_delay)

    def wait(self, domain: str) -> None:
        with self._registry_lock:
            lock = self._locks[domain]
        with lock:
            now = self._clock()
            ready_at = self._next_allowed.get(domain, 0.0)
            if ready_at > now:
                self._sleep(ready_at - now)
            self._next_allowed[domain] = self._clock() + self.delay_for(domain)


def backoff_delay(attempt: int, base: float = 2.0, cap: float = 60.0) -> float:
    """Exponential backoff with jitter: ~2s, 4s, 8s ... capped."""
    return min(cap, base * (2**attempt)) + random.uniform(0, 1)
