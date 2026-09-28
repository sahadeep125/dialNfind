import pytest

from dialnfind.normalization import (
    clean_phone,
    core_name,
    extract_emails,
    extract_pincodes,
    is_blocked,
    is_junk_phone,
    normalize_email,
    normalize_name,
    normalize_phone,
    normalize_pincode,
    normalize_url,
    parse_opening_hours,
    rank_emails,
    registrable_domain,
    site_key,
)


@pytest.mark.parametrize(
    "raw",
    ["+91 9876543210", "09876543210", "9876543210", "+91-98765-43210", "91 98765 43210",
     "(+91) 98765 43210", "0091 9876543210", "tel:+919876543210"],
)
def test_phone_formats_normalize_to_e164(raw):
    assert normalize_phone(raw) == "+919876543210"


def test_landline_with_std_code():
    assert normalize_phone("0353 255 0101") == "+913532550101"


@pytest.mark.parametrize("raw", ["", "12345", "not a phone", "+91 01234 56789", "734001", "2023-2024"])
def test_invalid_phones_rejected(raw):
    assert normalize_phone(raw) == ""


@pytest.mark.parametrize("raw", ["9999999999", "9876543210", "+91 12345 67890", "9123456789", "8888800000", "9812345678"])
def test_junk_placeholder_phones(raw):
    # 9876543210 is valid-looking but is the classic template placeholder
    assert is_junk_phone(normalize_phone(raw))
    assert clean_phone(raw) == ""


def test_real_looking_phone_is_not_junk():
    assert clean_phone("+91 99330 00001") == "+919933000001"


def test_email_normalization_and_junk():
    assert normalize_email("mailto:Info@CoolCare.in?subject=Hi") == "info@coolcare.in"
    assert normalize_email("someone@example.com") == ""
    assert normalize_email("noreply@business.in") == ""
    assert normalize_email("logo@2x.png") == ""
    assert normalize_email("not-an-email") == ""


def test_extract_emails_from_text():
    text = "Write to contact@acme-services.in or support@acme-services.in. Icon: sprite@2x.png"
    assert extract_emails(text) == ["contact@acme-services.in", "support@acme-services.in"]


def test_rank_emails_prefers_business_domain_and_drops_others():
    emails = ["ramesh.personal@gmail.com", "info@coolcare.in", "owner@coolcare.in"]
    assert rank_emails(emails, "www.coolcare.in") == ["info@coolcare.in", "owner@coolcare.in"]
    # without a domain email, free-mail business addresses are kept
    assert rank_emails(["shop@gmail.com"], "coolcare.in") == ["shop@gmail.com"]


@pytest.mark.parametrize("raw,expected", [("734001", "734001"), ("734 001", "734001"), ("034001", ""),
                                          ("73400", ""), ("7340011", ""), ("PIN", "")])
def test_pincode_validation(raw, expected):
    assert normalize_pincode(raw) == expected


def test_extract_pincodes_ignores_longer_numbers():
    text = "Sevoke Road, Siliguri - 734001. Order #98765432101. Alt PIN 734 003"
    assert extract_pincodes(text) == ["734001", "734003"]


def test_name_normalization():
    assert normalize_name("CoolCare Appliances Pvt. Ltd.") == "coolcare appliances"
    assert normalize_name("  Sharma & Sons  ") == "sharma and sons"
    assert normalize_name("Café Électrique") == "cafe electrique"


def test_core_name_strips_generic_words():
    assert core_name("Cool Care AC Services") == "cool care"
    assert core_name("CoolCare Appliance Services") == "coolcare"
    assert core_name("AC Repair Services") == "ac repair services"  # nothing distinctive -> keep all
    assert core_name("Siliguri Cool Point", {"Siliguri"}) == "cool"


def test_url_and_domain_helpers():
    assert normalize_url("CoolCare.in/contact#top") == "https://coolcare.in/contact"
    assert normalize_url("mailto:a@b.com") == ""
    assert registrable_domain("shop.coolcare.co.in") == "coolcare.co.in"
    assert site_key("https://a.blogspot.com/x", ["blogspot.com"]) == "a.blogspot.com"
    assert site_key("https://www.coolcare.in/about") == "coolcare.in"


@pytest.mark.parametrize(
    "url,blocked",
    [("https://www.google.com/maps/place/x", True), ("https://maps.google.co.in/", True),
     ("https://www.justdial.com/Siliguri", True), ("https://m.facebook.com/page", True),
     ("https://www.googleapis.com/customsearch/v1", False), ("https://coolcare.in", False)],
)
def test_blocklist(url, blocked):
    patterns = ["google.*", "justdial.com", "facebook.com"]
    assert is_blocked(url, patterns) is blocked


def test_parse_opening_hours():
    assert parse_opening_hours("Mo-We 09:00-18:00; Su 10:00-14:00") == [
        {"day": "Mo", "opens": "09:00", "closes": "18:00"},
        {"day": "Tu", "opens": "09:00", "closes": "18:00"},
        {"day": "We", "opens": "09:00", "closes": "18:00"},
        {"day": "Su", "opens": "10:00", "closes": "14:00"},
    ]
    assert len(parse_opening_hours("24/7")) == 7
    assert parse_opening_hours("call for timings") == []
