"""Discovery layer: turns categories into queries and runs enabled sources."""

from __future__ import annotations

from .classification import CategoryRule
from .logging_setup import event, get_logger
from .models import Candidate, Location
from .sources import DiscoverySource
from .state import URL_DONE, URL_FAILED, StateStore

log = get_logger("discovery")


def generate_queries(rule: CategoryRule, location: Location, limit: int = 3) -> list[str]:
    """"AC Repair" -> ["AC repair Siliguri", "AC service Siliguri", "air conditioner repair Siliguri"]."""
    return [f"{q} {location.city}".strip() for q in rule.search_queries(limit)]


def plan_queries(source: DiscoverySource, rules: list[CategoryRule], location: Location, per_category: int) -> list[tuple[str, str]]:
    """(query, category) pairs a source will be called with."""
    if source.query_mode == "once":
        return [(f"once:{source.name}", "")]
    if source.query_mode == "category":
        return [(f"{rule.name} {location.city}", rule.name) for rule in rules]
    return [(q, rule.name) for rule in rules for q in generate_queries(rule, location, per_category)]


class DiscoveryEngine:
    def __init__(self, sources: list[DiscoverySource], state: StateStore, max_results: int, queries_per_category: int = 3) -> None:
        self.sources = sources
        self.state = state
        self.max_results = max_results
        self.queries_per_category = queries_per_category
        self.failed_queries = 0

    def run(self, rules: list[CategoryRule], location: Location) -> list[Candidate]:
        total = self.state.candidate_count()
        if total:
            event(log, "DISCOVERY", "resuming with %d stored candidates", total)
        for source in self.sources:
            usable, why = source.available()
            if not usable:
                event(log, "SKIP", "source %s unavailable: %s", source.name, why, level=30)
                continue
            for query, category in plan_queries(source, rules, location, self.queries_per_category):
                if total >= self.max_results:
                    event(log, "DISCOVERY", "max results (%d) reached; stopping discovery", self.max_results)
                    return self.state.load_candidates()
                if self.state.query_done(source.name, query):
                    continue
                event(log, "DISCOVERY", "%s / %s via %s (%s)", category or "all categories", location.city, source.name, query)
                try:
                    found = source.discover(query, location, category)
                except Exception as exc:  # one failing source/query must not stop the run
                    event(log, "ERROR", "%s failed for %r: %s", source.name, query, exc, level=40)
                    self.state.mark_query(source.name, query, category, URL_FAILED, error=str(exc))
                    self.failed_queries += 1
                    continue
                new = 0
                for cand in found:
                    if total >= self.max_results:
                        break
                    if self.state.add_candidate(cand):
                        new += 1
                        total += 1
                self.state.mark_query(source.name, query, category, URL_DONE, count=len(found))
                event(log, "FOUND", "%d candidates (%d new)", len(found), new)
        return self.state.load_candidates()
