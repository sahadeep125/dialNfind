import httpx

from dialnfind.config import Settings
from dialnfind.crawler import Crawler
from dialnfind.models import Location
from dialnfind.sources.base import SourceContext
from dialnfind.sources.osm import OSMSource, build_overpass_query, element_matches, element_to_record, pad_bbox
from dialnfind.state import StateStore

LOC = Location("Siliguri", "West Bengal", "India")
PROFILE = {"localities": ["Hakimpara"]}
BBOX = (26.64, 88.38, 26.79, 88.49)


def test_small_grouped_bbox_query():
    ql = build_overpass_query(
        BBOX, ["craft=hvac", "craft=hvac", "craft=plumber", "shop=computer", "shop=mobile_phone"], ["cctv", "laptop"]
    )
    assert ql.startswith("[out:json][timeout:90][bbox:26.64,88.38,26.79,88.49];")
    assert 'nwr["craft"~"^(hvac|plumber)$"];' in ql  # one statement per key, duplicates removed
    assert 'nwr["shop"~"^(computer|mobile_phone)$"];' in ql
    assert 'nwr["name"~"cctv|laptop",i];' in ql
    assert "around" not in ql and "area" not in ql
    assert len(ql.splitlines()) <= 8


def test_pad_bbox_widens_box():
    s, w, n, e = pad_bbox(BBOX, 2)
    assert s < 26.64 and w < 88.38 and n > 26.79 and e > 88.49
    assert round(26.64 - s, 3) == 0.018  # 2 km / 111 km per degree


def _source(handler, **osm):
    settings = Settings()
    for k, v in osm.items():
        setattr(settings.osm, k, v)
    state = StateStore(":memory:")
    crawler = Crawler(settings, None, transport=httpx.MockTransport(handler), sleep=lambda _s: None)
    return OSMSource(SourceContext(settings, crawler, state, {}, LOC)), state


def test_bbox_from_config_skips_lookup():
    calls = []
    source, _ = _source(lambda r: calls.append(r.url) or httpx.Response(500), bbox=list(BBOX))
    assert source._bbox(LOC) == BBOX
    assert calls == []


def test_bbox_from_nominatim_is_cached():
    calls = []

    def handler(request):
        calls.append(request.url.host)
        return httpx.Response(200, json=[{"boundingbox": ["26.6597", "26.7684", "88.3981", "88.4687"]}])

    source, state = _source(handler, bbox_padding_km=0)
    assert source._bbox(LOC) == (26.6597, 88.3981, 26.7684, 88.4687)
    again, _ = _source(handler, bbox_padding_km=0)
    again.ctx.state = state
    assert again._bbox(LOC) == (26.6597, 88.3981, 26.7684, 88.4687)
    assert calls == ["nominatim.openstreetmap.org"]


def test_busy_endpoint_falls_through_to_next():
    calls = []

    def handler(request):
        calls.append(request.url.host)
        if request.url.host == "busy.example":
            return httpx.Response(200, text="<html>The server is probably too busy</html>")
        return httpx.Response(200, json={"elements": [{"type": "node", "id": 1, "lat": 26.7, "lon": 88.4,
                                                       "tags": {"name": "A", "craft": "hvac"}}]})

    source, _ = _source(handler, bbox=list(BBOX), endpoints=["https://busy.example/api", "https://ok.example/api"])
    assert len(source._all_elements(LOC)) == 1
    assert calls == ["busy.example", "ok.example"]  # one attempt each, no retries


def test_element_matching():
    el = {"tags": {"name": "Secure CCTV World", "shop": "electronics"}}
    assert element_matches(el, ["shop=electronics"])
    assert not element_matches(el, ["craft=plumber"])
    assert element_matches(el, ["craft=plumber"], "cctv")


def test_element_to_record_uses_only_tags_present():
    el = {"type": "node", "id": 7, "lat": 26.71, "lon": 88.42,
          "tags": {"name": "Sharma Plumbing Works", "craft": "plumber", "phone": "+91 99330 00003; 9876543210",
                   "addr:suburb": "Hakimpara", "website": "https://www.facebook.com/sharma"}}
    rec = element_to_record(el, LOC, PROFILE, category="Plumber", query="Plumber Siliguri", blocked_domains=["facebook.com"])
    assert rec.phones == ["+919933000003"]  # placeholder dropped
    assert rec.website == ""  # social page is not treated as the business website
    assert rec.locality == "Hakimpara" and rec.pincode == ""
    assert rec.city == "Siliguri" and rec.field_sources["city"] == "derived:osm_bbox"
    assert rec.source_url == "https://www.openstreetmap.org/node/7"
    assert "craft=plumber" in rec.evidence.osm_tags
    assert element_to_record({"type": "node", "id": 8, "tags": {"craft": "plumber"}}, LOC, PROFILE,
                             category="Plumber", query="", blocked_domains=[]) is None  # unnamed -> skipped
