"""Shared types for the legacy race import pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol, TypedDict

type Classification = Literal[
    "ready-to-stage",
    "excluded-strikethrough",
    "manual-review-formatting-missing",
    "manual-review-ambiguous-date",
    "manual-review-ambiguous-time",
    "manual-review-missing-required-fields",
    "manual-review-duplicate-date",
    "excluded-existing-date",
]


@dataclass(frozen=True)
class ParsedWorkbookRow:
    row_id: str
    source_sheet: str
    values: dict[str, object]
    formatting_available: bool
    has_strikethrough: bool


@dataclass(frozen=True)
class NormalizedLegacyRace:
    legacy_source_row_id: str
    iso_date: str
    display_date: str
    distance: str
    time: str
    vdot: float | None
    name: str | None
    comments: str | None


@dataclass(frozen=True)
class ClassifiedLegacyRaceRow:
    parsed_row: ParsedWorkbookRow
    classification: Classification
    reasons: list[str]
    normalized: NormalizedLegacyRace | None


class DynamoTableLike(Protocol):
    def scan(
        self,
        *,
        ProjectionExpression: str,
        ExclusiveStartKey: dict[str, object] | None = None,
    ) -> dict[str, object]: ...

    def put_item(
        self,
        *,
        Item: dict[str, object],
        ConditionExpression: str,
    ) -> object: ...


class DynamoResourceLike(Protocol):
    def Table(self, name: str) -> DynamoTableLike: ...


class WriteCounts(TypedDict):
    written: int
    skipped: int
    failed: int
