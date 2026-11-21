"""Foursquare OS Places (https://docs.foursquare.com/data-products/docs/access-fsq-os-places).

Open data under Apache-2.0. Access needs a token from the Foursquare Places Portal or a
Hugging Face token with access to the ``foursquare/fsq-os-places`` dataset (``FSQ_TOKEN`` in
.env) and the release date to read (``foursquare.release_date`` / ``FSQ_RELEASE_DATE``).
Without both the source is skipped. Overture already carries part of this data; records
found in both merge on phone or website during deduplication.
"""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
from typing import Any

from ..classification import fsq_key
from ..logging_setup import get_logger
from ..models import SOURCE_FOURSQUARE, Candidate, Location, RawRecord
from ..normalization import clean_text
from ._places import cached_extract, evidence_for, fill_address, fill_contact, read_rows, rule_matches, sql_literal
from .base import DiscoverySource
from .osm import BBox, resolve_bbox

log = get_logger("source.foursquare")

FSQ_ATTRIBUTION = "Foursquare OS Places, Apache-2.0 (https://opensource.foursquare.com/os-places/)"


def build_fsq_query(url: str, bbox: BBox, out_path: str, refreshed_after: date) -> str:
    south, west, north, east = bbox
    return f"""
COPY (
  SELECT fsq_place_id, name, latitude, longitude, address, locality, region, postcode,
         tel, website, email, fsq_category_labels
  FROM read_parquet({sql_literal(url)})
  WHERE latitude BETWEEN {south} AND {north}
    AND longitude BETWEEN {west} AND {east}
    AND date_closed IS NULL
    AND (date_refreshed IS NULL OR CAST(date_refreshed AS DATE) >= DATE {sql_literal(refreshed_after.isoformat())})
) TO {sql_literal(out_path)} (FORMAT parquet)
"""


def fsq_to_record(row: dict[str, Any], location: Location, profile: dict[str, Any], *, blocked_domains: list[str]) -> RawRecord | None:
    name = clean_text(row.get("name"))
    if not name or not row.get("fsq_place_id"):
        return None
    pid = str(row["fsq_place_id"])
    rec = RawRecord(
        source_name=SOURCE_FOURSQUARE,
        source_url=f"https://foursquare.com/v/{pid}",
        provider_name=name,
        discovered_via=SOURCE_FOURSQUARE,
        has_structured_data=True,
        record_key=f"fsq:{pid}",
    )
    rec.field_sources["provider_name"] = "fsq"
    fill_contact(rec, row.get("tel"), row.get("email"), row.get("website"), blocked_domains, "fsq")
    fill_address(
        rec, location, profile,
        freeform=row.get("address") or "", locality=row.get("locality") or "",
        postcode=row.get("postcode") or "", region=row.get("region") or "", how="fsq",
    )
    if row.get("latitude") is not None and row.get("longitude") is not None:
        rec.latitude, rec.longitude = float(row["latitude"]), float(row["longitude"])
        rec.field_sources["latitude"] = "fsq-geometry"
    labels = [str(label) for label in (row.get("fsq_category_labels") or [])]
    rec.evidence = evidence_for([f"fsq={fsq_key(label)}" for label in labels], [label.rsplit(">", 1)[-1].strip() for label in labels])
    return rec


class FoursquareSource(DiscoverySource):
    name = "fsq"
    config_key = "foursquare"
    query_mode = "once"

    def available(self) -> tuple[bool, str]:
        cfg = self.ctx.settings.foursquare
        try:
            import duckdb  # noqa: F401
        except ImportError:
            return False, "duckdb is not installed (pip install -r requirements.txt)"
        if cfg.base_url.startswith("hf://") and not cfg.token:
            return False, "set FSQ_TOKEN (Foursquare Places Portal or Hugging Face token) in .env"
        if "{release_date}" in cfg.base_url and not cfg.release_date:
            return False, "set foursquare.release_date in config.yaml or FSQ_RELEASE_DATE in .env"
        return True, ""

    def _extract(self, location: Location) -> Path:
        cfg = self.ctx.settings.foursquare
        bbox = resolve_bbox(self.ctx, location)
        url = cfg.base_url.format(release_date=cfg.release_date)
        refreshed_after = date.today() - timedelta(days=cfg.max_age_days)

        def build(path: Path) -> None:
            import duckdb

            log.info("Downloading Foursquare OS Places %s for %s", cfg.release_date, bbox)
            con = duckdb.connect()
            try:
                if url.startswith("hf://"):
                    con.execute("INSTALL httpfs; LOAD httpfs;")
                    con.execute(f"CREATE SECRET fsq (TYPE huggingface, TOKEN {sql_literal(cfg.token)});")
                con.execute(build_fsq_query(url, bbox, str(path), refreshed_after))
            finally:
                con.close()

        return cached_extract(Path(self.ctx.settings.output_dir), "fsq", f"{url}|{bbox}", cfg.cache_hours, build)

    def discover(self, query: str, location: Location, category: str) -> list[Candidate]:
        rows = read_rows(self._extract(location))
        profile = self.ctx.settings.location_profile()
        rules = list(self.ctx.rules.values())
        out: list[Candidate] = []
        for row in rows:
            rec = fsq_to_record(row, location, profile, blocked_domains=self.ctx.settings.blocked_domains)
            if rec is None or not any(rule_matches(rec, rule) for rule in rules):
                continue
            rec.discovery_query = query
            out.append(Candidate(source_name=SOURCE_FOURSQUARE, query=query, category="",
                                 url=rec.website, name=rec.provider_name, prefilled=rec))
        log.info("Foursquare: %d places in area, %d match a category", len(rows), len(out))
        return out
