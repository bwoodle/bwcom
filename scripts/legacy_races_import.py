"""CLI for staging legacy spreadsheet race rows into the test races table."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from legacy_races_pipeline.dedupe import apply_date_dedupe
from legacy_races_pipeline.dynamo_writer import scan_occupied_dates, stage_entries
from legacy_races_pipeline.normalize import classify_row
from legacy_races_pipeline.parser import parse_workbook


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Stage legacy race spreadsheet rows into the test races table."
    )
    parser.add_argument("--workbook", required=True, help="Path to the .xlsx workbook.")
    parser.add_argument(
        "--sheet",
        help="Optional sheet name. Defaults to the active sheet.",
    )
    parser.add_argument(
        "--test-table",
        default="races-test-v1",
        help="Destination DynamoDB table for staged rows.",
    )
    parser.add_argument(
        "--prod-table",
        default="races-prod-v1",
        help="Read-only DynamoDB table used for date-based dedupe.",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write stage-ready rows into the test table. Dry-run by default.",
    )
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    workbook_path = Path(args.workbook)
    batch_id = datetime.now(UTC).strftime("legacy-races-%Y%m%dT%H%M%SZ")

    parsed_rows = parse_workbook(workbook_path, sheet_name=args.sheet)
    classified_rows = [classify_row(row) for row in parsed_rows]

    occupied_dates = scan_occupied_dates(args.test_table) | scan_occupied_dates(
        args.prod_table
    )
    deduped_rows = apply_date_dedupe(classified_rows, occupied_dates)

    ready_rows = [
        row.normalized
        for row in deduped_rows
        if row.classification == "ready-to-stage" and row.normalized is not None
    ]
    write_result = stage_entries(
        ready_rows,
        table_name=args.test_table,
        import_batch_id=batch_id,
        dry_run=not args.write,
    )

    counts = Counter(row.classification for row in deduped_rows)
    report = {
        "workbook": str(workbook_path),
        "sheet": args.sheet,
        "dryRun": not args.write,
        "importBatchId": batch_id,
        "counts": dict(sorted(counts.items())),
        "readyToStage": [
            {
                "rowId": row.parsed_row.row_id,
                "date": row.normalized.iso_date,
                "distance": row.normalized.distance,
                "time": row.normalized.time,
                "name": row.normalized.name,
                "comments": row.normalized.comments,
            }
            for row in deduped_rows
            if row.classification == "ready-to-stage" and row.normalized is not None
        ],
        "manualReview": [
            {
                "rowId": row.parsed_row.row_id,
                "classification": row.classification,
                "reasons": row.reasons,
                "values": row.parsed_row.values,
            }
            for row in deduped_rows
            if row.classification.startswith("manual-review")
        ],
        "excluded": [
            {
                "rowId": row.parsed_row.row_id,
                "classification": row.classification,
                "reasons": row.reasons,
                "values": row.parsed_row.values,
            }
            for row in deduped_rows
            if row.classification.startswith("excluded")
        ],
        "writeResult": write_result,
    }

    print(json.dumps(report, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
