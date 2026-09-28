"""`--review` command: print records that need manual verification."""

from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

REASON_LOW_RELEVANCE = "low relevance"
REASON_LOW_QUALITY = "low quality score"
REASON_DUPLICATE = "possible duplicate"
REASON_NO_PHONE = "missing phone"
REASON_NO_ADDRESS = "missing address"
REASON_NAME_ONLY = "weak category evidence (name or shop type only)"


def review_reasons(
    *,
    relevance: int,
    quality: int,
    duplicate_candidate: bool,
    phone: str,
    address: str,
    min_relevance: int,
    min_quality: int,
    name_only: bool = False,
) -> list[str]:
    reasons = []
    if relevance < min_relevance:
        reasons.append(REASON_LOW_RELEVANCE)
    if quality < min_quality:
        reasons.append(REASON_LOW_QUALITY)
    if duplicate_candidate:
        reasons.append(REASON_DUPLICATE)
    if not phone:
        reasons.append(REASON_NO_PHONE)
    if not address:
        reasons.append(REASON_NO_ADDRESS)
    if name_only:
        reasons.append(REASON_NAME_ONLY)
    return reasons


def _int(value: str) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def load_review_rows(path: str | Path, min_relevance: int, min_quality: int) -> list[dict[str, str]]:
    with open(path, encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))
    out = []
    for row in rows:
        reasons = [r.strip() for r in row.get("review_reasons", "").split(";") if r.strip()]
        if not reasons:
            reasons = review_reasons(
                relevance=_int(row.get("relevance_score", "")),
                quality=_int(row.get("data_quality_score", "")),
                duplicate_candidate=row.get("duplicate_candidate", "").lower() == "true",
                phone=row.get("phone", ""),
                address=row.get("address", ""),
                min_relevance=min_relevance,
                min_quality=min_quality,
            )
        if reasons:
            row["review_reasons"] = "; ".join(reasons)
            out.append(row)
    out.sort(key=lambda r: (_int(r.get("data_quality_score", "")), _int(r.get("relevance_score", ""))))
    return out


def print_review(path: str | Path, min_relevance: int, min_quality: int, limit: int = 50) -> int:
    rows = load_review_rows(path, min_relevance, min_quality)
    counts = Counter(reason.strip() for r in rows for reason in r["review_reasons"].split(";"))
    print(f"\n{len(rows)} record(s) need manual review in {path}\n")
    for reason, n in counts.most_common():
        print(f"  {n:>5}  {reason}")
    print()
    for row in rows[:limit]:
        print(f"- {row.get('provider_name') or '<no name>'}  [{row.get('primary_category') or 'uncategorised'}]")
        print(f"    reasons   : {row['review_reasons']}")
        print(f"    scores    : relevance={row.get('relevance_score', '')} quality={row.get('data_quality_score', '')}"
              f" confidence={row.get('source_confidence', '')}")
        print(f"    phone     : {row.get('phone') or '-'}   email: {row.get('email') or '-'}")
        print(f"    address   : {row.get('address') or '-'}")
        print(f"    website   : {row.get('website') or '-'}")
        print(f"    source    : {row.get('source_url', '')}")
        if row.get("duplicate_group_id"):
            print(f"    dup group : {row['duplicate_group_id']}")
    if len(rows) > limit:
        print(f"\n... {len(rows) - limit} more (use --review-limit to show more)")
    return len(rows)
