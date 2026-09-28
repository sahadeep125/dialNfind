"""Business information extraction from HTML pages.

Priority: JSON-LD (schema.org) > microdata > HTML meta > visible text.
Only values literally present on the page are extracted. Map embeds/links
(e.g. Google Maps iframes) are deliberately ignored as a coordinate source.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import parse_qs, urljoin, urlsplit

import phonenumbers
from bs4 import BeautifulSoup, Tag
from phonenumbers import Leniency, PhoneNumberFormat
from rapidfuzz import fuzz

from .config import ExtractionSettings
from .models import SOURCE_WEBSITE, Evidence, Location, RawRecord
from .normalization import (
    clean_phone,
    clean_text,
    day_code,
    extract_emails,
    extract_pincodes,
    format_day_range,
    host_of,
    normalize_email,
    normalize_name,
    normalize_pincode,
    normalize_url,
    rank_emails,
    registrable_domain,
    squash,
)

BUSINESS_TYPES = {
    "LocalBusiness", "Organization", "ProfessionalService", "HomeAndConstructionBusiness",
    "Electrician", "Plumber", "HVACBusiness", "GeneralContractor", "HousePainter", "Locksmith",
    "RoofingContractor", "MovingCompany", "EmergencyService", "Store", "ElectronicsStore",
    "HomeGoodsStore", "ComputerStore", "HardwareStore", "MobilePhoneStore", "AutoRepair",
    "Corporation", "OnlineBusiness", "DryCleaningOrLaundry", "FurnitureStore",
}
LOCAL_BUSINESS_HINTS = ("Business", "Store", "Contractor", "Service", "Electrician", "Plumber", "Painter", "Locksmith")
SERVICE_TYPES = {"Service", "Offer", "OfferCatalog", "Product"}
NESTED_KEYS = (
    "mainEntity", "about", "provider", "publisher", "brand", "itemListElement", "item",
    "seller", "location", "department", "subOrganization", "hasOfferCatalog",
    "makesOffer", "itemOffered", "hasPart",
)
GENERIC_TITLES = {
    "home", "homepage", "home page", "welcome", "index", "contact", "contact us", "about",
    "about us", "services", "our services", "official website", "untitled", "default",
}

ADDRESS_LABEL = re.compile(
    r"(?i)^\s*(?:our\s+)?(?:address|addr\.?|office(?:\s+address)?|shop(?:\s+address)?|store\s+address|"
    r"location|visit\s+us|reach\s+us|find\s+us|registered\s+office|head\s+office|workshop)\s*[:\-–]\s*"
)
ADDRESS_TOKENS = re.compile(
    r"(?i)\b(pin|pincode|p\.?\s?o\.?|road|rd\.?|more|para|nagar|street|st\.?|lane|near|opp\.?|"
    r"sarani|market|bazar|bazaar|colony|ward|dist\.?|district|west bengal|siliguri|building|floor)\b"
)
HOURS_LINE = re.compile(r"(?i)\b(hours|timings?|open(?:ing)?|working|business hours|office time)\b")
TIME_RE = r"\d{1,2}(?::\d{2})?\s*(?:[ap]\.?m\.?)"
TIME_OR_24 = rf"(?:{TIME_RE}|\d{{1,2}}:\d{{2}})"
DAY_WORD = r"(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*"
WHATSAPP_TEXT = re.compile(r"(?i)whats\s?app\W{0,5}(?:no\.?|number|us|chat)?\W{0,5}(\+?\d[\d\s\-()]{8,16}\d)")
LINK_KEYWORDS: dict[str, int] = {
    "contact": 10, "reach-us": 8, "find-us": 8, "location": 7, "service": 8, "what-we-do": 6,
    "about": 6, "branch": 6, "area": 5, "hours": 5, "timing": 5, "enquiry": 5, "support": 3,
}
LINK_NEGATIVE = (
    "blog", "news", "/tag", "/category", "/product", "cart", "checkout", "login", "signin",
    "sign-in", "register", "wp-admin", "wp-login", "privacy", "terms", "career", "job", "feed",
    "author", "cdn-cgi", "?replytocom", "/page/",
)
SKIP_EXTENSIONS = (
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".zip", ".rar", ".doc", ".docx",
    ".xls", ".xlsx", ".mp4", ".mp3", ".css", ".js", ".xml", ".ico",
)


@dataclass
class BusinessData:
    """Normalized view of one schema.org business entity."""

    name: str = ""
    types: list[str] = field(default_factory=list)
    phones: list[str] = field(default_factory=list)
    emails: list[str] = field(default_factory=list)
    url: str = ""
    street: str = ""
    address_locality: str = ""
    region: str = ""
    postal_code: str = ""
    country: str = ""
    full_address: str = ""
    latitude: float | None = None
    longitude: float | None = None
    opening_hours: str = ""
    description: str = ""
    services: list[str] = field(default_factory=list)
    source: str = "json-ld"

    def filled(self) -> int:
        return sum(
            bool(v)
            for v in (self.name, self.phones, self.emails, self.full_address, self.latitude, self.opening_hours)
        )

    def is_local(self) -> bool:
        return any(t != "Organization" and t != "Corporation" for t in self.types)


@dataclass
class PageData:
    url: str
    title: str = ""
    site_name: str = ""
    meta_description: str = ""
    headings: list[str] = field(default_factory=list)
    businesses: list[BusinessData] = field(default_factory=list)
    service_texts: list[str] = field(default_factory=list)
    structured_types: list[str] = field(default_factory=list)
    tel_links: list[str] = field(default_factory=list)
    mailto_links: list[str] = field(default_factory=list)
    whatsapp_numbers: list[str] = field(default_factory=list)
    lines: list[str] = field(default_factory=list)
    internal_links: list[tuple[str, str]] = field(default_factory=list)
    meta_geo: tuple[float, float] | None = None

    @property
    def text(self) -> str:
        return "\n".join(self.lines)


# ====================================================================== JSON-LD


def _loads_lenient(raw: str) -> Any:
    text = raw.strip()
    text = re.sub(r"^\s*(<!--|//\s*<!\[CDATA\[|<!\[CDATA\[)", "", text)
    text = re.sub(r"(-->|//\s*\]\]>|\]\]>)\s*$", "", text).strip()
    if not text:
        return None
    for candidate in (text, re.sub(r",\s*([}\]])", r"\1", text)):
        try:
            return json.loads(candidate, strict=False)
        except json.JSONDecodeError:
            continue
    return None


def schema_types(node: dict[str, Any]) -> list[str]:
    raw = node.get("@type", [])
    values = raw if isinstance(raw, list) else [raw]
    out = []
    for value in values:
        if isinstance(value, str) and value:
            out.append(re.sub(r"^(https?://schema\.org/|schema:)", "", value.strip()))
    return out


def iter_jsonld_nodes(soup: BeautifulSoup) -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    seen: set[int] = set()

    def walk(node: Any, depth: int = 0) -> None:
        if depth > 8:
            return
        if isinstance(node, list):
            for item in node:
                walk(item, depth + 1)
            return
        if not isinstance(node, dict):
            return
        if id(node) in seen:
            return
        seen.add(id(node))
        if "@graph" in node:
            walk(node["@graph"], depth + 1)
        if "@type" in node:
            nodes.append(node)
        for key in NESTED_KEYS:
            if key in node:
                walk(node[key], depth + 1)

    for script in soup.find_all("script", attrs={"type": re.compile(r"ld\+json", re.I)}):
        data = _loads_lenient(script.string or script.get_text() or "")
        if data is not None:
            walk(data)
    return nodes


def is_business_type(types: list[str]) -> bool:
    return any(t in BUSINESS_TYPES or t.endswith(("Business", "Store", "Contractor")) for t in types)


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def _text_value(value: Any) -> str:
    if isinstance(value, dict):
        return clean_text(value.get("name") or value.get("@value") or "")
    if isinstance(value, list):
        return _text_value(value[0]) if value else ""
    return clean_text(value)


def _float(value: Any) -> float | None:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def valid_coordinates(lat: float | None, lon: float | None) -> bool:
    return lat is not None and lon is not None and -90 <= lat <= 90 and -180 <= lon <= 180 and not (lat == 0 and lon == 0)


def format_hours_spec(specs: Any) -> str:
    """schema.org openingHoursSpecification -> "Mo-Sa 09:00-20:00; Su 10:00-14:00"."""
    grouped: dict[tuple[str, str], list[str]] = {}
    for spec in _as_list(specs):
        if not isinstance(spec, dict):
            continue
        opens, closes = str(spec.get("opens", ""))[:5], str(spec.get("closes", ""))[:5]
        if not re.fullmatch(r"\d{1,2}:\d{2}", opens) or not re.fullmatch(r"\d{1,2}:\d{2}", closes):
            continue
        for day in _as_list(spec.get("dayOfWeek")):
            code = day_code(_text_value(day))
            if code:
                grouped.setdefault((opens.zfill(5), closes.zfill(5)), []).append(code)
    parts = [f"{format_day_range(days)} {o}-{c}" for (o, c), days in grouped.items() if days]
    return "; ".join(parts)


def business_from_jsonld(node: dict[str, Any]) -> BusinessData:
    biz = BusinessData(name=_text_value(node.get("name") or node.get("legalName")), types=schema_types(node))
    for tel in _as_list(node.get("telephone")) + [
        cp.get("telephone") for cp in _as_list(node.get("contactPoint")) if isinstance(cp, dict)
    ]:
        phone = clean_phone(_text_value(tel))
        if phone and phone not in biz.phones:
            biz.phones.append(phone)
    for mail in _as_list(node.get("email")) + [
        cp.get("email") for cp in _as_list(node.get("contactPoint")) if isinstance(cp, dict)
    ]:
        email = normalize_email(_text_value(mail))
        if email and email not in biz.emails:
            biz.emails.append(email)
    biz.url = normalize_url(_text_value(node.get("url"))) if node.get("url") else ""

    address = node.get("address")
    if isinstance(address, list):
        address = address[0] if address else None
    if isinstance(address, dict):
        biz.street = _text_value(address.get("streetAddress"))
        biz.address_locality = _text_value(address.get("addressLocality"))
        biz.region = _text_value(address.get("addressRegion"))
        biz.postal_code = normalize_pincode(_text_value(address.get("postalCode")))
        country = _text_value(address.get("addressCountry"))
        biz.country = "India" if country.upper() in {"IN", "IND"} else country
        parts = [biz.street, biz.address_locality, biz.region, biz.postal_code]
        biz.full_address = ", ".join(dict.fromkeys(p for p in parts if p))
    elif isinstance(address, str):
        biz.full_address = clean_text(address)
        pins = extract_pincodes(biz.full_address)
        biz.postal_code = pins[0] if pins else ""

    geo = node.get("geo")
    if isinstance(geo, list):
        geo = geo[0] if geo else None
    lat = _float(geo.get("latitude")) if isinstance(geo, dict) else _float(node.get("latitude"))
    lon = _float(geo.get("longitude")) if isinstance(geo, dict) else _float(node.get("longitude"))
    if valid_coordinates(lat, lon):
        biz.latitude, biz.longitude = lat, lon

    hours = [clean_text(h) for h in _as_list(node.get("openingHours")) if isinstance(h, str) and h.strip()]
    biz.opening_hours = "; ".join(hours) or format_hours_spec(node.get("openingHoursSpecification"))
    biz.description = clean_text(node.get("description")) if isinstance(node.get("description"), str) else ""
    for key in ("serviceType", "knowsAbout", "makesOffer", "hasOfferCatalog", "areaServed"):
        for item in _as_list(node.get(key)):
            text = _text_value(item) if not isinstance(item, dict) else _service_name(item)
            if text and key != "areaServed":
                biz.services.append(text)
    return biz


def _service_name(item: dict[str, Any]) -> str:
    if "itemOffered" in item:
        offered = item["itemOffered"]
        return _service_name(offered) if isinstance(offered, dict) else _text_value(offered)
    return _text_value(item.get("name") or item.get("serviceType") or "")


# ====================================================================== microdata


_MICRODATA_PROPS = (
    "name", "telephone", "email", "streetAddress", "addressLocality", "addressRegion",
    "postalCode", "addressCountry", "openingHours", "latitude", "longitude", "description",
)


def businesses_from_microdata(soup: BeautifulSoup) -> list[BusinessData]:
    out: list[BusinessData] = []
    for scope in soup.find_all(attrs={"itemscope": True, "itemtype": True}):
        itemtype = scope.get("itemtype", "")
        types = [re.sub(r"^https?://schema\.org/", "", t) for t in str(itemtype).split()]
        if not is_business_type(types):
            continue
        props: dict[str, list[str]] = {}
        for el in scope.find_all(attrs={"itemprop": True}):
            prop = el.get("itemprop")
            if prop not in _MICRODATA_PROPS:
                continue
            value = el.get("content") or el.get("href") or el.get_text(" ", strip=True)
            props.setdefault(prop, []).append(clean_text(value))
        biz = BusinessData(types=types, source="microdata")
        biz.name = (props.get("name") or [""])[0]
        biz.phones = [p for p in (clean_phone(v) for v in props.get("telephone", [])) if p]
        biz.emails = [e for e in (normalize_email(v) for v in props.get("email", [])) if e]
        biz.street = (props.get("streetAddress") or [""])[0]
        biz.address_locality = (props.get("addressLocality") or [""])[0]
        biz.region = (props.get("addressRegion") or [""])[0]
        biz.postal_code = normalize_pincode((props.get("postalCode") or [""])[0])
        biz.country = (props.get("addressCountry") or [""])[0]
        biz.full_address = ", ".join(
            dict.fromkeys(p for p in (biz.street, biz.address_locality, biz.region, biz.postal_code) if p)
        )
        biz.opening_hours = "; ".join(props.get("openingHours", []))
        lat, lon = _float((props.get("latitude") or [None])[0]), _float((props.get("longitude") or [None])[0])
        if valid_coordinates(lat, lon):
            biz.latitude, biz.longitude = lat, lon
        biz.description = (props.get("description") or [""])[0]
        if biz.name or biz.phones or biz.full_address:
            out.append(biz)
    return out


# ====================================================================== page parsing


def _whatsapp_from_href(href: str) -> str:
    parts = urlsplit(href)
    host = (parts.hostname or "").lower()
    raw = ""
    if host.endswith("wa.me"):
        raw = parts.path.strip("/").split("/")[0]
    elif "whatsapp.com" in host or href.lower().startswith("whatsapp:"):
        raw = (parse_qs(parts.query).get("phone") or [""])[0]
    raw = re.sub(r"\D", "", raw)
    if not raw:
        return ""
    return clean_phone("+" + raw if len(raw) > 10 else raw)


def parse_page(html: str, url: str) -> PageData:
    soup = BeautifulSoup(html, "lxml")
    page = PageData(url=url)

    for node in iter_jsonld_nodes(soup):
        types = schema_types(node)
        page.structured_types.extend(t for t in types if t not in page.structured_types)
        if is_business_type(types):
            page.businesses.append(business_from_jsonld(node))
        elif set(types) & SERVICE_TYPES:
            name = _service_name(node)
            if name:
                page.service_texts.append(name)
    page.businesses.extend(businesses_from_microdata(soup))

    if soup.title and soup.title.string:
        page.title = clean_text(soup.title.string)
    for meta in soup.find_all("meta"):
        key = (meta.get("property") or meta.get("name") or "").lower()
        content = clean_text(meta.get("content"))
        if not content:
            continue
        if key in ("og:site_name", "application-name") and not page.site_name:
            page.site_name = content
        elif key in ("description", "og:description") and not page.meta_description:
            page.meta_description = content
        elif key == "geo.position":
            page.meta_geo = _parse_geo_pair(content, ";")
        elif key == "icbm" and page.meta_geo is None:
            page.meta_geo = _parse_geo_pair(content, ",")

    host = host_of(url)
    for a in soup.find_all("a", href=True):
        href = str(a["href"]).strip()
        low = href.lower()
        if low.startswith("tel:"):
            page.tel_links.append(href[4:])
        elif low.startswith("mailto:"):
            page.mailto_links.append(href[7:])
        elif "wa.me/" in low or "whatsapp.com/send" in low or low.startswith("whatsapp:"):
            number = _whatsapp_from_href(href)
            if number and number not in page.whatsapp_numbers:
                page.whatsapp_numbers.append(number)
        else:
            absolute = normalize_url(urljoin(url, href))
            if absolute and host_of(absolute) == host:
                page.internal_links.append((absolute, clean_text(a.get_text(" ", strip=True))[:80]))

    for tag in soup(["script", "style", "noscript", "template", "svg", "iframe", "canvas", "object"]):
        tag.decompose()
    page.headings = [clean_text(h.get_text(" ", strip=True)) for h in soup.find_all(["h1", "h2", "h3"])][:40]
    body = soup.body or soup
    page.lines = [ln for ln in (clean_text(x) for x in body.get_text("\n").split("\n")) if ln][:3000]
    return page


def _parse_geo_pair(content: str, sep: str) -> tuple[float, float] | None:
    parts = [p.strip() for p in content.split(sep)]
    if len(parts) != 2:
        return None
    lat, lon = _float(parts[0]), _float(parts[1])
    return (lat, lon) if valid_coordinates(lat, lon) else None


def select_follow_links(page: PageData, max_links: int) -> list[str]:
    """Pick the few internal pages most likely to hold contact/service details."""
    scored: dict[str, int] = {}
    root = normalize_url(page.url)
    for link, anchor in page.internal_links:
        path = urlsplit(link).path.lower()
        if link == root or path.endswith(SKIP_EXTENSIONS):
            continue
        haystack = f"{path} {anchor.lower()}"
        if any(neg in haystack for neg in LINK_NEGATIVE):
            continue
        score = sum(weight for kw, weight in LINK_KEYWORDS.items() if kw in haystack or kw.replace("-", " ") in haystack)
        if score > 0:
            scored[link] = max(score, scored.get(link, 0))
    ranked = sorted(scored.items(), key=lambda kv: (-kv[1], len(kv[0])))
    return [link for link, _ in ranked[:max_links]]


# ====================================================================== text heuristics


def phones_from_text(text: str) -> list[str]:
    found: list[str] = []
    for match in phonenumbers.PhoneNumberMatcher(text[:60_000], "IN", leniency=Leniency.VALID, max_tries=500):
        e164 = phonenumbers.format_number(match.number, PhoneNumberFormat.E164)
        phone = clean_phone(e164)
        if phone and phone not in found:
            found.append(phone)
    return found


def whatsapp_from_text(text: str) -> list[str]:
    out: list[str] = []
    for m in WHATSAPP_TEXT.finditer(text):
        phone = clean_phone(m.group(1))
        if phone and phone not in out:
            out.append(phone)
    return out


def address_from_lines(lines: list[str], city_terms: list[str]) -> tuple[str, str]:
    """Find an address line: must contain a PIN code plus a city/label/address cue,
    or be an explicitly labelled line mentioning the city. Returns (address, pincode)."""
    terms = [t.lower() for t in city_terms if t]
    for i, line in enumerate(lines):
        if len(line) > 300:
            continue
        pins = extract_pincodes(line)
        labeled = ADDRESS_LABEL.match(line)
        if not pins:
            continue
        low = line.lower()
        if not (labeled or any(t in low for t in terms) or ADDRESS_TOKENS.search(line)):
            continue
        address = line[labeled.end():] if labeled else line
        prev = lines[i - 1] if i > 0 else ""
        if not labeled and len(address) < 40 and prev and len(prev) < 150 and ADDRESS_TOKENS.search(prev):
            prev_label = ADDRESS_LABEL.match(prev)
            prev_text = prev[prev_label.end():] if prev_label else prev
            if prev_text:
                address = f"{prev_text}, {address}"
        return clean_text(address).strip(" ,;:-")[:250], pins[0]
    for i, line in enumerate(lines):
        m = ADDRESS_LABEL.match(line)
        if not m:
            continue
        rest = line[m.end():].strip() or (lines[i + 1] if i + 1 < len(lines) else "")
        if rest and len(rest) < 250 and any(t in rest.lower() for t in terms):
            return clean_text(rest).strip(" ,;:-"), ""
    return "", ""


def _to_24h(value: str) -> str:
    m = re.match(r"(?i)\s*(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?", value)
    if not m:
        return ""
    hour, minute, ampm = int(m.group(1)), int(m.group(2) or 0), (m.group(3) or "").lower()
    if ampm == "p" and hour < 12:
        hour += 12
    if ampm == "a" and hour == 12:
        hour = 0
    if hour > 24 or minute > 59:
        return ""
    return f"{hour:02d}:{minute:02d}"


def normalize_hours_text(text: str) -> str:
    """"Mon - Sat: 9:00 AM - 8:00 PM" -> "Mo-Sa 09:00-20:00". Returns "" if not recognised."""
    pattern = re.compile(
        rf"(?i)({DAY_WORD})\s*(?:-|–|to)\s*({DAY_WORD})\s*[:,]?\s*({TIME_OR_24})\s*(?:-|–|to)\s*({TIME_OR_24})"
    )
    parts = []
    for m in pattern.finditer(text):
        start, end = day_code(m.group(1)[:3]), day_code(m.group(2)[:3])
        opens, closes = _to_24h(m.group(3)), _to_24h(m.group(4))
        if start and end and opens and closes:
            parts.append(f"{start}-{end} {opens}-{closes}" if start != end else f"{start} {opens}-{closes}")
    return "; ".join(parts)


def hours_from_lines(lines: list[str]) -> str:
    for i, line in enumerate(lines):
        if len(line) > 160 or not HOURS_LINE.search(line):
            continue
        candidate = line
        if not re.search(TIME_OR_24, candidate, re.I) and i + 1 < len(lines):
            candidate = f"{line} {lines[i + 1]}"
        if re.search(TIME_OR_24, candidate, re.I) and re.search(DAY_WORD, candidate, re.I):
            return normalize_hours_text(candidate) or clean_text(candidate)[:120]
    return ""


def name_from_title(title: str, host: str) -> str:
    segments = [s.strip() for s in re.split(r"\s+[|\-–—:•·»]\s+|\s*\|\s*", title) if s.strip()]
    segments = [s for s in segments if s.lower() not in GENERIC_TITLES and len(s) <= 80]
    if not segments:
        return ""
    label = squash(normalize_name(registrable_domain(host).split(".")[0])) if host else ""
    if label:
        best = max(segments, key=lambda s: fuzz.partial_ratio(squash(normalize_name(s)), label))
        if fuzz.partial_ratio(squash(normalize_name(best)), label) >= 70:
            return best
    only = segments[0] if len(segments) == 1 else ""
    if only and not re.search(r"(?i)\b(best|top|near me|in \w+|cheap|no\.?\s?1)\b", only):
        return only
    return ""


def clean_business_name(name: str) -> str:
    name = clean_text(name)
    name = re.sub(r"(?i)^(welcome to|home\s*[|\-–])\s*", "", name).strip(" |-–")
    if name.lower() in GENERIC_TITLES or len(name) < 2 or len(name) > 100:
        return ""
    return name


def find_locality(text: str, localities: list[str]) -> str:
    low = text.lower()
    # Neighbourhood names beat road/junction names ("Pradhan Nagar" over "Hill Cart Road").
    def priority(loc: str) -> tuple[bool, int]:
        return (bool(re.search(r"(?i)\b(road|more|sarani)$", loc)), -len(loc))

    for loc in sorted(localities, key=priority):
        if re.search(rf"(?<!\w){re.escape(loc.lower())}(?!\w)", low):
            return loc
    return ""


def mentions_any(text: str, terms: list[str]) -> bool:
    low = text.lower()
    return any(re.search(rf"(?<!\w){re.escape(t.lower())}(?!\w)", low) for t in terms if t)


def resolve_place(
    *,
    address_locality: str,
    region: str,
    country: str,
    full_address: str,
    location: Location,
    profile: dict[str, Any],
) -> dict[str, str]:
    """Decide city/locality/state/country from values present in the source.

    Returns a dict of values plus ``*_source`` entries explaining derivations.
    """
    city_terms = [location.city, *profile.get("aliases", [])]
    localities: list[str] = profile.get("localities", [])
    out = {"city": "", "locality": "", "state": "", "country": ""}
    sources: dict[str, str] = {}
    if address_locality:
        if mentions_any(address_locality, city_terms):
            out["city"] = location.city
        elif loc := find_locality(address_locality, localities):
            out["locality"] = loc
        elif mentions_any(full_address, city_terms):
            out["locality"] = address_locality
        else:
            out["city"] = address_locality
    if not out["city"] and mentions_any(full_address, city_terms):
        out["city"] = location.city
    if not out["locality"]:
        out["locality"] = find_locality(full_address, localities)
    if not out["city"] and out["locality"]:
        out["city"] = location.city
        sources["city"] = "derived:known_locality"
    if region:
        out["state"] = region
    elif location.state and mentions_any(full_address, [location.state]):
        out["state"] = location.state
    elif out["city"] == location.city and location.state:
        out["state"] = location.state
        sources["state"] = "derived:city"
    if country:
        out["country"] = country
    elif mentions_any(full_address, [location.country]):
        out["country"] = location.country
    elif out["city"] == location.city:
        out["country"] = location.country
        sources["country"] = "derived:city"
    out.update({f"{k}_source": v for k, v in sources.items()})
    return out


def truncate_words(text: str, limit: int) -> str:
    text = clean_text(text)
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return cut.rstrip(",.;:") + "…"


# ====================================================================== record building


def _pick_primary_business(pages: list[PageData], host: str) -> tuple[BusinessData | None, list[BusinessData]]:
    all_biz = [b for p in pages for b in p.businesses]
    if not all_biz:
        return None, []
    label = squash(normalize_name(registrable_domain(host).split(".")[0])) if host else ""

    def rank(b: BusinessData) -> tuple[int, int, int]:
        name_match = fuzz.partial_ratio(squash(normalize_name(b.name)), label) if b.name and label else 0
        return (int(b.is_local()), b.filled(), int(name_match))

    primary = max(all_biz, key=rank)
    pname = normalize_name(primary.name)
    related = [
        b for b in all_biz
        if b is not primary and (not b.name or not pname or fuzz.token_set_ratio(normalize_name(b.name), pname) >= 85)
    ]
    return primary, related


def build_website_record(
    pages: list[PageData],
    *,
    site_url: str,
    location: Location,
    profile: dict[str, Any],
    extraction: ExtractionSettings,
    discovered_via: str = "",
    query: str = "",
    category: str = "",
) -> RawRecord:
    """Combine up to N crawled pages of one website into a single RawRecord."""
    home = pages[0]
    host = host_of(site_url)
    record = RawRecord(
        source_name=SOURCE_WEBSITE,
        source_url=home.url,
        website=site_url,
        discovered_via=discovered_via,
        discovery_query=query,
        discovery_category=category,
        record_key=f"website:{host}",
    )
    fs = record.field_sources
    primary, related = _pick_primary_business(pages, host)
    structured = [primary, *related] if primary else []
    record.has_structured_data = primary is not None
    record.structured_types = sorted({t for b in structured for t in b.types})

    # ---- name
    for value, how in (
        (primary.name if primary else "", primary.source if primary else ""),
        (home.site_name, "meta:og:site_name"),
        (name_from_title(home.title, host), "meta:title"),
    ):
        name = clean_business_name(value)
        if name:
            record.provider_name, fs["provider_name"] = name, how
            break

    # ---- phones (structured first, then tel: links, then visible text)
    phones: list[str] = []
    for b in structured:
        phones += b.phones
    if phones:
        fs["phone"] = structured[0].source
    link_phones = [p for p in (clean_phone(t) for page in pages for t in page.tel_links) if p]
    if link_phones and not phones:
        fs["phone"] = "html:tel-link"
    phones += link_phones
    if not phones:
        # Visible-text numbers only when nothing better exists; pages that list many
        # numbers (brand helplines etc.) are unreliable, so keep only the first few.
        phones = list(dict.fromkeys(p for page in pages for p in phones_from_text(page.text)))[:3]
        if phones:
            fs["phone"] = "text"
    whatsapp = [n for page in pages for n in page.whatsapp_numbers] or [
        n for page in pages for n in whatsapp_from_text(page.text)
    ]
    record.phones = list(dict.fromkeys(phones))[:5]
    if whatsapp:
        record.whatsapp, fs["whatsapp"] = whatsapp[0], "explicit whatsapp link/label"

    # ---- emails
    emails = [e for b in structured for e in b.emails]
    emails += [e for e in (normalize_email(m) for page in pages for m in page.mailto_links) if e]
    for page in pages:
        emails += extract_emails(page.text)
    record.emails = rank_emails(emails, host)[:3]

    # ---- address
    city_terms = [location.city, *profile.get("aliases", [])]
    addr_biz = next((b for b in structured if b.full_address), None)
    if addr_biz:
        record.address = addr_biz.full_address
        record.pincode = addr_biz.postal_code or next(iter(extract_pincodes(addr_biz.full_address)), "")
        fs["address"] = addr_biz.source
        place = resolve_place(
            address_locality=addr_biz.address_locality,
            region=addr_biz.region,
            country=addr_biz.country,
            full_address=addr_biz.full_address,
            location=location,
            profile=profile,
        )
    else:
        address, pin = "", ""
        # contact pages first: they usually hold the canonical address
        for page in sorted(pages, key=lambda p: 0 if "contact" in p.url.lower() else 1):
            address, pin = address_from_lines(page.lines, city_terms)
            if address:
                break
        record.address, record.pincode = address, pin
        if address:
            fs["address"] = "text"
        place = resolve_place(
            address_locality="", region="", country="", full_address=address, location=location, profile=profile
        )
    record.city, record.locality = place["city"], place["locality"]
    record.state, record.country = place["state"], place["country"]
    for key in ("city", "state", "country"):
        if place.get(f"{key}_source"):
            fs[key] = place[f"{key}_source"]

    # ---- coordinates (explicit structured data / geo meta only)
    geo_biz = next((b for b in structured if b.latitude is not None), None)
    if geo_biz:
        record.latitude, record.longitude = geo_biz.latitude, geo_biz.longitude
        fs["latitude"] = geo_biz.source
    elif home.meta_geo:
        record.latitude, record.longitude = home.meta_geo
        fs["latitude"] = "meta:geo.position"

    # ---- hours
    hours_biz = next((b for b in structured if b.opening_hours), None)
    if hours_biz:
        record.opening_hours, fs["opening_hours"] = hours_biz.opening_hours, hours_biz.source
    else:
        for page in pages:
            hours = hours_from_lines(page.lines)
            if hours:
                record.opening_hours, fs["opening_hours"] = hours, "text"
                break

    # ---- description (short, own-site snippet only)
    if extraction.include_description:
        desc = next((b.description for b in structured if b.description), "") or home.meta_description
        if desc:
            record.description = truncate_words(desc, extraction.description_max_chars)
            fs["description"] = "json-ld" if structured and structured[0].description else "meta:description"

    # ---- evidence for classification
    services = [s for b in structured for s in b.services] + [s for p in pages for s in p.service_texts]
    record.evidence = Evidence(
        structured=" | ".join(dict.fromkeys(services + [b.description for b in structured if b.description])),
        meta=" | ".join(
            dict.fromkeys(
                [p.title for p in pages if p.title]
                + [p.meta_description for p in pages if p.meta_description]
                + [h for p in pages for h in p.headings]
                + [anchor for anchor in (a for _, a in home.internal_links) if anchor]
            )
        )[:20_000],
        body="\n".join(p.text[:15_000] for p in pages)[:40_000],
    )
    return record
