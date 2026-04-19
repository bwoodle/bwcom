"""DynamoDB reads/writes for staging legacy races into the test table."""

from __future__ import annotations

import sys
from datetime import UTC, datetime
from decimal import Decimal

from legacy_races_pipeline.models import (
    DynamoResourceLike,
    NormalizedLegacyRace,
    WriteCounts,
)


def _as_decimal(value: float | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def scan_occupied_dates(
    table_name: str,
    boto3_resource: DynamoResourceLike | None = None,
) -> set[str]:
    """Scan a races table and return the occupied YYYY-MM-DD calendar dates."""
    if boto3_resource is None:
        import boto3

        boto3_resource = boto3.resource("dynamodb", region_name="us-west-2")

    table = boto3_resource.Table(table_name)
    occupied: set[str] = set()
    last_evaluated_key: dict[str, object] | None = None

    while True:
        response = table.scan(
            ProjectionExpression="sk",
            ExclusiveStartKey=last_evaluated_key,
        )
        raw_items = response.get("Items", [])
        items = raw_items if isinstance(raw_items, list) else []
        for item in items:
            if not isinstance(item, dict):
                continue
            sk = item.get("sk")
            if isinstance(sk, str) and "#" in sk:
                occupied.add(sk.split("#", 1)[0])

        next_key = response.get("LastEvaluatedKey")
        if not isinstance(next_key, dict):
            break
        last_evaluated_key = next_key

    return occupied


def _build_stage_item(
    race: NormalizedLegacyRace,
    import_batch_id: str,
    created_at: str,
) -> dict[str, object]:
    item: dict[str, object] = {
        "yearKey": race.iso_date[:4],
        "sk": f"{race.iso_date}#{race.distance}",
        "date": race.display_date,
        "distance": race.distance,
        "time": race.time,
        "source": "legacy-spreadsheet",
        "importBatchId": import_batch_id,
        "legacySourceRowId": race.legacy_source_row_id,
        "validationState": "staged",
        "createdAt": created_at,
    }

    vdot = _as_decimal(race.vdot)
    if vdot is not None:
        item["vdot"] = vdot
    if race.name is not None:
        item["name"] = race.name
    if race.comments is not None:
        item["comments"] = race.comments

    return item


def stage_entries(
    entries: list[NormalizedLegacyRace],
    table_name: str,
    import_batch_id: str,
    dry_run: bool = True,
    boto3_resource: DynamoResourceLike | None = None,
    created_at: str | None = None,
) -> WriteCounts:
    """Stage normalized rows into the test races table."""
    if dry_run:
        print(
            f"[DRY RUN] Would stage {len(entries)} legacy race rows into {table_name}",
            file=sys.stderr,
        )
        return {"written": 0, "skipped": 0, "failed": 0}

    if boto3_resource is None:
        import boto3
        from botocore.exceptions import ClientError
    else:
        from botocore.exceptions import ClientError

    if boto3_resource is None:
        import boto3

        boto3_resource = boto3.resource("dynamodb", region_name="us-west-2")

    table = boto3_resource.Table(table_name)
    counts: WriteCounts = {"written": 0, "skipped": 0, "failed": 0}
    write_created_at = created_at or datetime.now(UTC).isoformat().replace(
        "+00:00", "Z"
    )

    for entry in entries:
        item = _build_stage_item(
            entry,
            import_batch_id=import_batch_id,
            created_at=write_created_at,
        )
        try:
            table.put_item(
                Item=item,
                ConditionExpression=(
                    "attribute_not_exists(yearKey) AND attribute_not_exists(sk)"
                ),
            )
            counts["written"] += 1
            print(f"  ✓ {item['sk']}", file=sys.stderr)
        except ClientError as exc:
            if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
                counts["skipped"] += 1
                print(f"  ⏭ {item['sk']} (already exists)", file=sys.stderr)
            else:
                counts["failed"] += 1
                print(f"  ✗ {item['sk']}: {exc}", file=sys.stderr)

    return counts
