"""DynamoDB write layer with duplicate detection.

Writes training-log entries using PutItem with a condition expression
to avoid overwriting existing entries.
"""

from __future__ import annotations

import sys
from decimal import Decimal
from typing import Any


def _convert_floats(item: dict[str, Any]) -> dict[str, Any]:
    """Convert float values to Decimal for DynamoDB compatibility."""
    converted = {}
    for k, v in item.items():
        if isinstance(v, float):
            converted[k] = Decimal(str(v))
        elif isinstance(v, bool):
            converted[k] = v
        else:
            converted[k] = v
    return converted


def write_entries(
    entries: list[dict[str, Any]],
    table_name: str,
    dry_run: bool = True,
    boto3_resource: Any = None,
) -> dict[str, int]:
    """Write entries to DynamoDB, skipping duplicates.

    Args:
        entries: List of DynamoDB item dicts.
        table_name: DynamoDB table name.
        dry_run: If True, only preview — don't write.
        boto3_resource: Injectable DynamoDB resource (for testing).

    Returns:
        Dict with counts: {"written": N, "skipped": N, "failed": N}
    """
    if dry_run:
        print(f"[DRY RUN] Would write {len(entries)} entries to {table_name}", file=sys.stderr)
        return {"written": 0, "skipped": 0, "failed": 0}

    import boto3
    from botocore.exceptions import ClientError

    if boto3_resource is None:
        boto3_resource = boto3.resource("dynamodb", region_name="us-west-2")

    table = boto3_resource.Table(table_name)
    counts = {"written": 0, "skipped": 0, "failed": 0}

    for entry in entries:
        item = _convert_floats(entry)
        try:
            table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(logId) AND attribute_not_exists(sk)",
            )
            counts["written"] += 1
            print(f"  ✓ {entry['sk']}", file=sys.stderr)
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                counts["skipped"] += 1
                print(f"  ⏭ {entry['sk']} (already exists)", file=sys.stderr)
            else:
                counts["failed"] += 1
                print(f"  ✗ {entry['sk']}: {e}", file=sys.stderr)

    return counts
