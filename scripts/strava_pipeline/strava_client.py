"""Strava OAuth and activity-fetching client.

Handles credential persistence in ~/.strava-credentials (KEY=VALUE format),
OAuth authorization code exchange, automatic token refresh, and paginated
activity fetching from the Strava API v3.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

TOKEN_URL = "https://www.strava.com/oauth/token"
ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"
AUTHORIZE_URL = "https://www.strava.com/oauth/authorize"

DEFAULT_CREDENTIALS_PATH = os.path.expanduser("~/.strava-credentials")

# Keys that the user manages (read-only by script)
USER_MANAGED_KEYS = {"STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET"}

# Keys that the script manages (written back after token exchange/refresh)
SCRIPT_MANAGED_KEYS = {"STRAVA_ACCESS_TOKEN", "STRAVA_REFRESH_TOKEN", "STRAVA_EXPIRES_AT"}


def load_credentials(path: str = DEFAULT_CREDENTIALS_PATH) -> dict[str, str]:
    """Read KEY=VALUE credentials from *path*. Returns empty dict if missing."""
    creds: dict[str, str] = {}
    if not os.path.exists(path):
        return creds
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            creds[key.strip()] = value.strip()
    return creds


def save_credentials(path: str, creds: dict[str, str]) -> None:
    """Write credentials back, preserving user-managed keys and updating script-managed ones."""
    existing = load_credentials(path)
    existing.update({k: v for k, v in creds.items() if k in SCRIPT_MANAGED_KEYS})
    # Ensure user-managed keys are preserved
    for k in USER_MANAGED_KEYS:
        if k in creds and k not in existing:
            existing[k] = creds[k]
    with open(path, "w", encoding="utf-8") as f:
        for key, value in existing.items():
            f.write(f"{key}={value}\n")


def _post_form(url: str, data: dict[str, str]) -> dict[str, Any]:
    """POST form-encoded data, return parsed JSON response."""
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Strava token request failed ({exc.code}): {body}") from exc


def _get_json(url: str, access_token: str) -> tuple[Any, dict[str, str]]:
    """GET JSON from *url* with bearer auth. Returns (parsed_body, headers)."""
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {access_token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            headers = {k.lower(): v for k, v in resp.headers.items()}
            return json.loads(resp.read().decode("utf-8")), headers
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Strava API request failed ({exc.code}): {body}") from exc


def get_authorize_url(client_id: str) -> str:
    """Return the URL the user should visit to authorize the app."""
    params = urllib.parse.urlencode({
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": "http://localhost",
        "approval_prompt": "auto",
        "scope": "activity:read_all",
    })
    return f"{AUTHORIZE_URL}?{params}"


def ensure_access_token(
    creds: dict[str, str],
    code: str | None = None,
    http_post: Any = None,
) -> dict[str, str]:
    """Ensure we have a valid access token, exchanging or refreshing as needed.

    - If no tokens exist and *code* is provided, exchanges the code.
    - If no tokens exist and no code, prints the authorize URL and exits.
    - If tokens exist but are expired, refreshes using refresh_token.

    Returns updated creds dict with fresh token values.
    *http_post* is injectable for testing (default: _post_form).
    """
    post = http_post or _post_form
    client_id = creds.get("STRAVA_CLIENT_ID", "")
    client_secret = creds.get("STRAVA_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        raise SystemExit(
            "Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET in credentials file"
        )

    has_tokens = bool(creds.get("STRAVA_ACCESS_TOKEN") and creds.get("STRAVA_REFRESH_TOKEN"))

    if not has_tokens:
        if not code:
            url = get_authorize_url(client_id)
            print(f"No tokens found. Visit this URL to authorize:\n\n  {url}\n", file=sys.stderr)
            print("Then re-run with --code <CODE_FROM_REDIRECT_URL>", file=sys.stderr)
            raise SystemExit(1)

        # Exchange authorization code for tokens
        result = post(TOKEN_URL, {
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "authorization_code",
            "code": code,
        })
        if "access_token" not in result:
            raise SystemExit(f"Token exchange failed: {json.dumps(result)}")

        creds["STRAVA_ACCESS_TOKEN"] = result["access_token"]
        creds["STRAVA_REFRESH_TOKEN"] = result["refresh_token"]
        creds["STRAVA_EXPIRES_AT"] = str(result["expires_at"])
        return creds

    # Check if token is expired
    expires_at = int(creds.get("STRAVA_EXPIRES_AT", "0"))
    if time.time() < expires_at - 60:
        # Token still valid (with 60s buffer)
        return creds

    # Refresh the token
    print("Access token expired, refreshing...", file=sys.stderr)
    result = post(TOKEN_URL, {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
        "refresh_token": creds["STRAVA_REFRESH_TOKEN"],
    })
    if "access_token" not in result:
        raise SystemExit(f"Token refresh failed: {json.dumps(result)}")

    creds["STRAVA_ACCESS_TOKEN"] = result["access_token"]
    creds["STRAVA_REFRESH_TOKEN"] = result.get("refresh_token", creds["STRAVA_REFRESH_TOKEN"])
    creds["STRAVA_EXPIRES_AT"] = str(result["expires_at"])
    return creds


def date_range_to_epochs(start_date: str, end_date: str) -> tuple[int, int]:
    """Convert YYYY-MM-DD strings to Strava after/before epoch ints.

    Strava uses (after, before) semantics. We set:
    - after = start_date midnight UTC
    - before = end_date + 1 day midnight UTC (to make end_date inclusive)
    """
    import datetime as dt

    start = dt.date.fromisoformat(start_date)
    end = dt.date.fromisoformat(end_date)
    after_dt = dt.datetime.combine(start, dt.time(0, 0, 0), tzinfo=dt.timezone.utc)
    before_dt = dt.datetime.combine(end + dt.timedelta(days=1), dt.time(0, 0, 0), tzinfo=dt.timezone.utc)
    return int(after_dt.timestamp()), int(before_dt.timestamp())


def fetch_activities(
    access_token: str,
    after_epoch: int,
    before_epoch: int,
    per_page: int = 200,
    http_get: Any = None,
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Fetch all activities in the time range. Returns (activities, last_headers).

    *http_get* is injectable for testing (default: _get_json).
    """
    get = http_get or _get_json
    activities: list[dict[str, Any]] = []
    last_headers: dict[str, str] = {}
    page = 1

    while True:
        query = urllib.parse.urlencode({
            "after": after_epoch,
            "before": before_epoch,
            "per_page": per_page,
            "page": page,
        })
        url = f"{ACTIVITIES_URL}?{query}"
        batch, headers = get(url, access_token)
        last_headers = headers

        if not isinstance(batch, list):
            raise SystemExit(f"Unexpected API response: {type(batch).__name__}")

        activities.extend(batch)
        if len(batch) < per_page:
            break
        page += 1

    usage = last_headers.get("x-ratelimit-usage", "unknown")
    limit = last_headers.get("x-ratelimit-limit", "unknown")
    print(f"Strava rate limit: {usage} / {limit}", file=sys.stderr)

    return activities, last_headers
