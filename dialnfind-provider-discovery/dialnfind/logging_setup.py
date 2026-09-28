"""Structured logging with pipeline stage tags ([CRAWL], [EXTRACT], ...)."""

from __future__ import annotations

import json
import logging
import sys
from typing import Any

LOGGER_NAME = "dialnfind"


class TagFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        tag = getattr(record, "tag", "")
        record.tagged = f"[{tag}] {record.getMessage()}" if tag else record.getMessage()
        return super().format(record)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "tag": getattr(record, "tag", ""),
            "msg": record.getMessage(),
        }
        payload.update(getattr(record, "fields", {}) or {})
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging(level: str = "INFO", log_file: str = "", fmt: str = "text") -> None:
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level.upper())
    if fmt == "json":
        formatter: logging.Formatter = JsonFormatter()
    else:
        formatter = TagFormatter("%(asctime)s %(levelname)-7s %(tagged)s", "%H:%M:%S")
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stderr)]
    if log_file:
        handlers.append(logging.FileHandler(log_file, encoding="utf-8"))
    for handler in handlers:
        handler.setFormatter(formatter)
        root.addHandler(handler)
    for noisy in ("httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"{LOGGER_NAME}.{name}")


def event(logger: logging.Logger, tag: str, msg: str, *args: Any, level: int = logging.INFO, **fields: Any) -> None:
    """Log a tagged pipeline event: ``event(log, "CRAWL", "example.com", pages=3)``."""
    logger.log(level, msg, *args, extra={"tag": tag, "fields": fields})
