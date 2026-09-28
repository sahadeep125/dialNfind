from dialnfind.classification import ClassificationResult, build_rules, classify
from dialnfind.config import load_settings
from dialnfind.models import Evidence, Location, Provider
from dialnfind.scoring import quality_score, relevance_score, source_confidence

LOC = Location("Siliguri", "West Bengal", "India")
SETTINGS = load_settings(None)
RULES = build_rules(["AC Repair", "Electrician", "Plumber"], {
    "AC Repair": {
        "keywords": ["ac repair", "air conditioner repair", "ac service"],
        "osm_tags": ["craft=hvac"],
        "services": {"AC Installation": ["ac installation"], "Gas Refilling": ["gas refilling"]},
    },
    "Electrician": {"keywords": ["electrician", "electrical repair"]},
})


def full_provider(**kw) -> Provider:
    base = dict(
        provider_name="CoolCare Appliances", phone="+919933000001", website="https://coolcare.example/",
        address="12 Sevoke Road, Siliguri 734001", city="Siliguri", opening_hours="Mo-Sa 09:00-20:00",
        latitude=26.72, longitude=88.43, description="AC repair", has_structured_data=True,
        source_types=["website"], primary_category="AC Repair",
    )
    base.update(kw)
    return Provider(**base)


def test_classification_primary_and_secondary():
    ev = Evidence(meta="CoolCare | AC repair in Siliguri",
                  body="We do AC repair, AC installation, gas refilling and AC cleaning.")
    cls = classify("CoolCare Appliances", ev, RULES)
    assert cls.primary_category == "AC Repair"
    assert cls.secondary_categories[:2] == ["AC Installation", "Gas Refilling"]
    assert not cls.name_only


def test_name_alone_is_weak_evidence():
    cls = classify("Siliguri AC Repair Centre", Evidence(body="Welcome to our website"), RULES)
    assert cls.name_only or not cls.primary_category
    p = Provider(provider_name="Siliguri AC Repair Centre")
    score, parts = relevance_score(p, cls, LOC)
    assert score < 30
    assert parts.get("category_match", 0) <= 10


def test_osm_tag_counts_as_category_evidence():
    cls = classify("Some Shop", Evidence(osm_tags=["craft=hvac"]), RULES)
    assert cls.primary_category == "AC Repair" and not cls.name_only


def test_unrelated_business_gets_no_category():
    cls = classify("Sweet Treats Bakery", Evidence(body="Birthday cakes and pastries in Siliguri"), RULES)
    assert cls.primary_category == ""


def test_relevance_full_evidence():
    cls = classify("CoolCare", Evidence(meta="AC repair Siliguri", body="AC repair and gas refilling"), RULES)
    score, parts = relevance_score(full_provider(), cls, LOC)
    assert score == 100
    assert parts["category_match"] == 30 and parts["city_match"] == 20 and parts["service_match"] == 15


def test_relevance_components_add_up():
    cls = ClassificationResult(primary_category="AC Repair", outside_name_score=6, matched_keywords=["ac repair"])
    p = Provider(provider_name="X", phone="+919933000001", city="Siliguri")
    score, parts = relevance_score(p, cls, LOC)
    assert parts == {"category_match": 30, "city_match": 20, "phone": 10}
    assert score == 60


def test_city_mention_only_gets_half_credit():
    cls = ClassificationResult(primary_category="AC Repair", outside_name_score=6)
    p = Provider(provider_name="X", evidence=Evidence(body="We serve customers across Siliguri"))
    _, parts = relevance_score(p, cls, LOC)
    assert parts["city_match"] == 10


def test_quality_score():
    p = full_provider()
    p.source_confidence = source_confidence(p)
    assert p.source_confidence == "high"
    score, _ = quality_score(p)
    assert score == 100
    sparse = Provider(provider_name="X")
    assert quality_score(sparse)[0] == 20


def test_source_confidence_levels():
    assert source_confidence(Provider(source_types=["website"], has_structured_data=True)) == "high"
    assert source_confidence(Provider(source_types=["website", "osm"], phone="+919933000001")) == "high"
    assert source_confidence(Provider(source_types=["osm"], phone="+919933000001")) == "medium"
    assert source_confidence(Provider(source_types=["manual"])) == "low"


def test_config_rules_load_for_all_categories():
    settings = load_settings("config.yaml")
    categories = [line.strip() for line in open("categories.txt") if line.strip() and not line.startswith("#")]
    rules = build_rules(categories, settings.category_rules)
    assert len(rules) == len(categories)
    assert all(len(r.keywords) >= 2 for r in rules)
    assert build_rules(["Pest Control"], {})[0].keywords[0] == "pest control"  # auto rule


def test_retail_osm_tag_is_weak_unless_name_corroborates():
    rules = build_rules(["Mobile Repair"], {"Mobile Repair": {
        "keywords": ["mobile repair", "mobile repairing"], "osm_tags": ["craft=electronics_repair"],
        "osm_weak_tags": ["shop=mobile_phone"]}})
    shop_only = classify("Cashify", Evidence(osm_tags=["shop=mobile_phone"]), rules)
    assert shop_only.primary_category == "Mobile Repair" and shop_only.name_only  # -> review, 10 pts
    corroborated = classify("City Mobile Repairing", Evidence(osm_tags=["shop=mobile_phone"]), rules)
    assert corroborated.primary_category == "Mobile Repair" and not corroborated.name_only
    strong = classify("Fixit", Evidence(osm_tags=["craft=electronics_repair"]), rules)
    assert not strong.name_only
