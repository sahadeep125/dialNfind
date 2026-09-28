"""Offline end-to-end run against the fictional mock web in tests/fixtures/sites.py."""

import csv
import json
from pathlib import Path

import pytest

from dialnfind.config import apply_source_selection, load_categories, load_settings
from dialnfind.pipeline import run_pipeline
from dialnfind.review import load_review_rows
from dialnfind.state import StateStore
from tests.fixtures import sites

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture()
def settings(tmp_path):
    (tmp_path / "urls.txt").write_text(sites.MANUAL_URLS)
    s = load_settings(ROOT / "config.yaml")
    apply_source_selection(s, "osm,manual,website")
    s.input_urls = str(tmp_path / "urls.txt")
    s.output = str(tmp_path / "siliguri_providers.csv")
    s.state_db = str(tmp_path / "discovery.db")
    s.contact_email = "ops@example.org"
    sites.VIOLATIONS.clear()
    return s


def run(settings):
    return run_pipeline(settings, load_categories(ROOT / "categories.txt"),
                        transport=sites.transport(), sleep=lambda _s: None)


def rows(path):
    with open(path, encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def test_end_to_end(settings, tmp_path):
    stats = run(settings)
    assert sites.VIOLATIONS == []  # robots.txt, blocklist and challenges all respected

    main = {r["provider_name"]: r for r in rows(tmp_path / "siliguri_providers.csv")}
    assert set(main) == {"CoolCare Appliances", "Cool Care Appliance", "Sparkfix Electricals", "Sharma Plumbing Works"}
    assert "Sweet Treats Bakery" not in main  # not a service provider

    cool = main["CoolCare Appliances"]
    assert cool["primary_category"] == "AC Repair & Service"
    assert cool["phone"] == "+919933000001" and cool["whatsapp"] == "+919933000002"
    assert cool["source_types"] == "website | osm"
    assert cool["claim_status"] == "unclaimed" and cool["verification_status"] == "none"
    assert cool["is_claimed"] == "false" and cool["source_type"] == "discovered"
    assert cool["duplicate_candidate"] == "true"
    assert main["Cool Care Appliance"]["duplicate_group_id"] == cool["duplicate_group_id"]

    spark = main["Sparkfix Electricals"]
    assert spark["primary_category"] == "Electricians"
    assert spark["latitude"] == "26.7101"  # from OSM, merged with the website record by domain

    sharma = main["Sharma Plumbing Works"]
    assert sharma["website"] == "" and sharma["email"] == ""  # unknown -> blank, never "Unknown"

    review_names = {r["provider_name"] for r in rows(tmp_path / "siliguri_providers_review.csv")}
    assert {"CoolCare Appliances", "Cool Care Appliance"} <= review_names

    data = json.loads((tmp_path / "siliguri_providers.json").read_text())
    assert data["metadata"]["attribution"]  # ODbL attribution present for OSM-derived data
    assert data["providers"][0]["score_breakdown"]

    assert stats.discovered == 10 and stats.duplicates == 2 and stats.final == 4

    store = StateStore(settings.state_db)
    counts = store.url_status_counts()
    store.close()
    assert counts == {"done": 3, "skipped": 2, "blocked": 1}


def test_resume_skips_processed_sites(settings):
    run(settings)
    calls = []

    def counting(request):
        calls.append(str(request.url))
        return sites.handler(request)

    import httpx

    settings.resume = True
    stats = run_pipeline(settings, load_categories(ROOT / "categories.txt"),
                         transport=httpx.MockTransport(counting), sleep=lambda _s: None)
    assert calls == []  # every query and site was already done (Overpass responses are cached)
    assert stats.final == 4


def test_review_command_reads_csv(settings, tmp_path):
    run(settings)
    flagged = load_review_rows(tmp_path / "siliguri_providers_review.csv", 50, 40)
    assert flagged and all(r["review_reasons"] for r in flagged)


def test_failed_discovery_keeps_previous_outputs(settings, tmp_path):
    import httpx

    out = tmp_path / "siliguri_providers.csv"
    out.write_text("previous,data\n")
    apply_source_selection(settings, "osm,website")
    stats = run_pipeline(settings, load_categories(ROOT / "categories.txt"),
                         transport=httpx.MockTransport(lambda r: httpx.Response(504)), sleep=lambda _s: None)
    assert not stats.exported and stats.failed_queries > 0
    assert out.read_text() == "previous,data\n"


def test_cli_missing_url_file_exits_2(tmp_path):
    from dialnfind.cli import main

    assert main(["--input-urls", str(tmp_path / "missing.txt"), "--state-db", str(tmp_path / "d.db")]) == 2
