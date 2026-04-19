"""Tests for legacy_races_pipeline.dedupe."""

from __future__ import annotations

from legacy_races_pipeline.dedupe import apply_date_dedupe
from legacy_races_pipeline.models import (
    ClassifiedLegacyRaceRow,
    NormalizedLegacyRace,
    ParsedWorkbookRow,
)


def make_ready_row(row_id: str, iso_date: str) -> ClassifiedLegacyRaceRow:
    parsed = ParsedWorkbookRow(
        row_id=row_id,
        source_sheet="Legacy",
        values={"Date": iso_date},
        formatting_available=True,
        has_strikethrough=False,
    )
    normalized = NormalizedLegacyRace(
        legacy_source_row_id=row_id,
        iso_date=iso_date,
        display_date=iso_date,
        distance="5K",
        time="18:00",
        vdot=None,
        name=None,
        comments=None,
    )
    return ClassifiedLegacyRaceRow(
        parsed_row=parsed,
        classification="ready-to-stage",
        reasons=[],
        normalized=normalized,
    )


def test_apply_date_dedupe_excludes_rows_with_existing_test_or_prod_dates():
    rows = [make_ready_row("Legacy!2", "2016-04-09")]

    deduped = apply_date_dedupe(rows, occupied_dates={"2016-04-09"})

    assert deduped[0].classification == "excluded-existing-date"
    assert deduped[0].normalized is None


def test_apply_date_dedupe_routes_later_batch_duplicates_to_review():
    rows = [
        make_ready_row("Legacy!2", "2017-06-10"),
        make_ready_row("Legacy!3", "2017-06-10"),
        make_ready_row("Legacy!4", "2017-06-11"),
    ]

    deduped = apply_date_dedupe(rows, occupied_dates=set())

    assert deduped[0].classification == "ready-to-stage"
    assert deduped[1].classification == "manual-review-duplicate-date"
    assert deduped[1].normalized is None
    assert deduped[2].classification == "ready-to-stage"
