"""Record validation: sanitize fields in place and decide whether a record is usable."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .extraction import find_locality, mentions_any, valid_coordinates
from .logging_setup import event, get_logger
from .models import Location, RawRecord
from .normalization import clean_phone, normalize_email, normalize_pincode, normalize_url

log = get_logger("validate")

# Rough bounding box of India (incl. islands) -- rejects swapped/garbage coordinates.
INDIA_BBOX = (6.0, 37.6, 68.0, 97.6)


@dataclass
class ValidationResult:
    ok: bool
    reasons: list[str] = field(default_factory=list)


def in_india(lat: float, lon: float) -> bool:
    s, n, w, e = INDIA_BBOX
    return s <= lat <= n and w <= lon <= e


def sanitize(rec: RawRecord) -> None:
    rec.phones = list(dict.fromkeys(p for p in (clean_phone(x) for x in rec.phones) if p))
    rec.whatsapp = clean_phone(rec.whatsapp) if rec.whatsapp else ""
    rec.emails = list(dict.fromkeys(e for e in (normalize_email(x) for x in rec.emails) if e))
    rec.pincode = normalize_pincode(rec.pincode)
    rec.website = normalize_url(rec.website) if rec.website else ""
    if not valid_coordinates(rec.latitude, rec.longitude) or (
        rec.country in ("", "India") and not in_india(rec.latitude or 0, rec.longitude or 0)
    ):
        rec.latitude = rec.longitude = None


def validate_record(rec: RawRecord, location: Location, profile: dict[str, Any]) -> ValidationResult:
    sanitize(rec)
    reasons: list[str] = []
    label = rec.provider_name or rec.source_url
    if not rec.provider_name:
        reasons.append("missing business name")
    if not (rec.phones or rec.address or rec.website or rec.latitude is not None):
        reasons.append("no contact or location details")

    city_terms = [location.city, *profile.get("aliases", [])]
    if rec.city and not mentions_any(rec.city, city_terms):
        known_locality = find_locality(rec.city, profile.get("localities", []))
        if not known_locality and not mentions_any(rec.address, city_terms):
            reasons.append(f"outside target city ({rec.city})")

    if reasons:
        event(log, "VALIDATE", "rejected %s: %s", label, "; ".join(reasons))
        return ValidationResult(False, reasons)
    event(
        log, "VALIDATE", "%s: phone %s, address %s", label,
        "OK" if rec.phones else "missing", "OK" if rec.address else "missing", level=10,
    )
    return ValidationResult(True)
