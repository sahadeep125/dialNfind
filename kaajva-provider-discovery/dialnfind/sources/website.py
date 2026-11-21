"""Business website crawler: homepage + a few contact/about/services pages."""

from __future__ import annotations

from dataclasses import dataclass, field

from ..crawler import OUTCOME_BLOCKED, OUTCOME_OK, OUTCOME_SKIPPED
from ..extraction import PageData, build_website_record, parse_page, select_follow_links
from ..logging_setup import event, get_logger
from ..models import Candidate, Location, RawRecord
from ..normalization import host_of, site_root
from ..state import URL_BLOCKED, URL_DONE, URL_FAILED, URL_SKIPPED
from .base import DiscoverySource

log = get_logger("source.website")


@dataclass
class SiteTask:
    host: str
    root: str
    start_urls: list[str] = field(default_factory=list)
    candidates: list[Candidate] = field(default_factory=list)


@dataclass
class CrawlOutcome:
    status: str
    error: str = ""
    record: RawRecord | None = None
    pages: int = 0


def build_site_tasks(candidates: list[Candidate]) -> list[SiteTask]:
    """One task per website host, keeping discovery order."""
    tasks: dict[str, SiteTask] = {}
    for cand in candidates:
        if not cand.url:
            continue
        host = host_of(cand.url)
        if not host:
            continue
        task = tasks.get(host)
        if task is None:
            task = tasks[host] = SiteTask(host=host, root=site_root(cand.url))
        if cand.url != task.root and cand.url not in task.start_urls:
            task.start_urls.append(cand.url)
        task.candidates.append(cand)
    return list(tasks.values())


class WebsiteSource(DiscoverySource):
    """Crawls candidate websites. It does not discover new candidates itself."""

    name = "website"
    config_key = "websites"
    query_mode = "none"

    def discover(self, query: str, location: Location, category: str) -> list[Candidate]:
        return []

    def crawl(self, task: SiteTask) -> CrawlOutcome:
        crawler = self.ctx.crawler
        max_pages = self.ctx.settings.crawler.max_pages_per_domain
        event(log, "CRAWL", "%s", task.host)

        home = crawler.fetch_page(task.root)
        attempts = 1
        if not home.ok and home.outcome != OUTCOME_BLOCKED and not crawler.domain_skip_reason(task.root):
            for url in task.start_urls[:1]:
                alt = crawler.fetch_page(url)
                attempts += 1
                if alt.ok:
                    home = alt
                    break
        if not home.ok:
            status = {OUTCOME_BLOCKED: URL_BLOCKED, OUTCOME_SKIPPED: URL_SKIPPED}.get(home.outcome, URL_FAILED)
            event(log, "SKIP" if status != URL_FAILED else "ERROR", "%s: %s", task.host, home.reason, level=30 if status == URL_FAILED else 20)
            return CrawlOutcome(status=status, error=home.reason, pages=0)

        pages: list[PageData] = [parse_page(home.text, home.final_url)]
        fetched = {task.root, home.url, home.final_url}
        follow = [u for u in task.start_urls if u not in fetched]
        follow += [u for u in select_follow_links(pages[0], max_pages) if u not in follow]
        for url in follow:
            if len(pages) >= max_pages or crawler.domain_skip_reason(url):
                break
            if url in fetched or host_of(url) != host_of(home.final_url):
                continue
            fetched.add(url)
            result = crawler.fetch_page(url)
            if result.outcome == OUTCOME_OK:
                pages.append(parse_page(result.text, result.final_url))
            else:
                event(log, "SKIP", "%s: %s", url, result.reason, level=10)

        first = task.candidates[0] if task.candidates else None
        record = build_website_record(
            pages,
            site_url=site_root(home.final_url),
            location=self.ctx.location,
            profile=self.ctx.settings.location_profile(),
            extraction=self.ctx.settings.extraction,
            discovered_via=first.source_name if first else "",
            query=first.query if first else "",
            category=next((c.category for c in task.candidates if c.category), ""),
        )
        record.record_key = f"website:{task.host}"
        event(
            log, "EXTRACT", "%s -> %s (%d pages, phone=%s, structured=%s)", task.host,
            record.provider_name or "<no name>", len(pages), "yes" if record.phones else "no",
            "yes" if record.has_structured_data else "no",
        )
        return CrawlOutcome(status=URL_DONE, record=record, pages=len(pages))
