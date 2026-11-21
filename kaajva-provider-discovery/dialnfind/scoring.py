"""Evidence-based relevance, data-quality and source-confidence scoring."""

from __future__ import annotations

from typing import Any

from .classification import ClassificationResult
from .extraction import mentions_any
from .models import SOURCE_FOURSQUARE, SOURCE_OSM, SOURCE_OVERTURE, SOURCE_WEBSITE, Location, Provider

RELEVANCE_WEIGHTS = {
    "category_match": 30,
    "city_match": 20,
    "service_match": 15,
    "phone": 10,
    "website": 10,
    "address": 5,
    "opening_hours": 5,
    "structured_data": 5,
}
QUALITY_WEIGHTS = {
    "name": 20,
    "phone": 15,
    "website": 10,
    "address": 15,
    "city": 10,
    "category": 10,
    "opening_hours": 5,
    "coordinates": 5,
    "description": 5,
    "source_confidence": 5,
}


def source_confidence(provider: Provider) -> str:
    """high: official site with structured data, or >=2 independent sources with a phone.
    medium: official site text, or an open map dataset (OSM, Overture, Foursquare) with a
    phone/website. low: everything else."""
    types = set(provider.source_types)
    if SOURCE_WEBSITE in types and provider.has_structured_data:
        return "high"
    if len(types) >= 2 and provider.phone:
        return "high"
    open_data = types & {SOURCE_OSM, SOURCE_OVERTURE, SOURCE_FOURSQUARE}
    if SOURCE_WEBSITE in types or (open_data and (provider.phone or provider.website)):
        return "medium"
    return "low"


def relevance_score(
    provider: Provider,
    cls: ClassificationResult,
    location: Location,
    profile: dict[str, Any] | None = None,
) -> tuple[int, dict[str, int]]:
    """0-100. Every point needs evidence; a category word in the name alone earns little."""
    w = RELEVANCE_WEIGHTS
    parts: dict[str, int] = {}
    if cls.primary_category:
        if cls.method == "ai" and cls.outside_name_score == 0:
            parts["category_match"] = w["category_match"] // 2
        elif cls.name_only:
            parts["category_match"] = 10
        else:
            parts["category_match"] = w["category_match"]
        if not cls.name_only and (cls.matched_services or len(cls.matched_keywords) >= 2):
            parts["service_match"] = w["service_match"]

    city_terms = [location.city, *(profile or {}).get("aliases", [])]
    if provider.city and provider.city.strip().lower() == location.city.strip().lower():
        parts["city_match"] = w["city_match"]
    elif mentions_any(f"{provider.evidence.meta}\n{provider.evidence.body[:20_000]}", city_terms):
        parts["city_match"] = w["city_match"] // 2  # site mentions the city (e.g. "serving Siliguri")

    if provider.phone:
        parts["phone"] = w["phone"]
    if provider.website:
        parts["website"] = w["website"]
    if provider.address:
        parts["address"] = w["address"]
    if provider.opening_hours:
        parts["opening_hours"] = w["opening_hours"]
    if provider.has_structured_data:
        parts["structured_data"] = w["structured_data"]
    return min(100, sum(parts.values())), parts


def quality_score(provider: Provider) -> tuple[int, dict[str, int]]:
    w = QUALITY_WEIGHTS
    parts: dict[str, int] = {}
    checks = {
        "name": bool(provider.provider_name),
        "phone": bool(provider.phone),
        "website": bool(provider.website),
        "address": bool(provider.address),
        "city": bool(provider.city),
        "category": bool(provider.primary_category),
        "opening_hours": bool(provider.opening_hours),
        "coordinates": provider.latitude is not None and provider.longitude is not None,
        "description": bool(provider.description),
    }
    for key, ok in checks.items():
        if ok:
            parts[key] = w[key]
    conf = {"high": w["source_confidence"], "medium": 3}.get(provider.source_confidence, 0)
    if conf:
        parts["source_confidence"] = conf
    return min(100, sum(parts.values())), parts
