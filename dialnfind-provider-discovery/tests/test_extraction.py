from pathlib import Path

from dialnfind.config import ExtractionSettings
from dialnfind.extraction import (
    address_from_lines,
    build_website_record,
    hours_from_lines,
    name_from_title,
    parse_page,
    phones_from_text,
    select_follow_links,
)
from dialnfind.models import Location

FIX = Path(__file__).parent / "fixtures"
LOC = Location("Siliguri", "West Bengal", "India")
PROFILE = {"aliases": ["Shiliguri"], "localities": ["Pradhan Nagar", "Hill Cart Road", "Sevoke Road"]}


def _page(html: str, url: str = "https://biz.example/"):
    return parse_page(html, url)


def test_jsonld_local_business_in_graph():
    page = _page((FIX / "coolcare/index.html").read_text(), "https://coolcare-appliances.example/")
    assert len(page.businesses) == 1
    biz = page.businesses[0]
    assert biz.name == "CoolCare Appliances"
    assert biz.phones == ["+919933000001"]
    assert biz.emails == ["info@coolcare-appliances.example"]
    assert biz.postal_code == "734001"
    assert biz.address_locality == "Siliguri"
    assert (biz.latitude, biz.longitude) == (26.7271, 88.4290)
    assert biz.opening_hours == "Mo-Sa 09:00-20:00"
    assert "AC Installation" in biz.services and "Gas Refilling" in biz.services
    assert "HVACBusiness" in page.structured_types


def test_jsonld_list_payload_and_string_types_and_trailing_comma():
    html = """<script type="application/ld+json">[
      {"@type": "schema:Plumber", "name": "Pipe Pros", "telephone": ["0353 255 0199"],
       "address": "7 Burdwan Road, Siliguri 734005", "openingHours": ["Mo-Fr 09:00-18:00"],},
      {"@type": "BreadcrumbList", "name": "nav"}
    ]</script>"""
    page = _page(html)
    assert [b.name for b in page.businesses] == ["Pipe Pros"]
    biz = page.businesses[0]
    assert biz.phones == ["+913532550199"]
    assert biz.postal_code == "734005"
    assert biz.opening_hours == "Mo-Fr 09:00-18:00"


def test_invalid_jsonld_is_ignored():
    page = _page('<script type="application/ld+json">{not json</script><title>X</title>')
    assert page.businesses == []


def test_microdata_business():
    html = """<div itemscope itemtype="https://schema.org/Electrician">
      <span itemprop="name">Volt Masters</span>
      <span itemprop="telephone">+91 99330 00010</span>
      <span itemprop="postalCode">734003</span></div>"""
    page = _page(html)
    assert page.businesses[0].name == "Volt Masters"
    assert page.businesses[0].phones == ["+919933000010"]
    assert page.businesses[0].source == "microdata"


def test_whatsapp_only_from_explicit_links():
    page = _page((FIX / "coolcare/contact.html").read_text(), "https://coolcare-appliances.example/contact-us")
    assert page.whatsapp_numbers == ["+919933000002"]
    assert page.tel_links == ["+919933000001"]


def test_phone_from_text_rejects_placeholders():
    assert phones_from_text("Call 98765 43210 or +91 99330 00021 today") == ["+919933000021"]


def test_address_from_text_lines():
    lines = ["Contact", "Address: 45 Hill Cart Road, Pradhan Nagar, Siliguri, West Bengal 734003", "Phone"]
    address, pin = address_from_lines(lines, ["Siliguri"])
    assert address == "45 Hill Cart Road, Pradhan Nagar, Siliguri, West Bengal 734003"
    assert pin == "734003"


def test_pincode_not_invented_without_address_context():
    address, pin = address_from_lines(["Invoice 734001 paid", "Thanks"], ["Siliguri"])
    assert (address, pin) == ("", "")


def test_hours_text_normalized():
    assert hours_from_lines(["Timings: Mon - Sat 10:00 AM - 7:00 PM"]) == "Mo-Sa 10:00-19:00"


def test_name_from_title_prefers_segment_matching_domain():
    assert name_from_title("Best AC Repair in Siliguri | CoolCare", "coolcare.in") == "CoolCare"
    assert name_from_title("Home | Best AC Repair in Siliguri", "xyz123.in") == ""


def test_follow_links_prioritise_contact_and_skip_blog():
    page = _page((FIX / "coolcare/index.html").read_text(), "https://coolcare-appliances.example/")
    links = select_follow_links(page, 4)
    assert links[0] == "https://coolcare-appliances.example/contact-us"
    assert "https://coolcare-appliances.example/services" in links
    assert not any("blog" in link for link in links)
    assert not any("facebook" in link for link in links)


def _build(pages):
    return build_website_record(
        pages, site_url="https://coolcare-appliances.example/", location=LOC, profile=PROFILE,
        extraction=ExtractionSettings(),
    )


def test_structured_data_preferred_and_map_coordinates_ignored():
    home = _page((FIX / "coolcare/index.html").read_text(), "https://coolcare-appliances.example/")
    contact = _page((FIX / "coolcare/contact.html").read_text(), "https://coolcare-appliances.example/contact-us")
    rec = _build([home, contact])
    assert rec.provider_name == "CoolCare Appliances"
    assert rec.field_sources["provider_name"] == "json-ld"
    assert rec.phones == ["+919933000001"]  # placeholder 9876543210 on the page is dropped
    assert rec.whatsapp == "+919933000002"
    assert rec.emails == ["info@coolcare-appliances.example"]
    assert rec.city == "Siliguri" and rec.pincode == "734001" and rec.state == "West Bengal"
    assert (rec.latitude, rec.longitude) == (26.7271, 88.4290)  # not the Google Maps iframe values
    assert rec.has_structured_data


def test_text_only_site_extraction():
    home = _page((FIX / "sparkfix/index.html").read_text(), "https://sparkfix-electricals.example/")
    contact = _page((FIX / "sparkfix/contact.html").read_text(), "https://sparkfix-electricals.example/contact.html")
    rec = build_website_record(
        [home, contact], site_url="https://sparkfix-electricals.example/", location=LOC, profile=PROFILE,
        extraction=ExtractionSettings(),
    )
    assert rec.provider_name == "Sparkfix Electricals"
    assert rec.phones == ["+913532550101"]
    assert rec.pincode == "734003"
    assert rec.locality == "Pradhan Nagar"
    assert rec.opening_hours == "Mo-Sa 10:00-19:00"
    assert rec.latitude is None  # nothing explicit -> nothing invented
    assert not rec.has_structured_data


def test_missing_fields_stay_empty():
    rec = _build([_page("<html><head><title>CoolCare</title></head><body>Hello</body></html>")])
    assert rec.phones == [] and rec.address == "" and rec.pincode == "" and rec.whatsapp == ""
    assert rec.latitude is None and rec.opening_hours == ""
