"""End-to-end pipeline: discover -> crawl -> extract -> validate -> dedup -> classify -> score -> export."""

from __future__ import annotations

import time
from collections import Counter
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import httpx

from .classification import AIClassifier, build_rules, classify
from .config import Settings
from .crawler import Crawler
from .deduplication import deduplicate
from .discovery import DiscoveryEngine, plan_queries
from .bundle import write_bundle
from .exporters import REVIEW_COLUMNS, attributions, output_paths, write_csv, write_json
from .geocoding import Geocoder
from .logging_setup import event, get_logger
from .models import Location, Provider, RawRecord
from .review import REASON_LOW_RELEVANCE, review_reasons
from .scoring import quality_score, relevance_score, source_confidence
from .sources import SourceContext, WebsiteSource, build_sources
from .sources.website import CrawlOutcome, SiteTask, build_site_tasks
from .state import URL_BLOCKED, URL_DONE, URL_FAILED, URL_SKIPPED, StateStore
from .validation import validate_record

log = get_logger("pipeline")


@dataclass
class RunStats:
    discovered: int = 0
    sites_total: int = 0
    sites_crawled: int = 0
    sites_skipped: int = 0
    sites_failed: int = 0
    raw_records: int = 0
    valid: int = 0
    duplicates: int = 0
    duplicate_candidates: int = 0
    rejected: int = 0
    final: int = 0
    needs_review: int = 0
    below_threshold: int = 0
    failed_queries: int = 0
    exported: bool = False
    bundle_records: int = 0
    bundle_skipped: dict[str, int] = field(default_factory=dict)
    reject_reasons: dict[str, int] = field(default_factory=dict)

    def summary(self) -> str:
        lines = [
            f"Discovered: {self.discovered}",
            f"Websites crawled: {self.sites_crawled} (skipped {self.sites_skipped}, failed {self.sites_failed})",
            f"Records extracted: {self.raw_records}",
            f"Valid: {self.valid}",
            f"Duplicates: {self.duplicates} merged, {self.duplicate_candidates} flagged for review",
            f"Rejected: {self.rejected}",
            f"Final providers: {self.final}",
            f"Needs review: {self.needs_review} (of which below min score: {self.below_threshold})",
        ]
        if self.failed_queries:
            lines.append(f"WARNING: {self.failed_queries} discovery query/queries failed - see log")
        if not self.exported:
            lines.append("Outputs NOT written (discovery failed); previous files kept. Rerun with --resume.")
        if self.bundle_records or self.bundle_skipped:
            skipped = ", ".join(f"{k}={v}" for k, v in sorted(self.bundle_skipped.items()))
            lines.append(f"dialnfind bundle: {self.bundle_records} providers" + (f" (left out: {skipped})" if skipped else ""))
        if self.reject_reasons:
            lines.append("Reject reasons: " + ", ".join(f"{k}={v}" for k, v in sorted(self.reject_reasons.items())))
        return "\n".join(lines)


def dry_run(settings: Settings, categories: list[str]) -> None:
    location = Location(settings.city, settings.state, settings.country)
    rules = build_rules(categories, settings.category_rules)
    state = StateStore(":memory:")
    crawler = Crawler(settings, None)
    ctx = SourceContext(settings, crawler, state, {r.name: r for r in rules}, location)
    try:
        print(f"Location : {location.label()}")
        print(f"Categories ({len(rules)}): {', '.join(r.name for r in rules)}")
        print(f"Output   : {settings.output_path()}")
        print(f"Crawl websites: {settings.sources.websites}; delay={settings.crawler.request_delay}s; "
              f"concurrency={settings.crawler.max_concurrent_domains}; pages/domain={settings.crawler.max_pages_per_domain}")
        for source in build_sources(ctx):
            usable, why = source.available()
            queries = plan_queries(source, rules, location, settings.search_api.max_queries_per_category)
            print(f"\n[{source.name}] {'ready' if usable else 'UNAVAILABLE: ' + why} - {len(queries)} call(s)")
            for query, _category in queries[:60]:
                print(f"   {query}")
    finally:
        crawler.close()
        state.close()


def _crawl_sites(website: WebsiteSource, tasks: list[SiteTask], state: StateStore, settings: Settings, stats: RunStats) -> None:
    pending: list[SiteTask] = []
    for task in tasks:
        row = state.url_row(task.root)
        if row is not None:
            if row["status"] in (URL_DONE, URL_SKIPPED, URL_BLOCKED):
                continue  # resume: already handled
            if row["status"] == URL_FAILED and row["attempts"] >= settings.crawler.max_attempts_per_url:
                continue
        state.ensure_url(task.root, task.host)
        pending.append(task)
    if len(pending) < len(tasks):
        event(log, "RESUME", "skipping %d already-processed website(s)", len(tasks) - len(pending))
    if not pending:
        return

    workers = settings.crawler.max_concurrent_domains
    pool = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="crawl")
    try:
        futures = {pool.submit(website.crawl, task): task for task in pending}
        for done_count, future in enumerate(as_completed(futures), 1):
            task = futures[future]
            try:
                outcome = future.result()
            except Exception as exc:  # never let one site kill the run
                log.exception("crawl crashed for %s", task.host)
                outcome = CrawlOutcome(status=URL_FAILED, error=f"{type(exc).__name__}: {exc}")
            if outcome.record is not None:
                state.save_raw_record(outcome.record)
            state.mark_url(task.root, task.host, outcome.status, outcome.error, outcome.pages)
            if done_count % 10 == 0:
                event(log, "PROGRESS", "%d/%d websites processed", done_count, len(pending))
    except KeyboardInterrupt:
        event(log, "ABORT", "interrupted - progress saved; rerun with --resume to continue", level=30)
        pool.shutdown(wait=False, cancel_futures=True)
        raise
    finally:
        pool.shutdown(wait=True)


def _classify_and_score(
    providers: list[Provider],
    records_by_key: dict[str, RawRecord],
    settings: Settings,
    rules: list[Any],
    location: Location,
    ai: AIClassifier | None,
    stats: RunStats,
) -> tuple[list[Provider], list[Provider], list[Provider]]:
    """Returns (main, review, below_threshold)."""
    profile = settings.location_profile()
    rejects: Counter[str] = Counter(stats.reject_reasons)
    main: list[Provider] = []
    review: list[Provider] = []
    below: list[Provider] = []
    for p in providers:
        hint = next(
            (records_by_key[k].discovery_category for k in p.record_keys
             if k in records_by_key and records_by_key[k].discovery_category), ""
        )
        cls = classify(p.provider_name, p.evidence, rules, hint_category=hint)
        if ai is not None:
            ai_result = ai.classify(p.provider_name, p.evidence)
            if ai_result and ai_result[0]:
                ai_primary, ai_secondary = ai_result
                if not cls.primary_category:
                    cls.primary_category, cls.method = ai_primary, "ai"
                    cls.secondary_categories = ai_secondary
                else:
                    cls.method = "rules+ai"
                    cls.secondary_categories = list(dict.fromkeys(cls.secondary_categories + ai_secondary))
                    cls.secondary_categories = [c for c in cls.secondary_categories if c != cls.primary_category]
        p.primary_category = cls.primary_category
        p.secondary_categories = cls.secondary_categories
        p.classification_method = cls.method
        p.category_evidence = "evidence" if not cls.name_only else "name" if cls.name_keywords else "weak"
        p.source_confidence = source_confidence(p)
        p.relevance_score, rel_parts = relevance_score(p, cls, location, profile)
        p.data_quality_score, q_parts = quality_score(p)
        p.score_breakdown = {"relevance": rel_parts, "quality": q_parts}
        event(log, "SCORE", "%s: relevance=%d quality=%d category=%s", p.provider_name,
              p.relevance_score, p.data_quality_score, p.primary_category or "-", level=20)

        if not p.primary_category:
            rejects["no matching category"] += 1
            continue
        if p.relevance_score < settings.scoring.reject_below_relevance:
            rejects["relevance below reject floor"] += 1
            continue
        p.review_reasons = review_reasons(
            relevance=p.relevance_score,
            quality=p.data_quality_score,
            duplicate_candidate=p.duplicate_candidate,
            phone=p.phone,
            address=p.address,
            min_relevance=settings.min_relevance,
            min_quality=settings.scoring.minimum_quality,
            name_only=cls.name_only,
        )
        if p.review_reasons:
            review.append(p)
        if REASON_LOW_RELEVANCE in p.review_reasons:
            below.append(p)
        else:
            main.append(p)
    stats.reject_reasons = dict(rejects)
    return main, review, below


def run_pipeline(
    settings: Settings,
    categories: list[str],
    *,
    use_ai: bool = False,
    transport: httpx.BaseTransport | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> RunStats:
    """Run everything. ``transport``/``sleep`` exist for offline tests."""
    stats = RunStats()
    location = Location(settings.city, settings.state, settings.country)
    profile = settings.location_profile()
    state = StateStore(settings.state_db)
    if not settings.resume:
        state.reset_run()
    state.set_meta("last_run", {"location": asdict(location), "categories": categories})
    rules = build_rules(categories, settings.category_rules)
    crawler = Crawler(settings, state, transport=transport, sleep=sleep)
    ctx = SourceContext(settings, crawler, state, {r.name: r for r in rules}, location)
    try:
        # 1. discovery
        engine = DiscoveryEngine(build_sources(ctx), state, settings.max_results,
                                 settings.search_api.max_queries_per_category)
        candidates = engine.run(rules, location)
        stats.discovered = len(candidates)
        stats.failed_queries = engine.failed_queries
        if not candidates and engine.failed_queries:
            event(log, "EXPORT", "skipped - discovery failed; previous outputs kept", level=40)
            return stats
        event(log, "FOUND", "%d candidates in total", len(candidates))
        for cand in candidates:
            if cand.prefilled is not None:
                state.save_raw_record(cand.prefilled)

        # 2. crawl websites
        if settings.sources.websites:
            tasks = build_site_tasks(candidates)
            stats.sites_total = len(tasks)
            _crawl_sites(WebsiteSource(ctx), tasks, state, settings, stats)
        counts = state.url_status_counts()
        stats.sites_crawled = counts.get(URL_DONE, 0)
        stats.sites_skipped = counts.get(URL_SKIPPED, 0) + counts.get(URL_BLOCKED, 0)
        stats.sites_failed = counts.get(URL_FAILED, 0)

        # 3. validate
        records = state.load_raw_records()
        stats.raw_records = len(records)
        valid: list[RawRecord] = []
        rejects: Counter[str] = Counter()
        for rec in records:
            result = validate_record(rec, location, profile)
            if result.ok:
                valid.append(rec)
            else:
                rejects[result.reasons[0].split(" (")[0]] += 1
        stats.valid = len(valid)
        stats.reject_reasons = dict(rejects)

        # 4. dedup + merge
        city_words = {location.city, *profile.get("aliases", [])}
        dedup = deduplicate(valid, settings.dedup, settings.source_priority, city_stopwords=city_words)
        stats.duplicates = dedup.merged_away
        providers = dedup.providers

        # 5. optional geocoding
        geocoder = Geocoder(settings, crawler, state)
        if geocoder.enabled:
            for p in providers:
                geocoder.geocode(p, location)

        # 6. classify + score
        ai = None
        if use_ai:
            if not settings.ai.api_key:
                log.warning("--use-ai-classification given but ANTHROPIC_API_KEY is not set; using rules only")
            else:
                try:
                    services = sorted({s for r in rules for s in r.services})
                    ai = AIClassifier(settings.ai.api_key, settings.ai.model, [r.name for r in rules], services)
                except ImportError:
                    log.warning("`anthropic` package not installed; using rules only (pip install anthropic)")
        records_by_key = {r.record_key: r for r in valid}
        main, review, below = _classify_and_score(providers, records_by_key, settings, rules, location, ai, stats)
        stats.rejected = sum(stats.reject_reasons.values())
        stats.final = len(main)
        stats.needs_review = len(review)
        stats.below_threshold = len(below)
        stats.duplicate_candidates = sum(1 for p in [*main, *below] if p.duplicate_candidate)

        for p in [*main, *below]:
            for key in p.record_keys:
                if key.startswith("website:"):
                    state.set_provider_id_for_domain(key.split(":", 1)[1], p.provider_id)

        # 7. export
        main.sort(key=lambda p: (p.primary_category, -p.relevance_score, p.provider_name.lower()))
        paths = output_paths(settings.output_path())
        stats.exported = True
        write_csv(main, paths["csv"])
        write_csv(review, paths["review"], REVIEW_COLUMNS)
        write_json(
            main,
            below,
            paths["json"],
            {
                "location": asdict(location),
                "categories": categories,
                "sources_enabled": settings.enabled_sources(),
                "min_relevance": settings.min_relevance,
                "min_quality": settings.scoring.minimum_quality,
                "stats": asdict(stats),
            },
        )
        for kind, path in paths.items():
            event(log, "EXPORT", "%s -> %s", kind, path)
        if settings.bundle_output:
            bundle_path = Path(settings.bundle_output)
            stats.bundle_records, stats.bundle_skipped = write_bundle(
                main, rules, bundle_path, location, attributions(main)
            )
            event(log, "EXPORT", "dialnfind bundle (%d providers) -> %s", stats.bundle_records, bundle_path)
        return stats
    finally:
        crawler.close()
        state.close()
