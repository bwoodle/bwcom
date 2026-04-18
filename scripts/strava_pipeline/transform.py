"""Pure transformation: Strava activities → DynamoDB training-log items.

All functions in this module are pure (no I/O, no side effects).
"""

from __future__ import annotations

import datetime as dt
from collections import defaultdict
from typing import Any
from zoneinfo import ZoneInfo

CENTRAL_TZ = ZoneInfo("America/Chicago")
METERS_PER_MILE = 1609.344

# Strava workout_type values that trigger highlight
HIGHLIGHT_WORKOUT_TYPES = {1, 2, 3}  # Race, Long Run, Workout


def meters_to_miles(distance_meters: float) -> float:
    """Convert meters to miles, rounded to 1 decimal place."""
    return round(distance_meters / METERS_PER_MILE, 1)


def filter_activities(activities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep only Run and Walk activities."""
    return [a for a in activities if a.get("type") in ("Run", "Walk")]


def classify_slot(start_date_local: str) -> str:
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


def _activity_sort_key(activity: dict[str, Any]) -> tuple[int, str]:
    """Sort key: Walk before Run, then by start time."""
    type_order = 0 if activity.get("type") == "Walk" else 1
    return (type_order, activity.get("start_date_local", ""))


def build_daily_entries(
    activities: list[dict[str, Any]],
    log_id: str,
) -> list[dict[str, Any]]:
    """Group activities by date + slot, build DynamoDB items.

    Walk+Run in the same slot are combined (walks listed first).
    """
    # Group by (date, slot)
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for a in activities:
        start = a.get("start_date_local", "")
        date_str = start[:10]  # YYYY-MM-DD
        slot = classify_slot(start)
        groups[(date_str, slot)].append(a)

    entries: list[dict[str, Any]] = []
    for (date_str, slot), group in sorted(groups.items()):
        # Sort: walks first, then runs
        group.sort(key=_activity_sort_key)

        descriptions = []
        total_miles = 0.0
        has_highlight = False

        for a in group:
            dist_miles = meters_to_miles(a.get("distance", 0))
            activity_type = a.get("type", "Run")
            descriptions.append(f"{dist_miles} mile {activity_type}")
            total_miles += dist_miles
            if a.get("workout_type") in HIGHLIGHT_WORKOUT_TYPES:
                has_highlight = True

        entry: dict[str, Any] = {
            "logId": log_id,
            "sk": f"daily#{date_str}#{slot}",
            "date": date_str,
            "entryType": "daily",
            "slot": slot,
            "description": "\n".join(descriptions),
            "miles": round(total_miles, 1),
            "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        }
        if has_highlight:
            entry["highlight"] = True

        entries.append(entry)

    return entries


def build_weekly_entries(
    daily_entries: list[dict[str, Any]],
    log_id: str,
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    """Generate weekly summary entries for Sundays in the date range."""
    start = dt.date.fromisoformat(start_date)
    end = dt.date.fromisoformat(end_date)

    # Build a map of date → total miles from daily entries
    daily_miles: dict[str, float] = {}
    for entry in daily_entries:
        date_str = entry["date"]
        daily_miles[date_str] = daily_miles.get(date_str, 0) + entry.get("miles", 0)

    entries: list[dict[str, Any]] = []
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
            entries.append({
                "logId": log_id,
                "sk": f"week#{current.isoformat()}",
                "date": current.isoformat(),
                "entryType": "week",
                "description": f"Week total: {total} miles",
                "createdAt": dt.datetime.now(dt.timezone.utc).isoformat(),
            })
        current += dt.timedelta(days=1)

    return entries


def format_entries_preview(entries: list[dict[str, Any]]) -> str:
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
