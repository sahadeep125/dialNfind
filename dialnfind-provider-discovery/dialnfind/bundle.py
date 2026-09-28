"""dialnfind provider bundle: the JSON file the dialnfind server imports on deploy.

The server (``server/prisma/import-providers.ts``) creates one unclaimed, unverified listing per
record and remembers every ``sources[].key``, so re-running the import never duplicates or
resurrects a listing. Values are shaped to pass the server's listing validation as-is:

* phone: ``+91`` and 10 digits (records without one are left out; dialnfind is call-first)
* email / website / whatsapp / pincode: valid or ``null`` -- never required
* services: category and subcategory slugs from ``server/prisma/data/categories.json``

Only providers whose category is backed by evidence go in: a dataset category, page text or OSM
tag, or a full service phrase in the business name ("Sharma TV Repair"). A shop type or loose
name pattern alone ("Sayan Mobile Centre") stays in the review CSV for a person to check.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from . import TOOL_NAME, __version__
from .classification import CategoryRule
from .exporters import DISCLAIMER
from .models import Location, Provider, utc_now
from .normalization import DAYS, host_of

BUNDLE_FORMAT = "dialnfind-providers/1"
_PHONE = re.compile(r"^\+91[1-9]\d{9}$")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$", re.I)
_PINCODE = re.compile(r"^[1-9]\d{5}$")
# DAYS is Mo..Su; the server stores 0 = Sunday ... 6 = Saturday.
DAY_INDEX = {code: (i + 1) % 7 for i, code in enumerate(DAYS)}
NAME_SPLIT = re.compile(r"\s+[-|–—]\s+|\s*,\s*")


def load_dialnfind_categories(path: str | Path) -> dict[str, set[str]]:
    """{category slug: {subcategory slugs}} from the server's categories.json."""
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    return {c["slug"]: {s["slug"] for s in c.get("subcategories", [])} for c in data}


def mapping_errors(rules: list[CategoryRule], categories: dict[str, set[str]]) -> list[str]:
    errors = []
    for rule in rules:
        cat, sub = rule.dialnfind_category, rule.dialnfind_subcategory
        if not cat:
            errors.append(f"{rule.name}: missing dialnfind.category")
        elif cat not in categories:
            errors.append(f"{rule.name}: unknown category {cat!r}")
        elif sub and sub not in categories[cat]:
            errors.append(f"{rule.name}: {sub!r} is not a subcategory of {cat!r}")
    return errors


def clean_business_name(name: str) -> str:
    """Listing names from map datasets are sometimes keyword-stuffed
    ("SMART SERVICE CENTER - AC repair & service in siliguri, microwave ...").
    Long names keep only their first part; the full text stays in the source data."""
    name = re.sub(r"\s+", " ", name).strip()
    if len(name) > 60:
        head = NAME_SPLIT.split(name, maxsplit=1)[0].strip()
        if len(head) >= 3:
            name = head
    return name[:100].rstrip()


def _phone(values: list[str]) -> str | None:
    return next((v for v in values if v and _PHONE.match(v)), None)


def _hours(p: Provider) -> list[dict[str, Any]]:
    by_day: dict[int, tuple[str, str]] = {}
    for span in p.hours_structured:
        day = DAY_INDEX.get(span.get("day", ""))
        opens, closes = span.get("opens", ""), span.get("closes", "")
        if day is None or not opens or not closes:
            continue
        if day in by_day:  # split shift (lunch break): first opening to last closing
            opens, closes = min(opens, by_day[day][0]), max(closes, by_day[day][1])
        by_day[day] = (opens, closes)
    rows = []
    for day in range(7):
        if day not in by_day:
            rows.append({"dayOfWeek": day, "openTime": None, "closeTime": None, "is24x7": False})
            continue
        opens, closes = by_day[day]
        if opens == "00:00" and closes in ("24:00", "23:59"):
            rows.append({"dayOfWeek": day, "openTime": None, "closeTime": None, "is24x7": True})
        elif closes > opens and closes <= "23:59":
            rows.append({"dayOfWeek": day, "openTime": opens, "closeTime": closes, "is24x7": False})
        else:
            return []  # overnight or odd hours: leave hours for the owner to set
    return rows if by_day else []


def _services(p: Provider, rules: dict[str, CategoryRule]) -> list[dict[str, Any]]:
    picked: list[tuple[str, str | None]] = []
    for name in [p.primary_category, *p.secondary_categories]:
        rule = rules.get(name)
        if rule is None or not rule.dialnfind_category:
            continue
        pair = (rule.dialnfind_category, rule.dialnfind_subcategory or None)
        if pair not in picked:
            picked.append(pair)
    # A category-level entry adds nothing once the same category has a specific subcategory.
    specific = {c for c, s in picked if s}
    picked = [(c, s) for c, s in picked if s or c not in specific]
    return [{"category": c, "subcategory": s, "primary": i == 0} for i, (c, s) in enumerate(picked)]


def _sources(p: Provider) -> list[dict[str, Any]]:
    out = []
    for key in p.record_keys:
        kind, _, ident = key.partition(":")
        url: str | None = None
        if kind == "osm":
            url = f"https://www.openstreetmap.org/{ident}"
        elif kind == "fsq":
            url = f"https://foursquare.com/v/{ident}"
        elif kind == "website":
            url = next((u for u in p.source_urls if host_of(u) == ident), f"https://{ident}/")
        out.append({"key": key, "type": kind, "url": url})
    return out


BUNDLE_EVIDENCE = {"evidence", "name"}


def bundle_record(p: Provider, rules: dict[str, CategoryRule]) -> dict[str, Any] | None:
    if p.category_evidence not in BUNDLE_EVIDENCE:
        return None
    phone = _phone([p.phone, *p.additional_phones])
    services = _services(p, rules)
    if not phone or p.latitude is None or p.longitude is None or not services or not p.record_keys:
        return None
    name = clean_business_name(p.provider_name)
    if len(name) < 2:
        return None
    email = p.email if p.email and _EMAIL.match(p.email) and len(p.email) <= 254 else None
    website = p.website if p.website.startswith(("http://", "https://")) else None
    return {
        "businessName": name,
        "description": (p.description or "")[:2000] or None,
        "phone": phone,
        "whatsappNumber": p.whatsapp if _PHONE.match(p.whatsapp or "") else None,
        "email": email,
        "website": website,
        "addressLine": (p.address or "")[:200] or None,
        "locality": (p.locality or "")[:80] or None,
        "city": p.city[:60],
        "state": p.state[:60],
        "pincode": p.pincode if _PINCODE.match(p.pincode or "") else None,
        "latitude": round(p.latitude, 6),
        "longitude": round(p.longitude, 6),
        "services": services,
        "hours": _hours(p),
        "sources": _sources(p),
    }


def write_bundle(
    providers: list[Provider],
    rules: list[CategoryRule],
    path: Path,
    location: Location,
    attribution: list[str],
) -> tuple[int, dict[str, int]]:
    """Writes the bundle; returns (records written, {reason: count} for providers left out)."""
    by_name = {r.name: r for r in rules}
    records: list[dict[str, Any]] = []
    skipped: dict[str, int] = {}
    for p in providers:
        rec = bundle_record(p, by_name)
        if rec is None:
            if p.category_evidence not in BUNDLE_EVIDENCE:
                reason = "weak category evidence"
            elif not _phone([p.phone, *p.additional_phones]):
                reason = "no valid Indian phone"
            else:
                reason = "no coordinates or category"
            skipped[reason] = skipped.get(reason, 0) + 1
            continue
        records.append(rec)
    records.sort(key=lambda r: r["sources"][0]["key"])
    payload = {
        "format": BUNDLE_FORMAT,
        "tool": f"{TOOL_NAME}/{__version__}",
        "generatedAt": utc_now(),
        "disclaimer": DISCLAIMER,
        "attribution": attribution,
        "location": {"city": location.city, "state": location.state, "country": location.country},
        "count": len(records),
        "providers": records,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    return len(records), skipped
