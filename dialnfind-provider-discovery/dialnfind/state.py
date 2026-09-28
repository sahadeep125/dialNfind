"""SQLite-backed crawl state, raw records and caches (enables --resume)."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

from .models import Candidate, RawRecord, utc_now

URL_PENDING = "pending"
URL_DONE = "done"
URL_FAILED = "failed"
URL_SKIPPED = "skipped"  # robots.txt / bot protection / crawl-delay too long
URL_BLOCKED = "blocked"  # blocked domain list

_SCHEMA = """
CREATE TABLE IF NOT EXISTS urls (
    url TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    status TEXT NOT NULL,
    last_attempt TEXT,
    error TEXT,
    provider_id TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    pages_fetched INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_urls_status ON urls(status);
CREATE TABLE IF NOT EXISTS queries (
    source TEXT NOT NULL,
    query TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    last_attempt TEXT,
    error TEXT,
    PRIMARY KEY (source, query)
);
CREATE TABLE IF NOT EXISTS candidates (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS raw_records (
    key TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS robots_cache (
    domain TEXT PRIMARY KEY,
    status INTEGER NOT NULL,
    body TEXT NOT NULL,
    fetched_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS kv_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    fetched_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

# Tables describing one run; caches survive a fresh (non --resume) run.
_RUN_TABLES = ("urls", "queries", "candidates", "raw_records")


class StateStore:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        if str(path) != ":memory:":
            self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path), check_same_thread=False, timeout=30)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.RLock()
        with self._lock:
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA synchronous=NORMAL")
            self._conn.executescript(_SCHEMA)
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def _execute(self, sql: str, params: tuple[Any, ...] = ()) -> None:
        with self._lock:
            self._conn.execute(sql, params)
            self._conn.commit()

    def _query(self, sql: str, params: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self._conn.execute(sql, params).fetchall()

    # ------------------------------------------------------------ run lifecycle

    def reset_run(self) -> None:
        with self._lock:
            for table in _RUN_TABLES:
                self._conn.execute(f"DELETE FROM {table}")
            self._conn.commit()

    def set_meta(self, key: str, value: Any) -> None:
        self._execute(
            "INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(value, default=str)),
        )

    def get_meta(self, key: str) -> Any:
        rows = self._query("SELECT value FROM meta WHERE key=?", (key,))
        return json.loads(rows[0]["value"]) if rows else None

    # ------------------------------------------------------------ queries

    def query_done(self, source: str, query: str) -> bool:
        rows = self._query("SELECT status FROM queries WHERE source=? AND query=?", (source, query))
        return bool(rows) and rows[0]["status"] == URL_DONE

    def mark_query(self, source: str, query: str, category: str, status: str, count: int = 0, error: str = "") -> None:
        self._execute(
            """INSERT INTO queries(source, query, category, status, result_count, last_attempt, error)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(source, query) DO UPDATE SET status=excluded.status,
               result_count=excluded.result_count, last_attempt=excluded.last_attempt, error=excluded.error""",
            (source, query, category, status, count, utc_now(), error[:500]),
        )

    # ------------------------------------------------------------ candidates

    def add_candidate(self, candidate: Candidate) -> bool:
        """Insert if new. Returns True when the candidate was not seen before."""
        with self._lock:
            cur = self._conn.execute(
                "INSERT OR IGNORE INTO candidates(key, data, created_at) VALUES (?, ?, ?)",
                (candidate.key(), json.dumps(candidate.to_dict(), ensure_ascii=False), utc_now()),
            )
            self._conn.commit()
            return cur.rowcount > 0

    def load_candidates(self) -> list[Candidate]:
        rows = self._query("SELECT data FROM candidates ORDER BY rowid")
        return [Candidate.from_dict(json.loads(r["data"])) for r in rows]

    def candidate_count(self) -> int:
        return int(self._query("SELECT COUNT(*) AS n FROM candidates")[0]["n"])

    # ------------------------------------------------------------ urls

    def url_row(self, url: str) -> sqlite3.Row | None:
        rows = self._query("SELECT * FROM urls WHERE url=?", (url,))
        return rows[0] if rows else None

    def ensure_url(self, url: str, domain: str) -> None:
        self._execute(
            "INSERT OR IGNORE INTO urls(url, domain, status) VALUES (?, ?, ?)", (url, domain, URL_PENDING)
        )

    def mark_url(self, url: str, domain: str, status: str, error: str = "", pages: int = 0) -> None:
        self._execute(
            """INSERT INTO urls(url, domain, status, last_attempt, error, attempts, pages_fetched)
               VALUES (?, ?, ?, ?, ?, 1, ?)
               ON CONFLICT(url) DO UPDATE SET status=excluded.status, last_attempt=excluded.last_attempt,
               error=excluded.error, attempts=urls.attempts + 1, pages_fetched=excluded.pages_fetched""",
            (url, domain, status, utc_now(), error[:500], pages),
        )

    def set_provider_id_for_domain(self, domain: str, provider_id: str) -> None:
        self._execute("UPDATE urls SET provider_id=? WHERE domain=?", (provider_id, domain))

    def url_status_counts(self) -> dict[str, int]:
        rows = self._query("SELECT status, COUNT(*) AS n FROM urls GROUP BY status")
        return {r["status"]: int(r["n"]) for r in rows}

    # ------------------------------------------------------------ raw records

    def save_raw_record(self, record: RawRecord) -> None:
        self._execute(
            """INSERT INTO raw_records(key, source, url, data, created_at) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET data=excluded.data, created_at=excluded.created_at""",
            (
                record.record_key,
                record.source_name,
                record.source_url,
                json.dumps(record.to_dict(), ensure_ascii=False),
                utc_now(),
            ),
        )

    def load_raw_records(self) -> list[RawRecord]:
        rows = self._query("SELECT data FROM raw_records ORDER BY rowid")
        return [RawRecord.from_dict(json.loads(r["data"])) for r in rows]

    # ------------------------------------------------------------ caches

    def get_robots(self, domain: str, max_age_s: float) -> tuple[int, str] | None:
        rows = self._query("SELECT status, body, fetched_at FROM robots_cache WHERE domain=?", (domain,))
        if rows and time.time() - rows[0]["fetched_at"] <= max_age_s:
            return int(rows[0]["status"]), rows[0]["body"]
        return None

    def put_robots(self, domain: str, status: int, body: str) -> None:
        self._execute(
            """INSERT INTO robots_cache(domain, status, body, fetched_at) VALUES (?, ?, ?, ?)
               ON CONFLICT(domain) DO UPDATE SET status=excluded.status, body=excluded.body,
               fetched_at=excluded.fetched_at""",
            (domain, status, body, time.time()),
        )

    def cache_get(self, key: str, max_age_s: float) -> Any:
        rows = self._query("SELECT value, fetched_at FROM kv_cache WHERE key=?", (key,))
        if rows and time.time() - rows[0]["fetched_at"] <= max_age_s:
            return json.loads(rows[0]["value"])
        return None

    def cache_put(self, key: str, value: Any) -> None:
        self._execute(
            """INSERT INTO kv_cache(key, value, fetched_at) VALUES (?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET value=excluded.value, fetched_at=excluded.fetched_at""",
            (key, json.dumps(value, ensure_ascii=False, default=str), time.time()),
        )
