"""Tests for strava_pipeline.dynamo_writer."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from strava_pipeline.dynamo_writer import write_entries


class TestWriteEntries:
    def test_dry_run_no_writes(self):
        entries = [{"logId": "test", "sk": "daily#2026-04-01#workout1"}]
        result = write_entries(entries, "test-table", dry_run=True)
        assert result == {"written": 0, "skipped": 0, "failed": 0}

    def test_successful_write(self):
        mock_resource = MagicMock()
        mock_table = MagicMock()
        mock_resource.Table.return_value = mock_table
        mock_table.put_item.return_value = {}

        entries = [
            {"logId": "test", "sk": "daily#2026-04-01#workout1", "miles": 5.0},
        ]
        result = write_entries(entries, "test-table", dry_run=False, boto3_resource=mock_resource)
        assert result["written"] == 1
        assert result["skipped"] == 0
        mock_table.put_item.assert_called_once()

    def test_duplicate_skipped(self):
        from botocore.exceptions import ClientError

        mock_resource = MagicMock()
        mock_table = MagicMock()
        mock_resource.Table.return_value = mock_table
        mock_table.put_item.side_effect = ClientError(
            {"Error": {"Code": "ConditionalCheckFailedException", "Message": "exists"}},
            "PutItem",
        )

        entries = [{"logId": "test", "sk": "daily#2026-04-01#workout1"}]
        result = write_entries(entries, "test-table", dry_run=False, boto3_resource=mock_resource)
        assert result["skipped"] == 1
        assert result["written"] == 0

    def test_other_error_counted_as_failed(self):
        from botocore.exceptions import ClientError

        mock_resource = MagicMock()
        mock_table = MagicMock()
        mock_resource.Table.return_value = mock_table
        mock_table.put_item.side_effect = ClientError(
            {"Error": {"Code": "ProvisionedThroughputExceededException", "Message": "throttled"}},
            "PutItem",
        )

        entries = [{"logId": "test", "sk": "daily#2026-04-01#workout1"}]
        result = write_entries(entries, "test-table", dry_run=False, boto3_resource=mock_resource)
        assert result["failed"] == 1
        assert result["written"] == 0
