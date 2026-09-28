"""Regenerate examples/example_output*.csv/json by running the real pipeline offline
against the FICTIONAL mock web in tests/fixtures (reserved .example domains).

    python examples/generate_example.py
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dialnfind.config import apply_source_selection, load_categories, load_settings  # noqa: E402
from dialnfind.logging_setup import setup_logging  # noqa: E402
from dialnfind.pipeline import run_pipeline  # noqa: E402
from tests.fixtures import sites  # noqa: E402


def main() -> None:
    setup_logging("WARNING")
    with tempfile.TemporaryDirectory() as tmp:
        urls = Path(tmp) / "urls.txt"
        urls.write_text(sites.MANUAL_URLS, encoding="utf-8")
        settings = load_settings(ROOT / "config.yaml")
        apply_source_selection(settings, "osm,manual,website")
        settings.input_urls = str(urls)
        settings.output = str(ROOT / "examples" / "example_output.csv")
        settings.state_db = str(Path(tmp) / "discovery.db")
        settings.contact_email = "ops@example.org"
        stats = run_pipeline(settings, load_categories(ROOT / "categories.txt"),
                             transport=sites.transport(), sleep=lambda _s: None)
    print(stats.summary())


if __name__ == "__main__":
    main()
