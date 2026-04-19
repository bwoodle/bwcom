"""Tests for legacy_races_pipeline.normalize."""

from __future__ import annotations

from legacy_races_pipeline.models import ParsedWorkbookRow
from legacy_races_pipeline.normalize import classify_row


def make_row(
    values: dict[str, object],
    *,
    row_id: str = "Legacy!2",
    formatting_available: bool = True,
    has_strikethrough: bool = False,
) -> ParsedWorkbookRow:
    return ParsedWorkbookRow(
        row_id=row_id,
        source_sheet="Legacy",
        values=values,
        formatting_available=formatting_available,
        has_strikethrough=has_strikethrough,
    )


def test_classify_row_returns_ready_to_stage_for_valid_annotated_time():
    row = make_row(
        {
            "Date": "9/18/2010",
            "Race Name": "Downtown 5K",
            "5K": "15:30*",
            "VDOT": "67.1",
            "Notes": "Hot morning",
        }
    )

    classified = classify_row(row)

    assert classified.classification == "ready-to-stage"
    assert classified.normalized is not None
    assert classified.normalized.iso_date == "2010-09-18"
    assert classified.normalized.distance == "5K"
    assert classified.normalized.time == "15:30*"
    assert classified.normalized.vdot == 67.1
    assert classified.normalized.name == "Downtown 5K"
    assert classified.normalized.comments == "Hot morning"


def test_classify_row_routes_ambiguous_date_to_manual_review():
    row = make_row(
        {
            "Date": "3/??/2015",
            "Race Name": "Unknown Meet",
            "10K": "33:10",
        }
    )

    classified = classify_row(row)

    assert classified.classification == "manual-review-ambiguous-date"
    assert classified.normalized is None


def test_classify_row_routes_ambiguous_time_to_manual_review():
    row = make_row(
        {
            "Date": "2015-03-14",
            "Race Name": "River Run",
            "Half Marathon": "2:40:??",
        }
    )

    classified = classify_row(row)

    assert classified.classification == "manual-review-ambiguous-time"
    assert classified.normalized is None


def test_classify_row_allows_blank_or_unknown_name_when_other_fields_are_valid():
    row = make_row(
        {
            "Date": "2018-07-04",
            "Race Name": "Unknown",
            "Marathon": "2:19:45",
            "Notes": "",
        }
    )

    classified = classify_row(row)

    assert classified.classification == "ready-to-stage"
    assert classified.normalized is not None
    assert classified.normalized.name is None
    assert classified.normalized.comments is None


def test_classify_row_routes_formatting_uncertain_rows_to_manual_review():
    row = make_row(
        {
            "Date": "2019-11-28",
            "Race Name": "Turkey Trot",
            "5K": "16:01",
        },
        formatting_available=False,
    )

    classified = classify_row(row)

    assert classified.classification == "manual-review-formatting-missing"
    assert classified.normalized is None
