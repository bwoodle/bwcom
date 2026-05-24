"""Helpers for offline training-log draft iteration."""

from __future__ import annotations

import json
from pathlib import Path
from typing import cast

from strava_pipeline.models import JsonObject, StravaActivity, TrainingLogEntry


def load_activities_json(path: str | Path) -> list[StravaActivity]:
    """Load a saved Strava activities array from JSON."""
    parsed = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(parsed, list):
        raise ValueError("Activities JSON must be a list")

    activities: list[StravaActivity] = []
    for item in parsed:
        if not isinstance(item, dict):
            raise ValueError("Each activity JSON item must be an object")
        activities.append(cast(StravaActivity, {str(k): v for k, v in item.items()}))

    return activities


def load_entry_overrides(path: str | Path) -> dict[str, JsonObject]:
    """Load entry overrides keyed by training-log sort key."""
    parsed = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(parsed, dict):
        raise ValueError("Overrides JSON must be an object keyed by sk")

    overrides: dict[str, JsonObject] = {}
    for key, value in parsed.items():
        if not isinstance(key, str) or not isinstance(value, dict):
            raise ValueError("Each override must be an object keyed by a string sk")
        overrides[key] = {str(k): v for k, v in value.items()}

    return overrides


def apply_entry_overrides(
    entries: list[TrainingLogEntry],
    overrides: dict[str, JsonObject],
) -> list[TrainingLogEntry]:
    """Apply per-entry patch overrides keyed by sort key."""
    merged: list[TrainingLogEntry] = []
    for entry in entries:
        patch = overrides.get(entry["sk"])
        if patch is None:
            merged.append(entry)
            continue

        merged_entry = dict(entry)
        merged_entry.update(patch)
        merged.append(cast(TrainingLogEntry, merged_entry))

    return merged


def write_entries_json(path: str | Path, entries: list[TrainingLogEntry]) -> None:
    """Write training-log entries to JSON for offline review."""
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")
