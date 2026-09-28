"""Command-line interface."""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from . import TOOL_NAME, __version__
from .config import apply_source_selection, enforce_limits, load_categories, load_settings
from .logging_setup import setup_logging
from .state import StateStore

log = logging.getLogger("dialnfind.cli")
PROJECT_DIR = Path(__file__).resolve().parent.parent

BANNER = f"""\
{TOOL_NAME} {__version__}
------------------------------------------------------------------------------
LEGAL NOTICE: You are responsible for complying with applicable laws (including
India's DPDP Act 2023 and the IT Act) and with the terms of service of every
website and API you use this tool with. The tool respects robots.txt, skips
blocked domains and never bypasses logins, CAPTCHAs or bot protection -- but
that does not by itself make any particular use lawful. Collected records are
unverified business listings; they must not be presented as dialnfind members.
------------------------------------------------------------------------------"""

# CLI args that are persisted so a bare `--resume` repeats the previous run.
RESUMABLE_ARGS = (
    "city", "state", "country", "categories", "output", "max_results", "concurrency",
    "delay", "sources", "min_score", "input_urls", "max_pages", "config", "export_dialnfind",
)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="main.py",
        description="Discover local service providers from permitted public sources and export clean CSV/JSON.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            '  python main.py --city Siliguri --state "West Bengal" --categories categories.txt\n'
            "  python main.py --input-urls urls.txt\n"
            "  python main.py --sources osm,website --min-score 60\n"
            "  python main.py --resume\n"
            "  python main.py --review output/siliguri_providers.csv"
        ),
    )
    g = p.add_argument_group("target")
    g.add_argument("--city", help="City to search (default from config.yaml)")
    g.add_argument("--state", help="State/region")
    g.add_argument("--country", help="Country")
    g.add_argument("--categories", help="Categories file, one per line (default: categories.txt)")
    g.add_argument("--input-urls", help="File of known business website URLs to crawl")

    g = p.add_argument_group("output")
    g.add_argument("--output", help="Main CSV path (review CSV and JSON are written next to it)")
    g.add_argument("--min-score", type=int, help="Minimum relevance score for the main CSV (0-100)")
    g.add_argument("--max-results", type=int, help="Maximum number of discovered candidates")
    g.add_argument("--export-dialnfind", metavar="JSON",
                   help="Also write the provider bundle the dialnfind server imports on deploy "
                        "(e.g. ../server/prisma/data/providers-siliguri.json)")

    g = p.add_argument_group("crawling")
    g.add_argument("--sources", help="Comma list: osm,overture,fsq,website,manual,search_api,directory")
    g.add_argument("--concurrency", type=int, help="Max domains crawled in parallel")
    g.add_argument("--delay", type=float, help="Seconds between requests to the same domain (min 1)")
    g.add_argument("--max-pages", type=int, help="Max pages fetched per website")
    g.add_argument("--resume", action="store_true", help="Continue the previous run from output state DB")
    g.add_argument("--use-ai-classification", action="store_true",
                   help="Refine categories with an LLM (needs ANTHROPIC_API_KEY and `pip install anthropic`)")
    g.add_argument("--dry-run", action="store_true", help="Show sources and queries without any network access")

    g = p.add_argument_group("review")
    g.add_argument("--review", metavar="CSV", help="Print records needing manual review from a CSV and exit")
    g.add_argument("--review-limit", type=int, default=50, help="Max records printed by --review")

    g = p.add_argument_group("misc")
    g.add_argument("--config", help="Config file (default: config.yaml)")
    g.add_argument("--state-db", help="SQLite state file (default from config: output/discovery.db)")
    g.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    g.add_argument("--log-file", default="", help="Also write logs to this file")
    g.add_argument("--log-format", default="text", choices=["text", "json"])
    g.add_argument("--version", action="version", version=f"{TOOL_NAME} {__version__}")
    return p


def _resolve(path: str | None, default: str) -> str:
    """Relative paths resolve against CWD, falling back to the project directory."""
    candidate = Path(path or default)
    if candidate.is_absolute() or candidate.exists():
        return str(candidate)
    fallback = PROJECT_DIR / candidate
    return str(fallback) if fallback.exists() else str(candidate)


def _restore_previous_args(args: argparse.Namespace, db_path: str) -> None:
    if not Path(db_path).exists():
        log.warning("--resume: no previous state at %s; starting fresh", db_path)
        return
    store = StateStore(db_path)
    try:
        previous: dict[str, Any] | None = store.get_meta("cli_args")
    finally:
        store.close()
    if not previous:
        return
    restored = []
    for key in RESUMABLE_ARGS:
        if getattr(args, key, None) in (None, "") and previous.get(key) not in (None, ""):
            setattr(args, key, previous[key])
            restored.append(key)
    if restored:
        log.info("--resume: reusing previous %s", ", ".join(restored))


def check_dialnfind_mapping(settings: Any, categories: list[str]) -> list[str]:
    """Every category rule must point at a real dialnfind category/subcategory, so a bundle
    never carries a service the server would reject."""
    from .bundle import load_dialnfind_categories, mapping_errors
    from .classification import build_rules

    path = Path(settings.dialnfind_categories)
    if not path.is_absolute():
        path = PROJECT_DIR / path
    if not path.exists():
        if settings.bundle_output:
            return [f"dialnfind categories file not found: {path} (config: dialnfind_categories)"]
        log.warning("dialnfind categories file %s not found; skipping the category mapping check", path)
        return []
    rules = build_rules(categories, settings.category_rules)
    return [f"category mapping: {e}" for e in mapping_errors(rules, load_dialnfind_categories(path))]


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    setup_logging(args.log_level, args.log_file, args.log_format)
    load_dotenv(Path.cwd() / ".env") or load_dotenv(PROJECT_DIR / ".env")

    from .review import print_review  # local import keeps --help fast

    config_path = _resolve(args.config, "config.yaml")
    if args.review:
        settings = load_settings(config_path)
        min_rel = args.min_score if args.min_score is not None else settings.scoring.minimum_relevance
        print_review(args.review, min_rel, settings.scoring.minimum_quality, args.review_limit)
        return 0

    print(BANNER, file=sys.stderr)
    settings = load_settings(config_path)
    db_path = args.state_db or settings.state_db
    if args.resume:
        _restore_previous_args(args, db_path)
        if args.config and args.config != config_path:
            settings = load_settings(_resolve(args.config, "config.yaml"))

    # CLI overrides
    for attr in ("city", "state", "country", "output", "max_results", "min_score"):
        value = getattr(args, attr)
        if value is not None:
            setattr(settings, attr, value)
    if args.concurrency is not None:
        settings.crawler.max_concurrent_domains = args.concurrency
    if args.delay is not None:
        settings.crawler.request_delay = args.delay
    if args.max_pages is not None:
        settings.crawler.max_pages_per_domain = args.max_pages
    settings.state_db = db_path
    settings.resume = args.resume
    if args.export_dialnfind:
        settings.bundle_output = args.export_dialnfind
    settings.dry_run = args.dry_run
    if args.input_urls:
        settings.input_urls = _resolve(args.input_urls, args.input_urls)
        if not Path(settings.input_urls).exists():
            log.error("URL file not found: %s (create it, e.g. cp urls.example.txt %s)", args.input_urls, args.input_urls)
            return 2
    try:
        if args.sources:
            apply_source_selection(settings, args.sources)
        elif args.input_urls:
            # Only a URL list given: crawl exactly those sites.
            apply_source_selection(settings, "manual,website")
            log.info("--input-urls without --sources: using sources manual,website")
        enforce_limits(settings)
        categories_path = _resolve(args.categories, settings.categories_file)
        categories = load_categories(categories_path)
    except (ValueError, OSError) as exc:
        log.error("%s", exc)
        return 2
    if problems := check_dialnfind_mapping(settings, categories):
        for problem in problems:
            log.error("%s", problem)
        return 2
    if not settings.contact_email:
        log.warning("contact_email is not set (config.yaml or CONTACT_EMAIL in .env). "
                    "Site owners can't reach you about the crawler - please set it.")

    from .pipeline import dry_run, run_pipeline

    if args.dry_run:
        dry_run(settings, categories)
        return 0

    store = StateStore(db_path)
    try:
        store.set_meta("cli_args", {k: getattr(args, k, None) for k in RESUMABLE_ARGS})
    finally:
        store.close()

    try:
        stats = run_pipeline(settings, categories, use_ai=args.use_ai_classification)
    except KeyboardInterrupt:
        print("\nInterrupted. Progress is saved; run again with --resume to continue.", file=sys.stderr)
        return 130
    print("\n" + stats.summary(), file=sys.stderr)
    return 0 if stats.exported else 1
