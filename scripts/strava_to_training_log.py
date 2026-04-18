#!/usr/bin/env python3
"""CLI entrypoint: Fetch Strava activities and generate training-log entries.

Usage:
    # First run — exchange OAuth code:
    python3 scripts/strava_to_training_log.py \
        --start-date 2026-04-01 --end-date 2026-04-12 \
        --log-id paris-2026 --code YOUR_AUTH_CODE

    # Subsequent runs (tokens auto-refresh):
    python3 scripts/strava_to_training_log.py \
        --start-date 2026-04-01 --end-date 2026-04-12 \
        --log-id paris-2026

    # Write to DynamoDB (default is dry-run):
    python3 scripts/strava_to_training_log.py \
        --start-date 2026-04-01 --end-date 2026-04-12 \
        --log-id paris-2026 --env test --write
"""

from __future__ import annotations

import argparse
import sys

from strava_pipeline.dynamo_writer import write_entries
from strava_pipeline.strava_client import (
    DEFAULT_CREDENTIALS_PATH,
    date_range_to_epochs,
    ensure_access_token,
    fetch_activities,
    load_credentials,
    save_credentials,
)
from strava_pipeline.transform import (
    build_daily_entries,
    build_weekly_entries,
    filter_activities,
    format_entries_preview,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch Strava activities and generate training-log entries"
    )
    parser.add_argument("--start-date", required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument(
        "--end-date", required=True, help="End date (YYYY-MM-DD, inclusive)"
    )
    parser.add_argument(
        "--log-id", required=True, help="Training log ID (e.g., paris-2026)"
    )
    parser.add_argument(
        "--env",
        choices=["test", "prod"],
        default="test",
        help="Target environment (default: test)",
    )
    parser.add_argument("--code", help="One-time Strava OAuth authorization code")
    parser.add_argument(
        "--write",
        action="store_true",
        help="Actually write to DynamoDB (default is dry-run preview)",
    )
    parser.add_argument(
        "--credentials",
        default=DEFAULT_CREDENTIALS_PATH,
        help=f"Path to credentials file (default: {DEFAULT_CREDENTIALS_PATH})",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    table_name = f"training-log-{args.env}-v1"

    # Load and validate credentials
    creds = load_credentials(args.credentials)
    creds = ensure_access_token(creds, code=args.code)
    save_credentials(args.credentials, creds)

    # Fetch activities from Strava
    after_epoch, before_epoch = date_range_to_epochs(args.start_date, args.end_date)
    print(
        f"Fetching activities from {args.start_date} to {args.end_date}...",
        file=sys.stderr,
    )
    activities, _ = fetch_activities(
        creds["STRAVA_ACCESS_TOKEN"], after_epoch, before_epoch
    )

    # Filter and transform
    filtered = filter_activities(activities)
    print(
        f"Found {len(activities)} total activities, {len(filtered)} Run/Walk",
        file=sys.stderr,
    )

    daily = build_daily_entries(filtered, args.log_id)
    weekly = build_weekly_entries(daily, args.log_id, args.start_date, args.end_date)
    all_entries = daily + weekly

    # Preview
    print("\n" + format_entries_preview(all_entries))
    print(
        "\n"
        f"{len(daily)} daily entries + {len(weekly)} weekly summaries = "
        f"{len(all_entries)} total\n"
    )

    # Write
    counts = write_entries(all_entries, table_name, dry_run=not args.write)
    if args.write:
        print(
            f"\nResults: {counts['written']} written, "
            f"{counts['skipped']} skipped, {counts['failed']} failed"
        )
    else:
        print(f"Re-run with --write to push to {table_name}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
