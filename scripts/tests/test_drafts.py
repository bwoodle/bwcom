"""Tests for offline training-log draft helpers."""

from __future__ import annotations

import json

import pytest

from strava_pipeline.drafts import (
    apply_entry_overrides,
    load_activities_json,
    load_entry_overrides,
)


def test_load_activities_json_reads_saved_activities(tmp_path):
    path = tmp_path / "activities.json"
    path.write_text(
        json.dumps(
            [
                {
                    "type": "Run",
                    "distance": 8046.72,
                    "start_date_local": "2026-04-01T07:30:00Z",
                    "name": "Morning Run",
                }
            ]
        ),
        encoding="utf-8",
    )

    activities = load_activities_json(path)

    assert len(activities) == 1
    assert activities[0]["name"] == "Morning Run"


def test_load_entry_overrides_validates_object_values(tmp_path):
    path = tmp_path / "overrides.json"
    path.write_text(
        json.dumps(
            {
                "daily#2026-04-01#workout1": {
                    "description": "Edited description",
                    "highlight": True,
                }
            }
        ),
        encoding="utf-8",
    )

    overrides = load_entry_overrides(path)

    assert overrides["daily#2026-04-01#workout1"]["highlight"] is True


def test_apply_entry_overrides_merges_patches_by_sk():
    entries = [
        {
            "logId": "indy-2025",
            "sk": "daily#2025-11-08#workout1",
            "date": "2025-11-08",
            "entryType": "daily",
            "slot": "workout1",
            "description": "Indy Monumental Marathon (2:28:27)",
            "miles": 26.8,
            "createdAt": "2026-01-01T00:00:00Z",
        }
    ]
    overrides = {
        "daily#2025-11-08#workout1": {
            "description": "0.5 mile warmup\nIndy Monumental Marathon (2:28:27)",
            "highlight": True,
        }
    }

    merged = apply_entry_overrides(entries, overrides)

    assert merged[0]["description"].startswith("0.5 mile warmup")
    assert merged[0]["highlight"] is True


def test_load_entry_overrides_rejects_non_object(tmp_path):
    path = tmp_path / "overrides.json"
    path.write_text(json.dumps(["bad"]), encoding="utf-8")

    with pytest.raises(ValueError):
        load_entry_overrides(path)
