"""Tests for legacy_races_pipeline.dynamo_writer."""

from __future__ import annotations

from unittest.mock import MagicMock

from legacy_races_pipeline.dynamo_writer import scan_occupied_dates, stage_entries
from legacy_races_pipeline.models import NormalizedLegacyRace


def make_race(iso_date: str) -> NormalizedLegacyRace:
    return NormalizedLegacyRace(
        legacy_source_row_id=f"Legacy!{iso_date}",
        iso_date=iso_date,
        display_date=iso_date,
        distance="5K",
        time="18:00",
        vdot=61.5,
        name="Road 5K",
        comments="Cool weather",
    )


def test_scan_occupied_dates_collects_dates_from_paginated_table_scan():
    mock_resource = MagicMock()
    mock_table = MagicMock()
    mock_resource.Table.return_value = mock_table
    mock_table.scan.side_effect = [
        {
            "Items": [{"sk": "2014-05-01#5K"}, {"sk": "2014-05-08#10K"}],
            "LastEvaluatedKey": {"yearKey": "2014", "sk": "2014-05-08#10K"},
        },
        {
            "Items": [{"sk": "2014-06-01#Half Marathon"}],
        },
    ]

    occupied = scan_occupied_dates("races-test-v1", boto3_resource=mock_resource)

    assert occupied == {"2014-05-01", "2014-05-08", "2014-06-01"}


def test_stage_entries_dry_run_does_not_write_anything():
    mock_resource = MagicMock()

    result = stage_entries(
        [make_race("2018-03-17")],
        table_name="races-test-v1",
        import_batch_id="batch-123",
        dry_run=True,
        boto3_resource=mock_resource,
    )

    assert result == {"written": 0, "skipped": 0, "failed": 0}
    mock_resource.Table.assert_not_called()


def test_stage_entries_writes_expected_metadata():
    mock_resource = MagicMock()
    mock_table = MagicMock()
    mock_resource.Table.return_value = mock_table

    result = stage_entries(
        [make_race("2018-03-17")],
        table_name="races-test-v1",
        import_batch_id="batch-123",
        dry_run=False,
        boto3_resource=mock_resource,
        created_at="2026-03-01T12:00:00Z",
    )

    assert result == {"written": 1, "skipped": 0, "failed": 0}

    put_call = mock_table.put_item.call_args.kwargs
    assert put_call["Item"]["yearKey"] == "2018"
    assert put_call["Item"]["sk"] == "2018-03-17#5K"
    assert put_call["Item"]["source"] == "legacy-spreadsheet"
    assert put_call["Item"]["importBatchId"] == "batch-123"
    assert put_call["Item"]["legacySourceRowId"] == "Legacy!2018-03-17"
    assert put_call["Item"]["validationState"] == "staged"
