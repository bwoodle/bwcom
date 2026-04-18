#!/usr/bin/env python3
"""Read Strava activities for a rolling week window and save results locally.

Usage examples:

1) Exchange auth code and fetch 15 weeks ending 2025-11-08:
   STRAVA_CLIENT_ID=9612 STRAVA_CLIENT_SECRET=... \
   python3 scripts/strava_read_window.py \
     --code YOUR_ONE_TIME_CODE \
     --end-date 2025-11-08 \
     --weeks 15 \
     --out /tmp/indy_15w_activities.json \
     --token-out /tmp/indy_15w_token.json

2) Use refresh token and fetch the same window:
   STRAVA_CLIENT_ID=9612 STRAVA_CLIENT_SECRET=... \
   python3 scripts/strava_read_window.py \
     --refresh-token YOUR_REFRESH_TOKEN \
     --end-date 2025-11-08 \
     --weeks 15 \
     --out /tmp/indy_15w_activities.json \
     --token-out /tmp/indy_15w_token.json
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import cast

from strava_pipeline.models import (
    JsonObject,
    ResponseHeaders,
    StravaActivity,
    TokenResponse,
)

TOKEN_URL = "https://www.strava.com/oauth/token"
ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def _load_json_object(body: str, *, context: str) -> JsonObject:
    parsed = json.loads(body)
    if not isinstance(parsed, dict):
        raise SystemExit(
            f"{context} returned {type(parsed).__name__}, expected JSON object"
        )
    return {str(key): value for key, value in parsed.items()}


def _require_activity_list(payload: object) -> list[StravaActivity]:
    if not isinstance(payload, list):
        raise SystemExit(
            f"Unexpected activities response type: {type(payload).__name__}"
        )

    activities: list[StravaActivity] = []
    for item in payload:
        if not isinstance(item, dict):
            raise SystemExit(
                f"Unexpected activity payload entry: {type(item).__name__}"
            )
        activities.append(
            cast(StravaActivity, {str(key): value for key, value in item.items()})
        )
    return activities


def post_form(url: str, data: dict[str, str]) -> TokenResponse:
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return cast(
                TokenResponse, _load_json_object(body, context="Token exchange")
            )
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Token exchange failed ({exc.code}): {body}") from exc


def get_json(url: str, access_token: str) -> tuple[object, ResponseHeaders]:
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {access_token}")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            headers: ResponseHeaders = {k.lower(): v for k, v in resp.headers.items()}
            return json.loads(body), headers
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Activities request failed ({exc.code}): {body}") from exc


def exchange_token(
    client_id: str,
    client_secret: str,
    code: str | None,
    refresh_token: str | None,
) -> TokenResponse:
    if bool(code) == bool(refresh_token):
        raise SystemExit("Provide exactly one of --code or --refresh-token")

    payload: dict[str, str] = {
        "client_id": client_id,
        "client_secret": client_secret,
    }

    if code:
        payload["grant_type"] = "authorization_code"
        payload["code"] = code
    else:
        payload["grant_type"] = "refresh_token"
        payload["refresh_token"] = refresh_token or ""

    token = post_form(TOKEN_URL, payload)
    if "access_token" not in token:
        raise SystemExit(f"No access_token returned: {json.dumps(token)}")
    return token


def window_to_epochs(end_date: str, weeks: int) -> tuple[int, int]:
    end = dt.date.fromisoformat(end_date)
    start = end - dt.timedelta(weeks=weeks)

    # Strava uses [after, before) semantics, so end date becomes next-day midnight.
    start_dt = dt.datetime.combine(start, dt.time(0, 0, 0), tzinfo=dt.UTC)
    before_dt = dt.datetime.combine(
        end + dt.timedelta(days=1), dt.time(0, 0, 0), tzinfo=dt.UTC
    )

    return int(start_dt.timestamp()), int(before_dt.timestamp())


def fetch_all_activities(
    access_token: str,
    after_epoch: int,
    before_epoch: int,
    per_page: int,
) -> tuple[list[StravaActivity], ResponseHeaders]:
    activities: list[StravaActivity] = []
    last_headers: ResponseHeaders = {}
    page = 1

    while True:
        query = urllib.parse.urlencode(
            {
                "after": after_epoch,
                "before": before_epoch,
                "per_page": per_page,
                "page": page,
            }
        )
        url = f"{ACTIVITIES_URL}?{query}"
        batch_value, headers = get_json(url, access_token)
        batch = _require_activity_list(batch_value)
        last_headers = headers

        activities.extend(batch)

        if len(batch) < per_page:
            break

        page += 1

    return activities, last_headers


def miles(distance_meters: float | int | None) -> float:
    if not distance_meters:
        return 0.0
    return float(distance_meters) / 1609.344


def build_summary(
    activities: list[StravaActivity],
    scope: str,
    headers: ResponseHeaders,
    end_date: str,
    weeks: int,
) -> JsonObject:
    total_miles = sum(miles(a.get("distance")) for a in activities)

    sample: list[JsonObject] = []
    for a in activities[:12]:
        sample.append(
            {
                "start_date_local": a.get("start_date_local") or a.get("start_date"),
                "type": a.get("type"),
                "name": a.get("name"),
                "miles": round(miles(a.get("distance")), 3),
            }
        )

    return {
        "end_date": end_date,
        "weeks": weeks,
        "scope": scope,
        "activity_count": len(activities),
        "total_miles": round(total_miles, 3),
        "rate_limit": headers.get("x-ratelimit-limit"),
        "rate_usage": headers.get("x-ratelimit-usage"),
        "sample": sample,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch Strava activities for a date window"
    )
    parser.add_argument("--code", help="One-time Strava OAuth authorization code")
    parser.add_argument("--refresh-token", help="Strava refresh token")
    parser.add_argument(
        "--end-date", required=True, help="Window end date in YYYY-MM-DD (inclusive)"
    )
    parser.add_argument(
        "--weeks", type=int, default=15, help="How many weeks back from end-date"
    )
    parser.add_argument("--per-page", type=int, default=200, help="Strava page size")
    parser.add_argument(
        "--out", required=True, help="Path to write full activities JSON array"
    )
    parser.add_argument("--summary-out", help="Path to write summary JSON")
    parser.add_argument("--token-out", help="Optional path to write full token JSON")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    client_id = require_env("STRAVA_CLIENT_ID")
    client_secret = require_env("STRAVA_CLIENT_SECRET")

    token = exchange_token(client_id, client_secret, args.code, args.refresh_token)

    if args.token_out:
        with open(args.token_out, "w", encoding="utf-8") as f:
            json.dump(token, f, indent=2)

    access_token = token.get("access_token")
    if not isinstance(access_token, str) or access_token == "":
        raise SystemExit("No access_token returned from Strava")

    scope_value = token.get("scope", "")
    scope = scope_value if isinstance(scope_value, str) else ""

    after_epoch, before_epoch = window_to_epochs(args.end_date, args.weeks)
    activities, headers = fetch_all_activities(
        access_token, after_epoch, before_epoch, args.per_page
    )

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(activities, f, indent=2)

    summary = build_summary(activities, scope, headers, args.end_date, args.weeks)

    if args.summary_out:
        os.makedirs(os.path.dirname(os.path.abspath(args.summary_out)), exist_ok=True)
        with open(args.summary_out, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

    print("Fetch complete")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
