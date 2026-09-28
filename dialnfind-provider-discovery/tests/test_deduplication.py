from dialnfind.config import DedupSettings
from dialnfind.deduplication import deduplicate, merge_records, name_similarity
from dialnfind.models import RawRecord
from dialnfind.normalization import core_name

SETTINGS = DedupSettings(shared_hosting_domains=["blogspot.com"])
PRIORITY = ["website", "osm", "directory", "search_api", "manual"]


def rec(key, name, source="website", **kw):
    return RawRecord(source_name=source, source_url=f"https://{key}.example/", provider_name=name, record_key=key, **kw)


def test_coolcare_name_variants_are_similar():
    names = ["Cool Care Appliances", "CoolCare Appliance Services", "Cool Care AC Services"]
    cores = [core_name(n) for n in names]
    for a in cores:
        for b in cores:
            assert name_similarity(a, b) >= 92


def test_same_phone_is_strong_duplicate():
    result = deduplicate(
        [rec("a", "CoolCare", phones=["+919933000001"]),
         rec("b", "Totally Different Name", source="osm", phones=["+919933000001"])],
        SETTINGS, PRIORITY,
    )
    assert len(result.providers) == 1
    assert result.merged_away == 1


def test_name_plus_locality_merges():
    result = deduplicate(
        [rec("a", "Cool Care Appliances", locality="Pradhan Nagar"),
         rec("b", "CoolCare Appliance Services", source="osm", locality="Pradhan Nagar"),
         rec("c", "Cool Care AC Services", source="directory", pincode="734001", locality="Pradhan Nagar")],
        SETTINGS, PRIORITY,
    )
    assert len(result.providers) == 1
    assert result.providers[0].merged_record_count == 3


def test_low_confidence_match_is_flagged_not_merged():
    result = deduplicate(
        [rec("a", "Cool Care Appliances", pincode="734001"),
         rec("b", "CoolCare Appliance Services", source="osm")],  # no location agreement
        SETTINGS, PRIORITY,
    )
    assert len(result.providers) == 2
    assert all(p.duplicate_candidate for p in result.providers)
    assert result.providers[0].duplicate_group_id == result.providers[1].duplicate_group_id


def test_conflicting_phones_prevent_fuzzy_merge():
    result = deduplicate(
        [rec("a", "Cool Care", pincode="734001", phones=["+919933000001"]),
         rec("b", "Cool Care", source="osm", pincode="734001", phones=["+919933000004"])],
        SETTINGS, PRIORITY,
    )
    assert len(result.providers) == 2
    assert all(p.duplicate_candidate for p in result.providers)


def test_different_businesses_not_matched():
    result = deduplicate(
        [rec("a", "Sharma Plumbing Works", pincode="734001"), rec("b", "Verma Electricals", pincode="734001")],
        SETTINGS, PRIORITY,
    )
    assert len(result.providers) == 2
    assert not any(p.duplicate_candidate for p in result.providers)


def test_same_domain_merges_but_shared_hosting_does_not():
    same_site = deduplicate(
        [rec("a", "Sparkfix", website="https://sparkfix.example/"),
         rec("b", "Sparkfix Electricals", source="osm", website="https://www.sparkfix.example/contact")],
        SETTINGS, PRIORITY,
    )
    assert len(same_site.providers) == 1
    shared = deduplicate(
        [rec("a", "Alpha Plumbing", website="https://alpha.blogspot.com/"),
         rec("b", "Beta Painting", website="https://beta.blogspot.com/")],
        SETTINGS, PRIORITY,
    )
    assert len(shared.providers) == 2


def test_merge_prefers_priority_and_never_overwrites_with_empty():
    website = rec("w", "CoolCare Appliances", phones=["+919933000001"], address="", website="https://coolcare.example/",
                  opening_hours="Mo-Sa 09:00-20:00")
    osm = rec("o", "Cool Care AC", source="osm", phones=["+919933000001", "+919933000009"],
              address="Sevoke Road, Siliguri", city="Siliguri", pincode="734001", latitude=26.72, longitude=88.43)
    p = merge_records([osm, website], PRIORITY)
    assert p.provider_name == "CoolCare Appliances"  # website outranks OSM
    assert p.address == "Sevoke Road, Siliguri"  # empty website address doesn't win
    assert p.pincode == "734001" and p.latitude == 26.72
    assert p.phone == "+919933000001" and p.additional_phones == ["+919933000009"]
    assert p.source_types == ["website", "osm"]
    assert len(p.source_urls) == 2
    assert p.hours_structured[0] == {"day": "Mo", "opens": "09:00", "closes": "20:00"}
