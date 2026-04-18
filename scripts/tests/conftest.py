"""Shared pytest fixtures for strava_pipeline tests."""

from __future__ import annotations

import pytest


def make_activity(
    *,
    activity_type: str = "Run",
    distance: float = 8046.72,  # ~5.0 miles
    start_date_local: str = "2026-04-01T07:30:00Z",
    workout_type: int | None = None,
    name: str = "Morning Run",
) -> dict:
    """Build a minimal Strava activity dict for testing."""
    activity = {
        "type": activity_type,
        "distance": distance,
        "start_date_local": start_date_local,
        "name": name,
    }
    if workout_type is not None:
        activity["workout_type"] = workout_type
    return activity


@pytest.fixture
def morning_run() -> dict:
    """A morning run at 7:30 AM CT on April 1, 2026."""
    return make_activity(
        activity_type="Run",
        distance=8046.72,  # ~5.0 miles
        start_date_local="2026-04-01T07:30:00Z",
        name="Morning Run",
    )


@pytest.fixture
def morning_walk() -> dict:
    """A morning walk at 6:00 AM CT on April 1, 2026."""
    return make_activity(
        activity_type="Walk",
        distance=3218.69,  # ~2.0 miles
        start_date_local="2026-04-01T06:00:00Z",
        name="Morning Walk",
    )


@pytest.fixture
def afternoon_run() -> dict:
    """An afternoon run at 5:00 PM CT on April 1, 2026."""
    return make_activity(
        activity_type="Run",
        distance=9656.06,  # ~6.0 miles
        start_date_local="2026-04-01T17:00:00Z",
        name="Afternoon Run",
    )


@pytest.fixture
def race_activity() -> dict:
    """A race activity (marathon) on April 12, 2026 morning."""
    return make_activity(
        activity_type="Run",
        distance=42195.0,  # marathon in meters
        start_date_local="2026-04-12T07:00:00Z",
        workout_type=1,  # Race
        name="Paris Marathon",
    )


@pytest.fixture
def long_run_activity() -> dict:
    """A long run activity."""
    return make_activity(
        activity_type="Run",
        distance=32186.9,  # ~20 miles
        start_date_local="2026-04-05T08:00:00Z",
        workout_type=2,  # Long Run
        name="Long Run",
    )


@pytest.fixture
def workout_activity() -> dict:
    """A Strava 'Workout' type run."""
    return make_activity(
        activity_type="Run",
        distance=12874.8,  # ~8 miles
        start_date_local="2026-04-03T07:00:00Z",
        workout_type=3,  # Workout
        name="Tempo Run",
    )


@pytest.fixture
def cycling_activity() -> dict:
    """A cycling activity (should be filtered out)."""
    return make_activity(
        activity_type="Ride",
        distance=32186.9,
        start_date_local="2026-04-02T08:00:00Z",
        name="Morning Ride",
    )
