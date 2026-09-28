"""CSV / JSON exporters."""

from __future__ import annotations

import csv
import json
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from . import TOOL_NAME, __version__
from .models import Provider, utc_now

# Spec columns first (in order), then dedup/provenance helpers.
CSV_COLUMNS = [
    "provider_id",
    "provider_name",
    "normalized_name",
    "primary_category",
    "secondary_categories",
    "phone",
    "whatsapp",
    "email",
    "website",
    "address",
    "locality",
    "city",
    "state",
    "pincode",
    "country",
    "latitude",
    "longitude",
    "description",
    "opening_hours",
    "source_url",
    "source_domain",
    "source_type",
    "source_confidence",
    "discovery_query",
    "is_claimed",
    "claim_status",
    "verification_status",
    "data_quality_score",
    "relevance_score",
    "scraped_at",
    "duplicate_candidate",
    "duplicate_group_id",
    "source_urls",
    "source_domains",
    "source_types",
    "additional_phones",
]
REVIEW_COLUMNS = [*CSV_COLUMNS, "review_reasons"]

DISCLAIMER = (
    "Discovered from public sources. These businesses have NOT joined dialnfind; "
    "records are unclaimed and unverified until the business claims its profile."
)


def _cell(value: Any, *, sep: str = "; ") -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, float):
        return f"{value:.7f}".rstrip("0").rstrip(".")
    if isinstance(value, (list, tuple)):
        return sep.join(str(v) for v in value if v not in (None, ""))
    return str(value)


def provider_row(p: Provider, columns: list[str]) -> dict[str, str]:
    data = p.to_dict()
    row = {}
    for col in columns:
        sep = " | " if col in ("source_urls", "source_domains", "source_types") else "; "
        row[col] = _cell(data.get(col), sep=sep)
    return row


def write_csv(providers: Iterable[Provider], path: Path, columns: list[str] = CSV_COLUMNS) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    # Plain UTF-8 (no BOM) so database importers read the header cleanly.
    with open(path, "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for p in providers:
            writer.writerow(provider_row(p, columns))
            count += 1
    return count


def write_json(
    providers: list[Provider],
    below_threshold: list[Provider],
    path: Path,
    metadata: dict[str, Any],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "metadata": {
            "tool": f"{TOOL_NAME}/{__version__}",
            "generated_at": utc_now(),
            "disclaimer": DISCLAIMER,
            "attribution": attributions([*providers, *below_threshold]),
            **metadata,
        },
        "providers": [p.to_dict() for p in providers],
        "below_threshold": [p.to_dict() for p in below_threshold],
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2, default=str)


def attributions(providers: Iterable[Provider]) -> list[str]:
    """Credits required by the open datasets the records came from (ODbL needs OSM's)."""
    from .sources.foursquare import FSQ_ATTRIBUTION
    from .sources.osm import OSM_ATTRIBUTION
    from .sources.overture import OVERTURE_ATTRIBUTION

    credits = {"osm": OSM_ATTRIBUTION, "overture": OVERTURE_ATTRIBUTION, "fsq": FSQ_ATTRIBUTION}
    used = {t for p in providers for t in p.source_types}
    return [text for kind, text in credits.items() if kind in used]


def output_paths(csv_path: Path) -> dict[str, Path]:
    return {
        "csv": csv_path,
        "review": csv_path.with_name(f"{csv_path.stem}_review.csv"),
        "json": csv_path.with_suffix(".json"),
    }
