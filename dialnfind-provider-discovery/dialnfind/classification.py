"""Rule-based category classification (with an optional LLM assist behind a flag)."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from .logging_setup import get_logger
from .models import Evidence

log = get_logger("classify")

# Weight of one keyword hit per evidence field. A business name alone is weak evidence.
FIELD_WEIGHTS = {"osm": 4.0, "structured": 3.0, "meta": 2.0, "body": 1.0, "name": 1.0}
MAX_HITS_PER_KEYWORD = 3
MIN_PRIMARY_SCORE = 2.0
WEAK_TAG_WEIGHT = 2.0
MIN_SECONDARY_SCORE = 3.0
# The category whose query found a record only breaks exact ties; it must never outweigh evidence.
HINT_BONUS = 0.01
# A weak tag (a shop type) confirmed by the business name is more specific than a generic strong
# tag, so "Crystal Mobile Repairing" (craft=electronics_repair) lands in Mobile Phone Repair rather
# than the category-level Electronics Repair rule that owns the tag. On a category-level rule the
# same corroboration counts a little less than a strong tag, so a specific rule's own strong tag
# ("barber" for Men's Grooming) still beats "salon" in the name plus a generic beauty tag.
CORROBORATED_WEAK_BONUS = 0.5

# Prefixes for dataset categories stored alongside OSM tags in Evidence.osm_tags.
OVERTURE_PREFIX = "overture="
FSQ_PREFIX = "fsq="


def _pattern(phrase: str) -> re.Pattern[str]:
    words = [re.escape(w) for w in phrase.lower().split()]
    return re.compile(r"(?<![a-z0-9])" + r"[\s\-/]+".join(words) + r"(?![a-z0-9])", re.I)


@dataclass
class CategoryRule:
    name: str
    keywords: list[str]
    negative_keywords: list[str] = field(default_factory=list)
    queries: list[str] = field(default_factory=list)
    osm_tags: list[str] = field(default_factory=list)  # strong: the tag itself means "provides this service"
    osm_weak_tags: list[str] = field(default_factory=list)  # retail shops etc.: need corroboration
    osm_name_regex: str = ""
    services: dict[str, list[str]] = field(default_factory=dict)
    overture: list[str] = field(default_factory=list)  # Overture taxonomy ids that mean the service
    overture_weak: list[str] = field(default_factory=list)
    fsq: list[str] = field(default_factory=list)  # Foursquare category names (last label segment)
    fsq_weak: list[str] = field(default_factory=list)
    dialnfind_category: str = ""  # category slug in the dialnfind database
    dialnfind_subcategory: str = ""  # subcategory slug; empty = category-level listing

    def __post_init__(self) -> None:
        self._kw = [(k, _pattern(k)) for k in dict.fromkeys(k.lower() for k in self.keywords if k)]
        self._neg = [_pattern(k) for k in self.negative_keywords if k]
        self._svc = {name: [_pattern(k) for k in kws] for name, kws in self.services.items()}

    @property
    def strong_tags(self) -> list[str]:
        return [*self.osm_tags, *(OVERTURE_PREFIX + t for t in self.overture), *(FSQ_PREFIX + fsq_key(t) for t in self.fsq)]

    @property
    def weak_tags(self) -> list[str]:
        return [
            *self.osm_weak_tags,
            *(OVERTURE_PREFIX + t for t in self.overture_weak),
            *(FSQ_PREFIX + fsq_key(t) for t in self.fsq_weak),
        ]

    def search_queries(self, limit: int = 3) -> list[str]:
        base = self.queries or [self.name] + self.keywords[:2]
        return list(dict.fromkeys(q.strip() for q in base if q.strip()))[:limit]


def fsq_key(label: str) -> str:
    """"Arts and Entertainment > Movie Theater" -> "movie_theater" (last segment, snake case)."""
    last = label.rsplit(">", 1)[-1].strip().lower()
    return re.sub(r"[^a-z0-9]+", "_", last).strip("_")


def _auto_keywords(category: str) -> list[str]:
    name = category.lower().strip()
    words = [name]
    for suffix, alts in (
        (" repair", (" service", " services", " servicing")),
        (" service", (" repair", " services")),
        (" installation", (" install", " service")),
    ):
        if name.endswith(suffix):
            base = name[: -len(suffix)]
            words += [base + alt for alt in alts]
    return words


def build_rules(categories: list[str], config_rules: dict[str, dict[str, Any]]) -> list[CategoryRule]:
    lookup = {k.strip().lower(): v or {} for k, v in (config_rules or {}).items()}
    rules: list[CategoryRule] = []
    for category in categories:
        cfg = lookup.get(category.lower())
        if cfg is None:
            log.info("No keyword rules for %r in config; using automatic keywords", category)
            cfg = {}
        keywords = list(cfg.get("keywords") or [])
        keywords = keywords or _auto_keywords(category)
        if category.lower() not in (k.lower() for k in keywords):
            keywords.insert(0, category.lower())
        rules.append(
            CategoryRule(
                name=category,
                keywords=keywords,
                negative_keywords=list(cfg.get("negative_keywords") or []),
                queries=list(cfg.get("queries") or []),
                osm_tags=list(cfg.get("osm_tags") or []),
                osm_weak_tags=list(cfg.get("osm_weak_tags") or []),
                osm_name_regex=str(cfg.get("osm_name_regex") or ""),
                services={str(k): list(v or []) for k, v in (cfg.get("services") or {}).items()},
                overture=list(cfg.get("overture") or []),
                overture_weak=list(cfg.get("overture_weak") or []),
                fsq=list(cfg.get("fsq") or []),
                fsq_weak=list(cfg.get("fsq_weak") or []),
                dialnfind_category=str((cfg.get("dialnfind") or {}).get("category") or ""),
                dialnfind_subcategory=str((cfg.get("dialnfind") or {}).get("subcategory") or ""),
            )
        )
    _warn_shared_strong_tags(rules)
    return rules


def _warn_shared_strong_tags(rules: list[CategoryRule]) -> None:
    """A strong tag claimed by several rules makes the winner arbitrary. Give it to one
    category-level rule and list it as weak on the specific ones instead."""
    owners: dict[str, list[str]] = {}
    for rule in rules:
        for tag in rule.strong_tags:
            owners.setdefault(tag.lower(), []).append(rule.name)
    for tag, names in owners.items():
        if len(names) > 1:
            log.warning("Strong tag %s is used by %d rules (%s); make it weak on all but one",
                        tag, len(names), ", ".join(names))


@dataclass
class ClassificationResult:
    primary_category: str = ""
    secondary_categories: list[str] = field(default_factory=list)
    category_scores: dict[str, float] = field(default_factory=dict)
    outside_name_score: float = 0.0  # evidence for the primary category excluding the name
    matched_keywords: list[str] = field(default_factory=list)  # keywords/tags found outside the name
    matched_services: list[str] = field(default_factory=list)
    name_keywords: list[str] = field(default_factory=list)  # primary-category phrases found in the name
    method: str = "rules"

    @property
    def name_only(self) -> bool:
        return bool(self.primary_category) and self.outside_name_score < MIN_PRIMARY_SCORE


def _count(pattern: re.Pattern[str], text: str) -> int:
    return min(MAX_HITS_PER_KEYWORD, len(pattern.findall(text))) if text else 0


def classify(
    name: str,
    evidence: Evidence,
    rules: list[CategoryRule],
    *,
    hint_category: str = "",
) -> ClassificationResult:
    fields = {
        "name": name or "",
        "structured": evidence.structured,
        "meta": evidence.meta,
        "body": evidence.body,
    }
    osm_tags = {t.lower() for t in evidence.osm_tags}
    result = ClassificationResult()
    outside: dict[str, float] = {}
    keywords_by_cat: dict[str, list[str]] = {}
    name_kw_by_cat: dict[str, list[str]] = {}

    for rule in rules:
        total = 0.0
        outside_name = 0.0
        hits: list[str] = []
        for keyword, pattern in rule._kw:
            for fname, text in fields.items():
                n = _count(pattern, text)
                if n:
                    score = FIELD_WEIGHTS[fname] * n
                    total += score
                    if fname == "name":
                        name_kw_by_cat.setdefault(rule.name, []).append(keyword)
                    else:
                        outside_name += score
                        if keyword not in hits:
                            hits.append(keyword)
        for tag in rule.strong_tags:
            if tag.lower() in osm_tags:
                total += FIELD_WEIGHTS["osm"]
                outside_name += FIELD_WEIGHTS["osm"]
                hits.append(tag)
        name_hit = bool(name) and (
            any(p.search(name) for _, p in rule._kw)
            or bool(rule.osm_name_regex and re.search(rule.osm_name_regex, name, re.I))
        )
        if rule.osm_name_regex and name_hit and re.search(rule.osm_name_regex, name, re.I):
            total += FIELD_WEIGHTS["name"]
        # A retail tag (e.g. shop=mobile_phone) alone is weak evidence of a *repair* service:
        # enough to classify for manual review, not enough for full category credit --
        # unless the name corroborates it ("... Mobile Repairing").
        for tag in rule.weak_tags:
            if tag.lower() in osm_tags:
                if name_hit:
                    specific = bool(rule.dialnfind_subcategory) or not rule.dialnfind_category
                    total += FIELD_WEIGHTS["osm"] + (CORROBORATED_WEAK_BONUS if specific else -CORROBORATED_WEAK_BONUS)
                    outside_name += FIELD_WEIGHTS["osm"]
                    hits.append(tag)
                else:
                    total += WEAK_TAG_WEIGHT
                    outside_name += WEAK_TAG_WEIGHT / 2
                break  # several weak tags of one rule are still one shop type
        for pattern in rule._neg:
            if pattern.search(fields["name"]) or pattern.search(fields["meta"]):
                total -= 3.0
                outside_name -= 3.0
        if total > 0:
            if hint_category and rule.name.lower() == hint_category.lower():
                total += HINT_BONUS
            result.category_scores[rule.name] = round(total, 2)
            outside[rule.name] = outside_name
            keywords_by_cat[rule.name] = hits

    ranked = sorted(result.category_scores.items(), key=lambda kv: (-kv[1], kv[0]))
    if not ranked or ranked[0][1] < MIN_PRIMARY_SCORE:
        return result
    primary = ranked[0][0]
    result.primary_category = primary
    result.outside_name_score = outside.get(primary, 0.0)
    result.matched_keywords = keywords_by_cat.get(primary, [])
    result.name_keywords = name_kw_by_cat.get(primary, [])

    secondary_cats = [c for c, _ in ranked[1:] if outside.get(c, 0.0) >= MIN_SECONDARY_SCORE]
    services: list[str] = []
    non_name_text = "\n".join(v for k, v in fields.items() if k != "name")
    for rule in rules:
        if rule.name != primary and rule.name not in secondary_cats:
            continue
        for svc, patterns in rule._svc.items():
            if any(p.search(non_name_text) for p in patterns) and svc not in services:
                services.append(svc)
    result.matched_services = services
    result.secondary_categories = list(dict.fromkeys(services + secondary_cats))
    return result


class AIClassifier:
    """Optional LLM classifier (--use-ai-classification). Only sees extracted text
    snippets and must choose from the configured categories -- it never adds data."""

    def __init__(self, api_key: str, model: str, categories: list[str], services: list[str]) -> None:
        import anthropic  # optional dependency

        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model
        self._categories = categories
        self._services = services

    def classify(self, name: str, evidence: Evidence) -> tuple[str, list[str]] | None:
        snippet = "\n".join(
            part for part in (evidence.structured[:1500], evidence.meta[:1500], evidence.body[:2500]) if part
        )
        prompt = (
            "Classify this local business for a home-services marketplace.\n"
            f"Allowed categories: {json.dumps(self._categories)}\n"
            f"Allowed service tags: {json.dumps(self._services)}\n"
            "Use ONLY the text below as evidence. If the business does not clearly offer any allowed "
            'category, return "primary_category": "".\n'
            'Reply with JSON only: {"primary_category": str, "secondary_categories": [str]}\n\n'
            f"Business name: {name}\n---\n{snippet}"
        )
        try:
            msg = self._client.messages.create(
                model=self._model, max_tokens=300, messages=[{"role": "user", "content": prompt}]
            )
            text = "".join(getattr(block, "text", "") for block in msg.content)
            match = re.search(r"\{.*\}", text, re.S)
            data = json.loads(match.group(0)) if match else {}
        except Exception as exc:  # network/API/parse errors must never break the pipeline
            log.warning("AI classification failed for %r: %s", name, exc)
            return None
        allowed = {c.lower(): c for c in self._categories + self._services}
        primary = allowed.get(str(data.get("primary_category", "")).lower(), "")
        secondary = [allowed[s.lower()] for s in data.get("secondary_categories", []) if str(s).lower() in allowed]
        return primary, [s for s in dict.fromkeys(secondary) if s != primary]
