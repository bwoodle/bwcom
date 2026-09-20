import base64
import binascii
import json
import logging
import math
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Any

import boto3
from botocore.exceptions import ClientError


dynamodb = boto3.resource("dynamodb", region_name="us-west-2")
logger = logging.getLogger(__name__)

MEDIA_TABLE_NAME = os.environ["MEDIA_TABLE_NAME"]
RACES_TABLE_NAME = os.environ["RACES_TABLE_NAME"]
TRAINING_LOG_TABLE_NAME = os.environ["TRAINING_LOG_TABLE_NAME"]
ORIGIN_SECRET = os.environ["ORIGIN_SECRET"]
GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.environ.get("ADMIN_EMAILS", "").split(",")
    if email.strip()
}
CORS_ALLOW_ORIGIN = os.environ.get("CORS_ALLOW_ORIGIN", "*")

TRAINING_LOG_NAMES = {
    "paris-2026": "Paris 2026",
    "indy-2025": "Indy 2025",
}

MEDIA_FORMAT_OPTIONS = {"book", "audiobook", "kindle", "movie", "tv", "podcast"}
ISO_MONTH_RE = re.compile(r"^\d{4}-\d{2}$")
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
CACHE_CONTROL_PUBLIC = "public, max-age=30, s-maxage=120, stale-while-revalidate=300"
CACHE_CONTROL_PRIVATE = "private, no-store, max-age=0"


class RequestValidationError(ValueError):
    pass


def _headers(extra: dict[str, str] | None = None, cache_control: str = CACHE_CONTROL_PRIVATE) -> dict[str, str]:
    headers = {
        "Access-Control-Allow-Origin": CORS_ALLOW_ORIGIN,
        "Access-Control-Allow-Headers": "content-type,authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
        "Cache-Control": cache_control,
        "Content-Type": "application/json",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
    }
    if extra:
        headers.update(extra)
    return headers


def _json(
    status: int,
    body: Any,
    extra_headers: dict[str, str] | None = None,
    cache_control: str = CACHE_CONTROL_PRIVATE,
) -> dict[str, Any]:
    return {
        "statusCode": status,
        "headers": _headers(extra_headers, cache_control=cache_control),
        "body": json.dumps(body, default=_json_default),
    }


def _json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    raise TypeError(f"Unsupported type: {type(value)!r}")


def _parse_limit(value: str | None, default_limit: int = 500, max_limit: int = 1000) -> int:
    if value is None:
        return default_limit
    try:
        parsed = int(value)
    except ValueError:
        return default_limit
    return max(1, min(max_limit, parsed))


def _encode_cursor(value: dict[str, Any] | None) -> str | None:
    if not value:
        return None
    raw = json.dumps(value).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _decode_cursor(value: str | None) -> dict[str, Any] | None:
    if not value:
        return None
    try:
        padding = "=" * (-len(value) % 4)
        decoded = base64.urlsafe_b64decode((value + padding).encode("utf-8")).decode("utf-8")
        return json.loads(decoded)
    except Exception:
        return None


def _require_origin_secret(event: dict[str, Any]) -> bool:
    headers = event.get("headers") or {}
    supplied = headers.get("x-origin-secret") or headers.get("X-Origin-Secret")
    return supplied == ORIGIN_SECRET


def _extract_bearer_token(event: dict[str, Any]) -> str | None:
    headers = event.get("headers") or {}
    raw = headers.get("authorization") or headers.get("Authorization")
    if not raw:
        return None
    prefix = "Bearer "
    if not raw.startswith(prefix):
        return None
    token = raw[len(prefix) :].strip()
    return token or None


def _request_source_ip(event: dict[str, Any]) -> str:
    return (
        event.get("requestContext", {})
        .get("http", {})
        .get("sourceIp", "unknown")
    )


def _verify_admin_user(event: dict[str, Any]) -> dict[str, str] | None:
    token = _extract_bearer_token(event)
    if not token:
        logger.warning("Admin auth denied: missing bearer token", extra={"source_ip": _request_source_ip(event)})
        return None

    try:
        body = urllib.parse.urlencode({"id_token": token}).encode("utf-8")
        req = urllib.request.Request(
            "https://oauth2.googleapis.com/tokeninfo",
            data=body,
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            payload = response.read().decode("utf-8")
        claims = json.loads(payload)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        logger.warning("Admin auth denied: token verification request failed", extra={"source_ip": _request_source_ip(event)})
        return None

    audience = str(claims.get("aud", "")).strip()
    if audience != GOOGLE_CLIENT_ID:
        logger.warning("Admin auth denied: invalid audience", extra={"source_ip": _request_source_ip(event), "aud": audience})
        return None

    issuer = str(claims.get("iss", "")).strip()
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        logger.warning("Admin auth denied: invalid issuer", extra={"source_ip": _request_source_ip(event), "iss": issuer})
        return None

    exp_raw = claims.get("exp")
    try:
        exp = int(exp_raw)
    except (TypeError, ValueError):
        logger.warning("Admin auth denied: missing exp claim", extra={"source_ip": _request_source_ip(event)})
        return None
    if exp <= int(time.time()):
        logger.warning("Admin auth denied: expired token", extra={"source_ip": _request_source_ip(event)})
        return None

    email = str(claims.get("email", "")).strip().lower()
    email_verified = bool(claims.get("email_verified"))
    if not email or not email_verified:
        logger.warning("Admin auth denied: unverified email", extra={"source_ip": _request_source_ip(event)})
        return None
    if ADMIN_EMAILS and email not in ADMIN_EMAILS:
        logger.warning("Admin auth denied: email not allowlisted", extra={"source_ip": _request_source_ip(event), "email": email})
        return None

    return {
        "email": email,
        "name": str(claims.get("name", "")).strip(),
    }


def _read_json_body(event: dict[str, Any]) -> dict[str, Any]:
    body = event.get("body")
    if not body:
        return {}
    try:
        if event.get("isBase64Encoded"):
            body = base64.b64decode(body).decode("utf-8")
        parsed = json.loads(body)
    except (binascii.Error, UnicodeDecodeError, json.JSONDecodeError, TypeError) as exc:
        raise RequestValidationError("Request body must be valid JSON") from exc
    if not isinstance(parsed, dict):
        raise RequestValidationError("Request body must be a JSON object")
    return parsed


def _is_finite_number(value: Any) -> bool:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return math.isfinite(float(value))


def _is_sunday(date_value: str) -> bool:
    if not ISO_DATE_RE.match(date_value):
        return False
    dt = datetime.strptime(date_value, "%Y-%m-%d")
    return dt.weekday() == 6


def _format_month_label(month_key: str) -> str:
    dt = datetime.strptime(f"{month_key}-01", "%Y-%m-%d")
    return dt.strftime("%B %Y")


def _build_media_create(payload: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    month_key = payload.get("monthKey")
    title = payload.get("title")
    media_format = payload.get("format")

    if not isinstance(month_key, str) or not ISO_MONTH_RE.match(month_key):
        return None, "monthKey must be YYYY-MM"
    if not isinstance(title, str) or len(title.strip()) == 0:
        return None, "title is required"
    if not isinstance(media_format, str) or media_format not in MEDIA_FORMAT_OPTIONS:
        return None, "format is invalid"

    author = payload.get("author")
    comments = payload.get("comments")
    rating = payload.get("rating")

    if author is not None and not isinstance(author, str):
        return None, "author must be a string"
    if comments is not None and not isinstance(comments, str):
        return None, "comments must be a string"
    if rating is not None and (not isinstance(rating, int) or rating < 1 or rating > 5):
        return None, "rating must be a whole number from 1 to 5"

    now = datetime.utcnow().isoformat()
    item: dict[str, Any] = {
        "monthKey": month_key,
        "sk": f"{now}#{title.strip()}",
        "title": title.strip(),
        "format": media_format,
        "createdAt": now,
    }
    if isinstance(author, str) and author.strip():
        item["author"] = author.strip()
    if isinstance(comments, str) and comments.strip():
        item["comments"] = comments.strip()
    if rating is not None:
        item["rating"] = int(rating)

    return item, None


def _media_get(query: dict[str, str]) -> dict[str, Any]:
    table = dynamodb.Table(MEDIA_TABLE_NAME)
    limit = _parse_limit(query.get("limit"))
    cursor = _decode_cursor(query.get("cursor"))

    scan_kwargs: dict[str, Any] = {"Limit": limit}
    if cursor:
        scan_kwargs["ExclusiveStartKey"] = cursor

    result = table.scan(**scan_kwargs)
    items = result.get("Items", [])

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        grouped[item["monthKey"]].append(item)

    months = []
    for month_key, month_items in sorted(grouped.items(), key=lambda x: x[0], reverse=True):
        month_items.sort(key=lambda x: x.get("title", ""))
        months.append({
            "monthKey": month_key,
            "label": _format_month_label(month_key),
            "items": month_items,
        })

    return _json(
        200,
        {"months": months, "nextCursor": _encode_cursor(result.get("LastEvaluatedKey"))},
        cache_control=CACHE_CONTROL_PUBLIC,
    )


def _media_post(event: dict[str, Any]) -> dict[str, Any]:
    table = dynamodb.Table(MEDIA_TABLE_NAME)
    try:
        payload = _read_json_body(event)
    except RequestValidationError as exc:
        return _json(400, {"error": str(exc)}, cache_control=CACHE_CONTROL_PRIVATE)
    item, err = _build_media_create(payload)
    if err:
        return _json(400, {"error": err})

    assert item is not None
    try:
        table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(monthKey) AND attribute_not_exists(sk)",
        )
        return _json(200, {"success": True, "entry": item}, cache_control=CACHE_CONTROL_PRIVATE)
    except ClientError as exc:
        return _json(400, {"error": str(exc)}, cache_control=CACHE_CONTROL_PRIVATE)


def _media_patch(event: dict[str, Any]) -> dict[str, Any]:
    table = dynamodb.Table(MEDIA_TABLE_NAME)
    try:
        payload = _read_json_body(event)
    except RequestValidationError as exc:
        return _json(400, {"error": str(exc)}, cache_control=CACHE_CONTROL_PRIVATE)
    updates = payload.get("updates")

    if not isinstance(updates, list) or len(updates) == 0:
        return _json(400, {"error": "updates must be a non-empty array"})
    if len(updates) > 200:
        return _json(400, {"error": "updates cannot exceed 200 items"})

    results = []
    for item in updates:
        month_key = item.get("monthKey")
        sk = item.get("sk")
        if not isinstance(month_key, str) or not ISO_MONTH_RE.match(month_key):
            results.append({"monthKey": month_key or "unknown", "sk": sk or "unknown", "success": False, "error": "monthKey must be YYYY-MM"})
            continue
        if not isinstance(sk, str) or not sk:
            results.append({"monthKey": month_key, "sk": sk or "unknown", "success": False, "error": "sk is required"})
            continue

        expr_names: dict[str, str] = {}
        expr_vals: dict[str, Any] = {}
        set_parts: list[str] = []
        remove_parts: list[str] = []

        if "title" in item:
            title = item.get("title")
            if not isinstance(title, str) or not title.strip():
                results.append({"monthKey": month_key, "sk": sk, "success": False, "error": "title must be a non-empty string"})
                continue
            expr_names["#title"] = "title"
            expr_vals[":title"] = title
            set_parts.append("#title = :title")

        if "format" in item:
            media_format = item.get("format")
            if not isinstance(media_format, str) or media_format not in MEDIA_FORMAT_OPTIONS:
                results.append({"monthKey": month_key, "sk": sk, "success": False, "error": "format is invalid"})
                continue
            expr_names["#format"] = "format"
            expr_vals[":format"] = media_format
            set_parts.append("#format = :format")

        if "author" in item:
            author = item.get("author")
            expr_names["#author"] = "author"
            if author is None:
                remove_parts.append("#author")
            elif isinstance(author, str) and author.strip():
                expr_vals[":author"] = author
                set_parts.append("#author = :author")
            else:
                results.append({"monthKey": month_key, "sk": sk, "success": False, "error": "author must be null or non-empty string"})
                continue

        if "comments" in item:
            comments = item.get("comments")
            expr_names["#comments"] = "comments"
            if comments is None:
                remove_parts.append("#comments")
            elif isinstance(comments, str) and comments.strip():
                expr_vals[":comments"] = comments
                set_parts.append("#comments = :comments")
            else:
                results.append({"monthKey": month_key, "sk": sk, "success": False, "error": "comments must be null or non-empty string"})
                continue

        if "rating" in item:
            rating = item.get("rating")
            expr_names["#rating"] = "rating"
            if rating is None:
                remove_parts.append("#rating")
            elif isinstance(rating, int) and 1 <= rating <= 5:
                expr_vals[":rating"] = rating
                set_parts.append("#rating = :rating")
            else:
                results.append({"monthKey": month_key, "sk": sk, "success": False, "error": "rating must be null or integer 1-5"})
                continue

        if not set_parts and not remove_parts:
            results.append({"monthKey": month_key, "sk": sk, "success": False, "error": "No update fields provided"})
            continue

        update_expr = ""
        if set_parts:
            update_expr += "SET " + ", ".join(set_parts)
        if remove_parts:
            update_expr += (" " if update_expr else "") + "REMOVE " + ", ".join(remove_parts)

        try:
            kwargs = {
                "Key": {"monthKey": month_key, "sk": sk},
                "ConditionExpression": "attribute_exists(monthKey) AND attribute_exists(sk)",
                "UpdateExpression": update_expr,
                "ExpressionAttributeNames": expr_names,
            }
            if expr_vals:
                kwargs["ExpressionAttributeValues"] = expr_vals
            table.update_item(**kwargs)
            results.append({"monthKey": month_key, "sk": sk, "success": True})
        except ClientError as exc:
            results.append({"monthKey": month_key, "sk": sk, "success": False, "error": str(exc)})

    success_count = len([row for row in results if row["success"]])
    return _json(
        200,
        {
            "successCount": success_count,
            "failureCount": len(results) - success_count,
            "results": results,
        },
        cache_control=CACHE_CONTROL_PRIVATE,
    )


def _races_get(query: dict[str, str]) -> dict[str, Any]:
    table = dynamodb.Table(RACES_TABLE_NAME)
    limit = _parse_limit(query.get("limit"))
    cursor = _decode_cursor(query.get("cursor"))

    scan_kwargs: dict[str, Any] = {"Limit": limit}
    if cursor:
        scan_kwargs["ExclusiveStartKey"] = cursor

    result = table.scan(**scan_kwargs)
    races = result.get("Items", [])
    races.sort(key=lambda item: item.get("sk", ""), reverse=True)

    return _json(
        200,
        {"races": races, "nextCursor": _encode_cursor(result.get("LastEvaluatedKey"))},
        cache_control=CACHE_CONTROL_PUBLIC,
    )


def _training_get(query: dict[str, str]) -> dict[str, Any]:
    table = dynamodb.Table(TRAINING_LOG_TABLE_NAME)
    section_id = query.get("sectionId")
    if not section_id:
        return _json(400, {"error": "sectionId query parameter is required"})

    limit = _parse_limit(query.get("limit"))
    cursor = _decode_cursor(query.get("cursor"))

    query_kwargs: dict[str, Any] = {
        "KeyConditionExpression": "logId = :lid",
        "ExpressionAttributeValues": {":lid": section_id},
        "Limit": limit,
    }
    if cursor:
        query_kwargs["ExclusiveStartKey"] = cursor

    result = table.query(**query_kwargs)
    entries = result.get("Items", [])

    return _json(
        200,
        {
            "id": section_id,
            "name": TRAINING_LOG_NAMES.get(section_id, section_id),
            "entries": entries,
            "nextCursor": _encode_cursor(result.get("LastEvaluatedKey")),
        },
        cache_control=CACHE_CONTROL_PUBLIC,
    )


def _training_post(event: dict[str, Any]) -> dict[str, Any]:
    table = dynamodb.Table(TRAINING_LOG_TABLE_NAME)
    try:
        payload = _read_json_body(event)
    except RequestValidationError as exc:
        return _json(400, {"error": str(exc)}, cache_control=CACHE_CONTROL_PRIVATE)

    log_id = payload.get("logId")
    entry_type = payload.get("entryType")
    date_value = payload.get("date")
    description = payload.get("description")

    if not isinstance(log_id, str) or not log_id:
        return _json(400, {"error": "logId is required"})
    if entry_type not in ("daily", "week"):
        return _json(400, {"error": "entryType must be daily or week"})
    if not isinstance(date_value, str) or not ISO_DATE_RE.match(date_value):
        return _json(400, {"error": "date must be YYYY-MM-DD"})
    if not isinstance(description, str) or not description.strip():
        return _json(400, {"error": "description is required"})

    now = datetime.utcnow().isoformat()

    if entry_type == "daily":
        slot = payload.get("slot")
        miles = payload.get("miles")
        highlight = payload.get("highlight")

        if slot not in ("workout1", "workout2"):
            return _json(400, {"error": "slot must be workout1 or workout2 for daily entries"})
        if not _is_finite_number(miles):
            return _json(400, {"error": "miles must be a finite number for daily entries"})

        entry: dict[str, Any] = {
            "logId": log_id,
            "sk": f"daily#{date_value}#{slot}",
            "date": date_value,
            "entryType": "daily",
            "slot": slot,
            "description": description.strip(),
            "miles": Decimal(str(miles)),
            "createdAt": now,
        }
        if bool(highlight):
            entry["highlight"] = True
    else:
        if not _is_sunday(date_value):
            return _json(400, {"error": "Weekly summary date must be a Sunday"})

        entry = {
            "logId": log_id,
            "sk": f"week#{date_value}",
            "date": date_value,
            "entryType": "week",
            "description": description.strip(),
            "createdAt": now,
        }

    try:
        table.put_item(
            Item=entry,
            ConditionExpression="attribute_not_exists(logId) AND attribute_not_exists(sk)",
        )
        response_entry = dict(entry)
        if isinstance(response_entry.get("miles"), Decimal):
            response_entry["miles"] = _json_default(response_entry["miles"])
        return _json(200, {"success": True, "entry": response_entry}, cache_control=CACHE_CONTROL_PRIVATE)
    except (ClientError, TypeError, ValueError, ArithmeticError) as exc:
        return _json(400, {"error": str(exc)}, cache_control=CACHE_CONTROL_PRIVATE)


def _training_patch(event: dict[str, Any]) -> dict[str, Any]:
    table = dynamodb.Table(TRAINING_LOG_TABLE_NAME)
    try:
        payload = _read_json_body(event)
    except RequestValidationError as exc:
        return _json(400, {"error": str(exc)}, cache_control=CACHE_CONTROL_PRIVATE)

    log_id = payload.get("logId")
    updates = payload.get("updates")

    if not isinstance(log_id, str) or not log_id:
        return _json(400, {"error": "logId is required"})
    if not isinstance(updates, list) or len(updates) == 0:
        return _json(400, {"error": "updates must be a non-empty array"})
    if len(updates) > 200:
        return _json(400, {"error": "updates cannot exceed 200 items"})

    results = []
    for item in updates:
        sk = item.get("sk")
        if not isinstance(sk, str) or not (sk.startswith("daily#") or sk.startswith("week#")):
            results.append({"sk": sk or "unknown", "success": False, "error": "Invalid sk format. Expected daily#... or week#..."})
            continue

        expr_names: dict[str, str] = {}
        expr_vals: dict[str, Any] = {}
        set_parts: list[str] = []
        remove_parts: list[str] = []

        if "description" in item:
            description = item.get("description")
            if not isinstance(description, str) or not description.strip():
                results.append({"sk": sk, "success": False, "error": "Description must be a non-empty string when provided."})
                continue
            expr_names["#description"] = "description"
            expr_vals[":description"] = description.strip()
            set_parts.append("#description = :description")

        if "miles" in item:
            miles = item.get("miles")
            if sk.startswith("week#"):
                results.append({"sk": sk, "success": False, "error": "Weekly entries only support description updates."})
                continue
            if not _is_finite_number(miles):
                results.append({"sk": sk, "success": False, "error": "Miles must be a finite number when provided."})
                continue
            expr_names["#miles"] = "miles"
            expr_vals[":miles"] = Decimal(str(miles))
            set_parts.append("#miles = :miles")

        if "highlight" in item:
            highlight = item.get("highlight")
            if sk.startswith("week#"):
                results.append({"sk": sk, "success": False, "error": "Weekly entries only support description updates."})
                continue
            expr_names["#highlight"] = "highlight"
            if highlight is True:
                expr_vals[":highlight"] = True
                set_parts.append("#highlight = :highlight")
            elif highlight is False:
                remove_parts.append("#highlight")
            else:
                results.append({"sk": sk, "success": False, "error": "Highlight must be a boolean when provided."})
                continue

        if not set_parts and not remove_parts:
            results.append({"sk": sk, "success": False, "error": "No update fields provided."})
            continue

        update_expr = ""
        if set_parts:
            update_expr += "SET " + ", ".join(set_parts)
        if remove_parts:
            update_expr += (" " if update_expr else "") + "REMOVE " + ", ".join(remove_parts)

        try:
            kwargs = {
                "Key": {"logId": log_id, "sk": sk},
                "ConditionExpression": "attribute_exists(logId) AND attribute_exists(sk)",
                "UpdateExpression": update_expr,
                "ExpressionAttributeNames": expr_names,
            }
            if expr_vals:
                kwargs["ExpressionAttributeValues"] = expr_vals
            table.update_item(**kwargs)
            results.append({"sk": sk, "success": True})
        except (ClientError, TypeError, ValueError, ArithmeticError) as exc:
            results.append({"sk": sk, "success": False, "error": str(exc)})

    success_count = len([row for row in results if row["success"]])
    return _json(
        200,
        {
            "logId": log_id,
            "successCount": success_count,
            "failureCount": len(results) - success_count,
            "results": results,
        },
        cache_control=CACHE_CONTROL_PRIVATE,
    )


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET").upper()
    raw_path = event.get("rawPath", "")
    query = event.get("queryStringParameters") or {}

    if method == "OPTIONS":
        return _json(204, {}, cache_control=CACHE_CONTROL_PRIVATE)

    if not _require_origin_secret(event):
        return _json(403, {"error": "Forbidden"}, cache_control=CACHE_CONTROL_PRIVATE)

    if raw_path == "/api/health" and method == "GET":
        return _json(200, {"status": "ok"}, cache_control=CACHE_CONTROL_PUBLIC)

    if raw_path == "/api/auth/me" and method == "GET":
        admin_user = _verify_admin_user(event)
        if not admin_user:
            return _json(401, {"error": "Unauthorized"}, cache_control=CACHE_CONTROL_PRIVATE)
        return _json(200, {"user": admin_user}, cache_control=CACHE_CONTROL_PRIVATE)

    if raw_path == "/api/races" and method == "GET":
        return _races_get(query)

    if raw_path == "/api/media":
        if method == "GET":
            return _media_get(query)
        if method in ("POST", "PATCH"):
            if not _verify_admin_user(event):
                return _json(401, {"error": "Unauthorized"}, cache_control=CACHE_CONTROL_PRIVATE)
        if method == "POST":
            return _media_post(event)
        if method == "PATCH":
            return _media_patch(event)

    if raw_path == "/api/training-log":
        if method == "GET":
            return _training_get(query)
        if method in ("POST", "PATCH"):
            if not _verify_admin_user(event):
                return _json(401, {"error": "Unauthorized"}, cache_control=CACHE_CONTROL_PRIVATE)
        if method == "POST":
            return _training_post(event)
        if method == "PATCH":
            return _training_patch(event)

    return _json(404, {"error": "Not found"}, cache_control=CACHE_CONTROL_PRIVATE)
