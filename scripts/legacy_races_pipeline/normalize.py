"""Pure normalization and classification helpers for legacy race rows."""

from __future__ import annotations

import re
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from legacy_races_pipeline.models import (
    ClassifiedLegacyRaceRow,
    NormalizedLegacyRace,
    ParsedWorkbookRow,
)

_DATE_HEADER_KEYS = {"date", "race date"}
_NAME_HEADER_KEYS = {"race", "race name", "name"}
_NOTES_HEADER_KEYS = {"notes", "note", "comments", "comment"}
_VDOT_HEADER_KEYS = {"vdot"}
_DISTANCE_PATTERNS: tuple[tuple[str, str], ...] = (
    ("half marathon", "Half Marathon"),
    ("10 mile", "10 Mile"),
    ("8 mile", "8 Mile"),
    ("marathon", "Marathon"),
    ("50k", "50K"),
    ("15k", "15K"),
    ("10k", "10K"),
    ("5k", "5K"),
)
_TIME_PATTERN = re.compile(r"^\d{1,2}:\d{2}(?::\d{2})?\*?$")


def _normalize_key(value: str) -> str:
    return " ".join(str(value).strip().lower().replace("_", " ").split())


def _find_header(values: dict[str, object], candidates: set[str]) -> str | None:
    for header in values:
        if _normalize_key(header) in candidates:
            return header
    return None


def _normalize_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalize_name(value: object) -> str | None:
    text = _normalize_text(value)
    if text is None or text.lower() == "unknown":
        return None
    return text


def _infer_distance(header: str) -> str | None:
    normalized = _normalize_key(header)
    for needle, distance in _DISTANCE_PATTERNS:
        if needle in normalized:
            return distance
    return None


def _extract_result_candidates(values: dict[str, object]) -> list[tuple[str, object]]:
    candidates: list[tuple[str, object]] = []
    for header, value in values.items():
        if _normalize_text(value) is None:
            continue
        distance = _infer_distance(header)
        if distance is not None:
            candidates.append((distance, value))
    return candidates


def _format_display_date(value: date) -> str:
    return value.strftime("%b %-d, %Y")


def _parse_date(value: object) -> tuple[str | None, str | None]:
    if value is None:
        return None, "missing"
    if isinstance(value, datetime):
        return value.date().isoformat(), None
    if isinstance(value, date):
        return value.isoformat(), None

    text = _normalize_text(value)
    if text is None:
        return None, "missing"
    if "??" in text:
        return None, "ambiguous"

    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%m-%d-%Y", "%m-%d-%y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat(), None
        except ValueError:
            continue

    return None, "ambiguous"


def _format_duration(value: timedelta) -> str:
    total_seconds = int(value.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


def _parse_time(value: object) -> tuple[str | None, str | None]:
    if value is None:
        return None, "missing"
    if isinstance(value, timedelta):
        return _format_duration(value), None
    if isinstance(value, datetime):
        return value.astimezone(UTC).strftime("%H:%M:%S"), None
    if isinstance(value, time):
        return value.strftime("%H:%M:%S"), None

    text = _normalize_text(value)
    if text is None:
        return None, "missing"
    if "??" in text:
        return None, "ambiguous"
    if not _TIME_PATTERN.match(text):
        return None, "ambiguous"
    return text, None


def _parse_vdot(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float | Decimal):
        return float(value)

    text = _normalize_text(value)
    if text is None:
        return None

    try:
        return float(text)
    except ValueError:
        return None


def classify_row(row: ParsedWorkbookRow) -> ClassifiedLegacyRaceRow:
    """Classify a parsed workbook row into stage-ready, review, or excluded."""
    if row.has_strikethrough:
        return ClassifiedLegacyRaceRow(
            parsed_row=row,
            classification="excluded-strikethrough",
            reasons=["Row is marked with strikethrough in the workbook."],
            normalized=None,
        )

    if not row.formatting_available:
        return ClassifiedLegacyRaceRow(
            parsed_row=row,
            classification="manual-review-formatting-missing",
            reasons=["Workbook formatting metadata was not available."],
            normalized=None,
        )

    date_header = _find_header(row.values, _DATE_HEADER_KEYS)
    if date_header is None:
        return ClassifiedLegacyRaceRow(
            parsed_row=row,
            classification="manual-review-missing-required-fields",
            reasons=["No date column was found."],
            normalized=None,
        )

    iso_date, date_error = _parse_date(row.values.get(date_header))
    if date_error == "ambiguous":
        return ClassifiedLegacyRaceRow(
            parsed_row=row,
            classification="manual-review-ambiguous-date",
            reasons=["Date is incomplete or ambiguous."],
            normalized=None,
        )
    if date_error == "missing" or iso_date is None:
        return ClassifiedLegacyRaceRow(
            parsed_row=row,
            classification="manual-review-missing-required-fields",
            reasons=["Date is required."],
            normalized=None,
        )

    result_candidates = _extract_result_candidates(row.values)
    if len(result_candidates) != 1:
        return ClassifiedLegacyRaceRow(
            parsed_row=row,
            classification="manual-review-missing-required-fields",
            reasons=["Exactly one populated distance/result column is required."],
            normalized=None,
        )

    distance, raw_time = result_candidates[0]
    normalized_time, time_error = _parse_time(raw_time)
    if time_error == "ambiguous":
        return ClassifiedLegacyRaceRow(
            parsed_row=row,
            classification="manual-review-ambiguous-time",
            reasons=["Time is incomplete or ambiguous."],
            normalized=None,
        )
    if time_error == "missing" or normalized_time is None:
        return ClassifiedLegacyRaceRow(
            parsed_row=row,
            classification="manual-review-missing-required-fields",
            reasons=["A result time is required."],
            normalized=None,
        )

    name_header = _find_header(row.values, _NAME_HEADER_KEYS)
    notes_header = _find_header(row.values, _NOTES_HEADER_KEYS)
    vdot_header = _find_header(row.values, _VDOT_HEADER_KEYS)
    normalized_date = datetime.strptime(iso_date, "%Y-%m-%d").date()

    normalized = NormalizedLegacyRace(
        legacy_source_row_id=row.row_id,
        iso_date=iso_date,
        display_date=_format_display_date(normalized_date),
        distance=distance,
        time=normalized_time,
        vdot=_parse_vdot(row.values.get(vdot_header)) if vdot_header else None,
        name=_normalize_name(row.values.get(name_header)) if name_header else None,
        comments=(
            _normalize_text(row.values.get(notes_header)) if notes_header else None
        ),
    )

    return ClassifiedLegacyRaceRow(
        parsed_row=row,
        classification="ready-to-stage",
        reasons=[],
        normalized=normalized,
    )
