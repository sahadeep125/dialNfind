"""Discovery source interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import ClassVar

from ..classification import CategoryRule
from ..config import Settings
from ..crawler import Crawler
from ..models import Candidate, Location
from ..state import StateStore


@dataclass
class SourceContext:
    settings: Settings
    crawler: Crawler
    state: StateStore
    rules: dict[str, CategoryRule]
    location: Location


class DiscoverySource(ABC):
    """A pluggable producer of candidates.

    ``query_mode`` tells the discovery engine how to call :meth:`discover`:

    * ``"query"``    -- once per generated search query ("AC repair Siliguri")
    * ``"category"`` -- once per category
    * ``"once"``     -- once per run (e.g. a manual URL list)
    """

    name: ClassVar[str]
    config_key: ClassVar[str]  # key under `sources:` in config.yaml
    query_mode: ClassVar[str] = "query"

    def __init__(self, ctx: SourceContext) -> None:
        self.ctx = ctx

    def available(self) -> tuple[bool, str]:
        """(usable, reason). E.g. an API source without credentials is unavailable."""
        return True, ""

    @abstractmethod
    def discover(self, query: str, location: Location, category: str) -> list[Candidate]:
        raise NotImplementedError
