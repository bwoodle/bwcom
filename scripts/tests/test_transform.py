"""Tests for strava_pipeline.transform — pure transformation logic."""

from __future__ import annotations

from strava_pipeline.transform import (
    build_daily_entries,
    build_weekly_entries,
    classify_slot,
    filter_activities,
    format_entries_preview,
    meters_to_miles,
)
from tests.conftest import make_activity


class TestMetersToMiles:
    def test_known_conversion(self):
        assert meters_to_miles(1609.344) == 1.0

    def test_marathon(self):
        assert meters_to_miles(42195.0) == 26.2

    def test_zero(self):
        assert meters_to_miles(0) == 0.0

    def test_short_distance(self):
        assert meters_to_miles(3218.69) == 2.0


class TestFilterActivities:
    def test_keeps_run(self):
        activities = [make_activity(activity_type="Run")]
        assert len(filter_activities(activities)) == 1

    def test_keeps_walk(self):
        activities = [make_activity(activity_type="Walk")]
        assert len(filter_activities(activities)) == 1

    def test_removes_ride(self):
        activities = [make_activity(activity_type="Ride")]
        assert len(filter_activities(activities)) == 0

    def test_removes_swim(self):
        activities = [make_activity(activity_type="Swim")]
        assert len(filter_activities(activities)) == 0

    def test_mixed(self):
        activities = [
            make_activity(activity_type="Run"),
            make_activity(activity_type="Ride"),
            make_activity(activity_type="Walk"),
            make_activity(activity_type="Swim"),
        ]
        result = filter_activities(activities)
        assert len(result) == 2
        assert result[0]["type"] == "Run"
        assert result[1]["type"] == "Walk"


class TestClassifySlot:
    def test_early_morning(self):
        assert classify_slot("2026-04-01T06:00:00Z") == "workout1"

    def test_late_morning(self):
        assert classify_slot("2026-04-01T11:59:00Z") == "workout1"

    def test_noon_exact(self):
        assert classify_slot("2026-04-01T12:00:00Z") == "workout2"

    def test_afternoon(self):
        assert classify_slot("2026-04-01T17:00:00Z") == "workout2"

    def test_evening(self):
        assert classify_slot("2026-04-01T21:30:00Z") == "workout2"


class TestBuildDailyEntries:
    def test_single_run(self):
        activities = [
            make_activity(
                activity_type="Run",
                distance=8046.72,  # ~5.0 miles
                start_date_local="2026-04-01T07:30:00Z",
            )
        ]
        entries = build_daily_entries(activities, "paris-2026")
        assert len(entries) == 1
        entry = entries[0]
        assert entry["logId"] == "paris-2026"
        assert entry["sk"] == "daily#2026-04-01#workout1"
        assert entry["date"] == "2026-04-01"
        assert entry["entryType"] == "daily"
        assert entry["slot"] == "workout1"
        assert entry["description"] == "5.0 mile run"
        assert entry["miles"] == 5.0
        assert "highlight" not in entry

    def test_single_walk(self):
        activities = [
            make_activity(
                activity_type="Walk",
                distance=3218.69,  # ~2.0 miles
                start_date_local="2026-04-01T06:00:00Z",
            )
        ]
        entries = build_daily_entries(activities, "test-log")
        assert len(entries) == 1
        assert entries[0]["description"] == "2.0 mile walk"

    def test_walk_and_run_same_morning_slot(self):
        activities = [
            make_activity(
                activity_type="Run",
                distance=8851.39,  # ~5.5 miles
                start_date_local="2026-04-01T07:30:00Z",
            ),
            make_activity(
                activity_type="Walk",
                distance=3701.49,  # ~2.3 miles
                start_date_local="2026-04-01T06:00:00Z",
            ),
        ]
        entries = build_daily_entries(activities, "paris-2026")
        assert len(entries) == 1
        entry = entries[0]
        assert entry["slot"] == "workout1"
        # Walk should be listed first
        assert entry["description"] == "2.3 mile walk\n5.5 mile run"
        assert entry["miles"] == 7.8

    def test_afternoon_workout2(self):
        activities = [
            make_activity(
                activity_type="Run",
                distance=9656.06,  # ~6.0 miles
                start_date_local="2026-04-01T17:00:00Z",
            )
        ]
        entries = build_daily_entries(activities, "paris-2026")
        assert len(entries) == 1
        assert entries[0]["slot"] == "workout2"
        assert entries[0]["sk"] == "daily#2026-04-01#workout2"

    def test_highlight_race(self):
        activities = [
            make_activity(
                activity_type="Run",
                distance=42195.0,
                start_date_local="2026-04-12T07:00:00Z",
                workout_type=1,  # Race
            )
        ]
        entries = build_daily_entries(activities, "paris-2026")
        assert entries[0]["highlight"] is True

    def test_highlight_long_run(self):
        activities = [
            make_activity(
                activity_type="Run",
                distance=32186.9,
                start_date_local="2026-04-05T08:00:00Z",
                workout_type=2,  # Long Run
            )
        ]
        entries = build_daily_entries(activities, "paris-2026")
        assert entries[0]["highlight"] is True

    def test_highlight_workout(self):
        activities = [
            make_activity(
                activity_type="Run",
                distance=12874.8,
                start_date_local="2026-04-03T07:00:00Z",
                workout_type=3,  # Workout
            )
        ]
        entries = build_daily_entries(activities, "paris-2026")
        assert entries[0]["highlight"] is True

    def test_no_highlight_default(self):
        activities = [
            make_activity(
                activity_type="Run",
                distance=8046.72,
                start_date_local="2026-04-01T07:30:00Z",
                workout_type=0,
            )
        ]
        entries = build_daily_entries(activities, "paris-2026")
        assert "highlight" not in entries[0]

    def test_no_activities_no_entries(self):
        entries = build_daily_entries([], "paris-2026")
        assert entries == []

    def test_manual_run_is_treadmill(self):
        activities = [
            make_activity(
                activity_type="Run",
                distance=8046.72,
                start_date_local="2026-04-06T17:00:00Z",
            )
        ]
        activities[0]["manual"] = True
        entries = build_daily_entries(activities, "paris-2026")
        assert entries[0]["description"] == "5.0 mile treadmill run"

    def test_manual_walk_stays_walk(self):
        activities = [
            make_activity(
                activity_type="Walk",
                distance=3218.69,
                start_date_local="2026-04-06T06:00:00Z",
            )
        ]
        activities[0]["manual"] = True
        entries = build_daily_entries(activities, "paris-2026")
        assert entries[0]["description"] == "2.0 mile walk"

    def test_multiple_days(self):
        activities = [
            make_activity(start_date_local="2026-04-01T07:00:00Z"),
            make_activity(start_date_local="2026-04-02T07:00:00Z"),
            make_activity(start_date_local="2026-04-03T07:00:00Z"),
        ]
        entries = build_daily_entries(activities, "paris-2026")
        assert len(entries) == 3
        dates = [e["date"] for e in entries]
        assert dates == ["2026-04-01", "2026-04-02", "2026-04-03"]


class TestBuildWeeklyEntries:
    def test_sunday_summary(self):
        # April 5, 2026 is a Sunday
        daily = [
            {"date": "2026-04-01", "miles": 5.0},
            {"date": "2026-04-02", "miles": 6.0},
            {"date": "2026-04-03", "miles": 8.0},
            {"date": "2026-04-04", "miles": 5.0},
            {"date": "2026-04-05", "miles": 10.0},
        ]
        entries = build_weekly_entries(daily, "paris-2026", "2026-04-01", "2026-04-06")
        assert len(entries) == 1
        assert entries[0]["sk"] == "week#2026-04-05"
        assert entries[0]["entryType"] == "week"
        assert entries[0]["description"] == "Week total: 34.0 miles"

    def test_two_sundays(self):
        daily = [
            {"date": "2026-04-01", "miles": 5.0},
            {"date": "2026-04-05", "miles": 10.0},
            {"date": "2026-04-08", "miles": 7.0},
            {"date": "2026-04-12", "miles": 26.2},
        ]
        entries = build_weekly_entries(daily, "paris-2026", "2026-04-01", "2026-04-12")
        assert len(entries) == 2
        assert entries[0]["sk"] == "week#2026-04-05"
        assert entries[1]["sk"] == "week#2026-04-12"

    def test_no_sundays_in_range(self):
        daily = [{"date": "2026-04-01", "miles": 5.0}]
        entries = build_weekly_entries(daily, "paris-2026", "2026-04-01", "2026-04-03")
        assert entries == []


class TestFormatEntriesPreview:
    def test_basic_format(self):
        entries = [
            {
                "sk": "daily#2026-04-01#workout1",
                "date": "2026-04-01",
                "entryType": "daily",
                "slot": "workout1",
                "description": "5.0 mile run",
                "miles": 5.0,
            },
        ]
        preview = format_entries_preview(entries)
        assert "Wednesday, April 01, 2026" in preview
        assert "workout1: 5.0 mile run (5.0 mi)" in preview

    def test_highlight_star(self):
        entries = [
            {
                "sk": "daily#2026-04-12#workout1",
                "date": "2026-04-12",
                "entryType": "daily",
                "slot": "workout1",
                "description": "26.2 mile run",
                "miles": 26.2,
                "highlight": True,
            },
        ]
        preview = format_entries_preview(entries)
        assert "⭐" in preview

    def test_weekly_summary(self):
        entries = [
            {
                "sk": "week#2026-04-05",
                "date": "2026-04-05",
                "entryType": "week",
                "description": "Week total: 34.0 miles",
            },
        ]
        preview = format_entries_preview(entries)
        assert "📊 Week total: 34.0 miles" in preview
