"""Offline mock of the web for tests and the example output.

All businesses, numbers and domains here are FICTIONAL. Domains use the reserved
``.example`` TLD (RFC 2606) so nothing can ever resolve to a real site.
"""

from __future__ import annotations

from pathlib import Path
from urllib.parse import parse_qs

import httpx

FIXTURES = Path(__file__).parent
# Policy violations observed by the mock web (tests assert this stays empty).
VIOLATIONS: list[str] = []
_HTML = {"content-type": "text/html; charset=utf-8"}

OVERPASS_ELEMENTS = {
    "hvac": [
        {
            "type": "node", "id": 1001, "lat": 26.7272, "lon": 88.4291,
            "tags": {"name": "Cool Care AC Services", "craft": "hvac", "phone": "+91 99330 00001",
                     "addr:street": "Sevoke Road", "addr:city": "Siliguri", "addr:postcode": "734001"},
        },
        {
            "type": "node", "id": 1003, "lat": 26.8012, "lon": 88.3975,
            "tags": {"name": "Cool Care Appliance", "craft": "hvac", "phone": "+91 99330 00004"},
        },
    ],
    "plumber": [
        {
            "type": "node", "id": 1002, "lat": 26.7155, "lon": 88.4232,
            "tags": {"name": "Sharma Plumbing Works", "craft": "plumber", "phone": "+91 99330 00003",
                     "addr:suburb": "Hakimpara", "opening_hours": "Mo-Sa 08:00-19:00"},
        },
    ],
    "electrician": [
        {
            "type": "way", "id": 2004, "center": {"lat": 26.7101, "lon": 88.4302},
            "tags": {"name": "Sparkfix Electricals", "craft": "electrician",
                     "website": "https://sparkfix-electricals.example"},
        },
    ],
}


def _read(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def _html(body: str, status: int = 200) -> httpx.Response:
    return httpx.Response(status, headers=_HTML, text=body)


def handler(request: httpx.Request) -> httpx.Response:
    host, path = request.url.host, request.url.path
    if host == "nominatim.openstreetmap.org":
        return httpx.Response(200, json=[{"boundingbox": ["26.6597686", "26.7684340", "88.3981000", "88.4687573"]}])
    if host == "overpass-api.de":
        query = parse_qs(request.content.decode())["data"][0]
        elements = [el for marker, els in OVERPASS_ELEMENTS.items() if marker in query for el in els]
        return httpx.Response(200, json={"elements": elements})

    if host == "coolcare-appliances.example":
        routes = {
            "/robots.txt": "User-agent: *\nDisallow: /private/\n",
            "/": _read("coolcare/index.html"),
            "/contact-us": _read("coolcare/contact.html"),
            "/services": "<html><head><title>Services</title></head><body><h1>AC Cleaning</h1>"
                         "<p>Jet cleaning and AC servicing.</p></body></html>",
        }
        if path in routes:
            if path == "/robots.txt":
                return httpx.Response(200, text=routes[path])
            return _html(routes[path])
        if path.startswith("/private/"):
            VIOLATIONS.append(f"fetched robots-disallowed {request.url}")
        return _html("not found", 404)

    if host == "sparkfix-electricals.example":
        routes = {
            "/": _read("sparkfix/index.html"),
            "/contact.html": _read("sparkfix/contact.html"),
            "/about.html": "<html><body><h1>About Sparkfix</h1><p>Electrician since 2009.</p></body></html>",
        }
        return _html(routes[path]) if path in routes else _html("not found", 404)

    if host == "robots-disallow.example":
        if path == "/robots.txt":
            return httpx.Response(200, text="User-agent: *\nDisallow: /\n")
        VIOLATIONS.append(f"ignored Disallow: / at {request.url}")
        return _html("should not be fetched")

    if host == "protected.example":
        if path == "/robots.txt":
            return httpx.Response(404)
        return _html("<html><title>Just a moment...</title><body>cf-chl challenge</body></html>", 403)

    if host == "sweet-treats-bakery.example":
        if path == "/robots.txt":
            return httpx.Response(404)
        return _html(
            "<html><head><title>Sweet Treats Bakery | Cakes in Siliguri</title></head><body>"
            "<h1>Sweet Treats Bakery</h1><p>Birthday cakes, pastries and cookies.</p>"
            "<p>Call <a href='tel:+919933000005'>+91 99330 00005</a></p></body></html>"
        )

    if host.endswith("facebook.com"):
        VIOLATIONS.append(f"contacted blocked domain {request.url}")
    return httpx.Response(404)


def transport() -> httpx.MockTransport:
    return httpx.MockTransport(handler)


MANUAL_URLS = """\
# fictional fixture sites
https://coolcare-appliances.example/
https://sparkfix-electricals.example/, Electrician
https://robots-disallow.example/
https://protected.example/
https://sweet-treats-bakery.example/
https://www.facebook.com/some-business-page
"""

