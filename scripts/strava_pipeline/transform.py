"""Pure transformation: Strava activities → DynamoDB training-log items.

All functions in this module are pure (no I/O, no side effects).
"""

from __future__ import annotations

import datetime as dt
from collections import defaultdict
from zoneinfo import ZoneInfo

from strava_pipeline.models import (
    DailyEntry,
    StravaActivity,
    TrainingLogEntry,
    TrainingLogSlot,
    WeeklyEntry,
)

CENTRAL_TZ = ZoneInfo("America/Chicago")
METERS_PER_MILE = 1609.344

# Strava workout_type values that trigger highlight
HIGHLIGHT_WORKOUT_TYPES = {1, 2, 3}  # Race, Long Run, Workout
GENERIC_RUN_NAMES = {
    "morning run",
    "afternoon run",
    "evening run",
    "lunch run",
    "run",
}
GENERIC_TREADMILL_NAMES = {
    "yog": "easy run (treadmill)",
    "double yog": "easy run (treadmill)",
    "easy": "easy run (treadmill)",
}
HIGHLIGHT_NAME_TOKENS = (
    "marathon",
    "half",
    "tt",
    "time trial",
    "tempo",
    "fartlek",
    "progression",
    "threshold",
    "mile",
    "shoe test",
    "zone test",
    "mlr",
    "pace",
)


def meters_to_miles(distance_meters: float) -> float:
    """Convert meters to miles, rounded to 1 decimal place."""
    return round(distance_meters / METERS_PER_MILE, 1)


def filter_activities(activities: list[StravaActivity]) -> list[StravaActivity]:
    """Keep only Run and Walk activities."""
    return [a for a in activities if a.get("type") in ("Run", "Walk")]


def classify_slot(start_date_local: str) -> TrainingLogSlot:
    """Return 'workout1' (before noon CT) or 'workout2' (at/after noon CT).

    Strava's start_date_local is in the format '2026-04-01T07:30:00Z' but
    represents the local time where the activity took place. Since we're
    classifying based on Central Time and the user is in CT, we parse the
    timestamp directly (the 'Z' suffix is misleading — it's actually local).
    """
    # Parse the local time string — strip trailing Z if present
    ts = start_date_local.rstrip("Z")
    local_dt = dt.datetime.fromisoformat(ts)
    return "workout1" if local_dt.hour < 12 else "workout2"


def _normalize_run_name(activity: StravaActivity) -> str | None:
    name = str(activity.get("name", "")).strip()
    if not name:
        return None

    lowered_name = name.lower()
    if activity.get("manual", False):
        if lowered_name.startswith("treadmill "):
            detail = name[len("Treadmill ") :].strip()
            mapped = GENERIC_TREADMILL_NAMES.get(detail.lower())
            if mapped is not None:
                return mapped
            return f"{detail} (treadmill)"
        return "easy run (treadmill)"

    if lowered_name in GENERIC_RUN_NAMES:
        return "easy run"

    return name


def _format_elapsed_seconds(value: object) -> str | None:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None

    total_seconds = int(value)
    if total_seconds <= 0:
        return None

    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


def _is_highlight_activity(activity: StravaActivity) -> bool:
    workout_type = activity.get("workout_type")
    if workout_type in HIGHLIGHT_WORKOUT_TYPES:
        return True

    if activity.get("type") != "Run":
        return False

    name = str(activity.get("name", "")).lower()
    return any(token in name for token in HIGHLIGHT_NAME_TOKENS)


def _activity_sort_key(activity: StravaActivity) -> tuple[int, str]:
    """Sort key: Walk before Run, then by start time."""
    type_order = 0 if activity.get("type") == "Walk" else 1
    return (type_order, activity.get("start_date_local", ""))


def _activity_distance_meters(activity: StravaActivity) -> float:
    distance = activity.get("distance", 0.0)
    return float(distance)


def _format_activity_description(activity: StravaActivity) -> str:
    dist_miles = meters_to_miles(_activity_distance_meters(activity))
    if activity.get("type") == "Walk":
        return f"{dist_miles} mile walk"

    run_name = _normalize_run_name(activity)
    if run_name is None:
        if activity.get("manual", False):
            return f"{dist_miles} mile treadmill run"
        return f"{dist_miles} mile run"

    if activity.get("workout_type") == 1:
        elapsed = _format_elapsed_seconds(activity.get("moving_time"))
        if elapsed is not None:
            return f"{run_name} ({elapsed})"
        return run_name

    if run_name == "easy run":
        return f"{dist_miles} mile easy run"

    if run_name == "easy run (treadmill)":
        return f"{dist_miles} mile easy run (treadmill)"

    return f"{dist_miles} miles - {run_name}"


def build_daily_entries(
    activities: list[StravaActivity],
    log_id: str,
) -> list[DailyEntry]:
    """Group activities by date + slot, build DynamoDB items.

    Walk+Run in the same slot are combined (walks listed first).
    """
    # Group by (date, slot)
    groups: dict[tuple[str, TrainingLogSlot], list[StravaActivity]] = defaultdict(list)
    for a in activities:
        start = a.get("start_date_local", "")
        date_str = start[:10]  # YYYY-MM-DD
        slot = classify_slot(start)
        groups[(date_str, slot)].append(a)

    entries: list[DailyEntry] = []
    for (date_str, slot), group in sorted(groups.items()):
        # Sort: walks first, then runs
        group.sort(key=_activity_sort_key)

        descriptions = []
        total_miles = 0.0
        has_highlight = False

        for a in group:
            dist_miles = meters_to_miles(_activity_distance_meters(a))
            descriptions.append(_format_activity_description(a))
            total_miles += dist_miles
            if _is_highlight_activity(a):
                has_highlight = True

        entry: DailyEntry = {
            "logId": log_id,
            "sk": f"daily#{date_str}#{slot}",
            "date": date_str,
            "entryType": "daily",
            "slot": slot,
            "description": "\n".join(descriptions),
            "miles": round(total_miles, 1),
            "createdAt": dt.datetime.now(dt.UTC).isoformat(),
        }
        if has_highlight:
            entry["highlight"] = True

        entries.append(entry)

    return entries


def build_weekly_entries(
    daily_entries: list[DailyEntry],
    log_id: str,
    start_date: str,
    end_date: str,
) -> list[WeeklyEntry]:
    """Generate weekly summary entries for Sundays in the date range."""
    start = dt.date.fromisoformat(start_date)
    end = dt.date.fromisoformat(end_date)

    # Build a map of date → total miles from daily entries
    daily_miles: dict[str, float] = {}
    for entry in daily_entries:
        date_str = entry["date"]
        daily_miles[date_str] = daily_miles.get(date_str, 0) + entry.get("miles", 0)

    entries: list[WeeklyEntry] = []
    current = start
    while current <= end:
        if current.weekday() == 6:  # Sunday
            # Sum Mon–Sun (Mon = current - 6 days through current)
            week_start = current - dt.timedelta(days=6)
            total = 0.0
            day = week_start
            while day <= current:
                total += daily_miles.get(day.isoformat(), 0)
                day += dt.timedelta(days=1)

            total = round(total, 1)
            entries.append(
                {
                    "logId": log_id,
                    "sk": f"week#{current.isoformat()}",
                    "date": current.isoformat(),
                    "entryType": "week",
                    "description": f"Week total: {total} miles",
                    "createdAt": dt.datetime.now(dt.UTC).isoformat(),
                }
            )
        current += dt.timedelta(days=1)

    return entries


def format_entries_preview(entries: list[TrainingLogEntry]) -> str:
    """Format entries for human-readable dry-run display."""
    lines: list[str] = []
    current_date = ""

    for entry in sorted(entries, key=lambda e: e.get("sk", "")):
        entry_date = entry.get("date", "")
        entry_type = entry.get("entryType", "")

        if entry_date != current_date:
            if current_date:
                lines.append("")
            current_date = entry_date
            # Format date header
            try:
                d = dt.date.fromisoformat(entry_date)
                lines.append(f"--- {d.strftime('%A, %B %d, %Y')} ---")
            except ValueError:
                lines.append(f"--- {entry_date} ---")

        if entry_type == "daily":
            slot = entry.get("slot", "")
            miles = entry.get("miles", 0)
            highlight = " ⭐" if entry.get("highlight") else ""
            desc = entry.get("description", "").replace("\n", " + ")
            lines.append(f"  {slot}: {desc} ({miles} mi){highlight}")
        elif entry_type == "week":
            lines.append(f"  📊 {entry.get('description', '')}")

    return "\n".join(lines)
