"""Overture / Foursquare sources, dialnfind category mapping and the provider bundle (offline)."""

import json
from pathlib import Path

import pytest

from dialnfind.bundle import (
    bundle_record,
    clean_business_name,
    load_dialnfind_categories,
    mapping_errors,
    write_bundle,
)
from dialnfind.classification import build_rules, classify
from dialnfind.config import load_categories, load_settings
from dialnfind.crawler import Crawler
from dialnfind.models import Evidence, Location, Provider
from dialnfind.sources import SourceContext
from dialnfind.sources.foursquare import fsq_to_record
from dialnfind.sources.overture import OvertureSource, place_to_record
from dialnfind.state import StateStore

ROOT = Path(__file__).resolve().parent.parent
LOCATION = Location("Siliguri", "West Bengal", "India")
PROFILE = {"aliases": ["Shiliguri"], "localities": ["Sevoke Road", "Pradhan Nagar", "Matigara"]}

duckdb = pytest.importorskip("duckdb")


@pytest.fixture(scope="module")
def settings():
    return load_settings(ROOT / "config.yaml")


@pytest.fixture(scope="module")
def rules(settings):
    return build_rules(load_categories(ROOT / "categories.txt"), settings.category_rules)


def overture_row(**over):
    row = {
        "id": "08f1",
        "name": "Cool Care AC Service",
        "phones": ["+91 99330 00001"],
        "websites": ["https://www.facebook.com/coolcare", "https://coolcare.example"],
        "emails": None,
        "addresses": [{"freeform": "12 Sevoke Road", "locality": "Siliguri", "postcode": "734001", "region": "WB", "country": "IN"}],
        "category": "hvac_service",
        "hierarchy": ["services_and_business", "home_service", "hvac_service"],
        "alternates": ["appliance_repair_service"],
        "confidence": 0.41,
        "operating_status": None,
        "lat": 26.7338,
        "lon": 88.4325,
    }
    row.update(over)
    return row


def test_every_rule_maps_to_a_real_dialnfind_category(rules, settings):
    categories = load_dialnfind_categories((ROOT / settings.dialnfind_categories).resolve())
    assert mapping_errors(rules, categories) == []
    covered = {(r.dialnfind_category, r.dialnfind_subcategory) for r in rules}
    for cat, subs in categories.items():
        assert (cat, "") in covered, f"no category-level rule for {cat}"
        for sub in subs:
            assert (cat, sub) in covered, f"no rule for {cat}/{sub}"


def test_mapping_errors_reports_unknown_slugs(rules):
    assert mapping_errors(rules[:1], {"plumbing": set()}) == [f"{rules[0].name}: unknown category 'electronics-repair'"]


def test_overture_place_to_record():
    rec = place_to_record(overture_row(), LOCATION, PROFILE, blocked_domains=["facebook.com"], min_confidence=0.3)
    assert rec is not None
    assert rec.record_key == "overture:08f1" and rec.source_name == "overture"
    assert rec.phones == ["+919933000001"]
    assert rec.website == "https://coolcare.example/"  # blocked social link skipped
    assert rec.city == "Siliguri" and rec.state == "West Bengal" and rec.pincode == "734001"
    assert rec.locality == "Sevoke Road"
    assert "overture=hvac_service" in rec.evidence.osm_tags and "overture=home_service" in rec.evidence.osm_tags
    assert (rec.latitude, rec.longitude) == (26.7338, 88.4325)


def test_overture_drops_closed_and_low_confidence():
    common = dict(location=LOCATION, profile=PROFILE, blocked_domains=[], min_confidence=0.3)
    assert place_to_record(overture_row(operating_status="permanently_closed"), **common) is None
    assert place_to_record(overture_row(confidence=0.1), **common) is None


def test_overture_unknown_locality_stays_in_target_city():
    row = overture_row(addresses=[{"freeform": "NH 31", "locality": "Dagapur", "postcode": "", "region": "", "country": "IN"}])
    rec = place_to_record(row, LOCATION, PROFILE, blocked_domains=[], min_confidence=0.3)
    assert rec.city == "Siliguri" and rec.locality == "Dagapur" and rec.state == "West Bengal"
    assert rec.field_sources["city"] == "derived:bbox"


def test_overture_source_reads_local_parquet(tmp_path, settings, rules):
    src = tmp_path / "places.parquet"
    con = duckdb.connect()
    con.execute(
        f"""COPY (
          SELECT * FROM (VALUES
            ('a1', {{'primary': 'Cool Care AC Service'}}, ['+919933000001'], NULL::VARCHAR[], NULL::VARCHAR[],
             [{{'freeform': '12 Sevoke Road', 'locality': 'Siliguri', 'postcode': '734001', 'region': 'WB', 'country': 'IN'}}],
             {{'primary': 'hvac_service', 'hierarchy': ['home_service', 'hvac_service'], 'alternates': NULL::VARCHAR[]}},
             0.8, NULL, {{'xmin': 88.43, 'xmax': 88.43, 'ymin': 26.73, 'ymax': 26.73}}),
            ('a2', {{'primary': 'City Bakery'}}, ['+919933000002'], NULL, NULL, NULL,
             {{'primary': 'bakery', 'hierarchy': ['bakery'], 'alternates': NULL}},
             0.9, NULL, {{'xmin': 88.44, 'xmax': 88.44, 'ymin': 26.72, 'ymax': 26.72}}),
            ('a3', {{'primary': 'Far Away Plumber'}}, ['+919933000003'], NULL, NULL, NULL,
             {{'primary': 'plumbing', 'hierarchy': ['plumbing'], 'alternates': NULL}},
             0.9, NULL, {{'xmin': 80.0, 'xmax': 80.0, 'ymin': 20.0, 'ymax': 20.0}})
          ) t(id, names, phones, websites, emails, addresses, taxonomy, confidence, operating_status, bbox)
        ) TO '{src}' (FORMAT parquet)"""
    )
    con.close()
    settings = load_settings(ROOT / "config.yaml")
    settings.output_dir = str(tmp_path)
    settings.osm.bbox = [26.6, 88.3, 26.8, 88.5]
    settings.overture.base_url = str(src)
    state = StateStore(":memory:")
    crawler = Crawler(settings, None)
    ctx = SourceContext(settings, crawler, state, {r.name: r for r in rules}, LOCATION)
    try:
        found = OvertureSource(ctx).discover("once:overture", LOCATION, "")
    finally:
        crawler.close()
        state.close()
    assert [c.prefilled.record_key for c in found] == ["overture:a1"]  # bakery unmatched, plumber outside the box
    assert list(tmp_path.glob("overture_*.parquet"))  # extract cached for the next run


def test_fsq_to_record():
    row = {
        "fsq_place_id": "4b5",
        "name": "Sparkfix Electricals",
        "latitude": 26.71,
        "longitude": 88.42,
        "address": "Hill Cart Road",
        "locality": "Siliguri",
        "region": "West Bengal",
        "postcode": "734001",
        "tel": "098320 12345",
        "website": None,
        "email": "hello@sparkfix.example",
        "fsq_category_labels": ["Business and Professional Services > Home Improvement Service > Electrician"],
    }
    rec = fsq_to_record(row, LOCATION, PROFILE, blocked_domains=[])
    assert rec.record_key == "fsq:4b5" and rec.phones == ["+919832012345"]
    assert "fsq=electrician" in rec.evidence.osm_tags
    assert rec.emails == ["hello@sparkfix.example"]


@pytest.mark.parametrize(
    ("name", "tags", "expected"),
    [
        # Shared shop tag: the name decides the specific service.
        ("Mac & i Laptop & Desktop Repair", ["craft=electronics_repair"], "Laptop & Computer Repair"),
        ("Palash Mobile Repairing", ["craft=electronics_repair"], "Mobile Phone Repair"),
        ("Crystal Electronics", ["craft=electronics_repair"], "Electronics Repair"),
        # A specific strong tag beats a generic tag plus a name word.
        ("New Darpan men's salon", ["overture=barber", "overture=personal_or_beauty_service"], "Men's Grooming"),
        ("Mobile Medical", ["amenity=pharmacy"], ""),
    ],
)
def test_classification_regressions(rules, name, tags, expected):
    assert classify(name, Evidence(osm_tags=tags), rules).primary_category == expected


def test_food_places_are_not_garages(rules):
    result = classify("Brothers Garage Restaurant", Evidence(osm_tags=["overture=restaurant"]), rules)
    assert result.primary_category != "Vehicle Repair"


def provider(**over):
    p = Provider(
        provider_name="Cool Care AC Service",
        primary_category="AC Repair & Service",
        secondary_categories=["Refrigerator Repair", "Home Appliances"],
        category_evidence="evidence",
        phone="+919933000001",
        email="",
        website="https://coolcare.example",
        address="12 Sevoke Road",
        locality="Sevoke Road",
        city="Siliguri",
        state="West Bengal",
        pincode="734001",
        latitude=26.7338123456,
        longitude=88.4325,
        hours_structured=[
            {"day": "Mo", "opens": "09:00", "closes": "13:00"},
            {"day": "Mo", "opens": "14:00", "closes": "20:00"},
            {"day": "Su", "opens": "10:00", "closes": "14:00"},
        ],
        record_keys=["overture:08f1", "osm:node/42", "website:coolcare.example"],
        source_urls=["https://coolcare.example/contact"],
    )
    for k, v in over.items():
        setattr(p, k, v)
    return p


def test_bundle_record_shape(rules):
    rec = bundle_record(provider(), {r.name: r for r in rules})
    assert rec["email"] is None  # no email is fine: the owner adds one after claiming
    assert rec["services"] == [
        {"category": "home-appliances", "subcategory": "ac-repair-and-service", "primary": True},
        {"category": "home-appliances", "subcategory": "refrigerator-repair", "primary": False},
    ]  # the category-level "Home Appliances" adds nothing next to specific services
    hours = {h["dayOfWeek"]: h for h in rec["hours"]}
    assert hours[1] == {"dayOfWeek": 1, "openTime": "09:00", "closeTime": "20:00", "is24x7": False}  # lunch break merged
    assert hours[0]["openTime"] == "10:00" and hours[2]["openTime"] is None  # Sunday open, Tuesday closed
    assert rec["latitude"] == 26.733812
    assert rec["sources"] == [
        {"key": "overture:08f1", "type": "overture", "url": None},
        {"key": "osm:node/42", "type": "osm", "url": "https://www.openstreetmap.org/node/42"},
        {"key": "website:coolcare.example", "type": "website", "url": "https://coolcare.example/contact"},
    ]


@pytest.mark.parametrize(
    "over",
    [
        {"phone": "", "additional_phones": []},
        {"phone": "+15551234567", "additional_phones": []},
        {"latitude": None},
        {"category_evidence": "weak"},
        {"primary_category": "Unknown rule", "secondary_categories": []},
    ],
)
def test_bundle_skips_unusable_records(rules, over):
    assert bundle_record(provider(**over), {r.name: r for r in rules}) is None


def test_bundle_keeps_name_evidence_and_falls_back_to_additional_phone(rules):
    rec = bundle_record(provider(category_evidence="name", phone="+15551234567", additional_phones=["+919800000001"]),
                        {r.name: r for r in rules})
    assert rec["phone"] == "+919800000001"


def test_clean_business_name():
    stuffed = "SMART SERVICE CENTER - AC repair & service in siliguri,microwave, refrigerator, washing machine"
    assert clean_business_name(stuffed) == "SMART SERVICE CENTER"
    assert clean_business_name("Sharma TV Repair") == "Sharma TV Repair"


def test_write_bundle(tmp_path, rules):
    path = tmp_path / "providers-siliguri.json"
    written, skipped = write_bundle([provider(), provider(phone="", record_keys=["osm:node/1"])], rules, path,
                                    LOCATION, ["credit"])
    data = json.loads(path.read_text())
    assert written == 1 and skipped == {"no valid Indian phone": 1}
    assert data["format"] == "dialnfind-providers/1" and data["count"] == 1
    assert data["attribution"] == ["credit"] and data["location"]["city"] == "Siliguri"
