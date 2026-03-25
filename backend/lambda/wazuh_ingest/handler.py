import json
import os
import time
from datetime import datetime, timezone
from typing import Any

try:
    import boto3
except ImportError:  # pragma: no cover - supports offline tests without boto3 installed
    boto3 = None

TABLE_NAME = os.environ["TABLE_NAME"]
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "30"))
MAX_BATCH_WRITE_SIZE = 25
MAX_BATCH_WRITE_RETRIES = 5
SECONDS_PER_DAY = 24 * 60 * 60

DYNAMODB = boto3.client("dynamodb") if boto3 else None


class AlertValidationError(ValueError):
    pass


def handler(event: dict[str, Any], context: Any) -> dict[str, list[dict[str, str]]]:
    records = event.get("Records", [])
    prepared_items: list[tuple[str, dict[str, dict[str, str]]]] = []
    failed_message_ids: list[str] = []

    for record in records:
        message_id = record.get("messageId", "")
        body = record.get("body", "")

        try:
            payload = json.loads(body)
            if not isinstance(payload, dict):
                raise ValueError("SQS message body must be a JSON object")
            normalized = normalize_event(payload=payload, raw_body=body)
        except Exception as err:  # noqa: BLE001 - keep record-level failure handling explicit
            print(f"Failed to process SQS message {message_id}: {err}")
            if message_id:
                failed_message_ids.append(message_id)
            continue

        print(
            f"Prepared Wazuh alert id={normalized['id']} "
            f"timestamp={normalized['timestamp']} severity={normalized['severity']}"
        )
        prepared_items.append((message_id, to_dynamodb_item(normalized)))

    if prepared_items:
        failed_message_ids.extend(batch_write_with_retries(prepared_items))

    return {
        "batchItemFailures": [
            {"itemIdentifier": message_id}
            for message_id in list(dict.fromkeys(failed_message_ids))
        ]
    }


def normalize_event(payload: dict[str, Any], raw_body: str) -> dict[str, Any]:
    agent = require_object(payload, "agent")
    event_id = first_non_empty(agent.get("id"), agent.get("name"))
    if event_id is None:
        raise AlertValidationError("alert must include agent.id or agent.name")
    event_timestamp = resolve_timestamp(payload)

    rule = require_object(payload, "rule")
    severity_value = rule.get("level")
    severity = coerce_int(severity_value, default=None)
    if severity is None:
        raise AlertValidationError("alert must include a numeric rule.level")

    expires_at = int(time.time()) + (RETENTION_DAYS * SECONDS_PER_DAY)

    return {
        "id": str(event_id),
        "timestamp": event_timestamp,
        "severity": severity,
        "eventType": "wazuh_alert",
        "raw": raw_body,
        "expiresAt": expires_at,
    }


def to_dynamodb_item(normalized: dict[str, Any]) -> dict[str, dict[str, str]]:
    return {
        "id": {"S": normalized["id"]},
        "timestamp": {"S": normalized["timestamp"]},
        "severity": {"N": str(normalized["severity"])},
        "eventType": {"S": normalized["eventType"]},
        "raw": {"S": normalized["raw"]},
        "expiresAt": {"N": str(normalized["expiresAt"])},
    }


def batch_write_with_retries(
    prepared_items: list[tuple[str, dict[str, dict[str, str]]]]
) -> list[str]:
    if DYNAMODB is None:
        raise RuntimeError("DynamoDB client is not configured")

    failed_message_ids: list[str] = []

    for start in range(0, len(prepared_items), MAX_BATCH_WRITE_SIZE):
        batch = prepared_items[start : start + MAX_BATCH_WRITE_SIZE]
        request_items = [{"PutRequest": {"Item": item}} for _, item in batch]

        id_lookup: dict[str, list[str]] = {}
        for message_id, item in batch:
            item_key = json.dumps(item, sort_keys=True)
            id_lookup.setdefault(item_key, []).append(message_id)

        unprocessed = request_items
        retries = 0

        while unprocessed and retries < MAX_BATCH_WRITE_RETRIES:
            response = DYNAMODB.batch_write_item(RequestItems={TABLE_NAME: unprocessed})
            unprocessed = response.get("UnprocessedItems", {}).get(TABLE_NAME, [])
            if unprocessed:
                time.sleep(0.2 * (2**retries))
            retries += 1

        if unprocessed:
            for request in unprocessed:
                item = request["PutRequest"]["Item"]
                item_key = json.dumps(item, sort_keys=True)
                remaining_ids = id_lookup.get(item_key, [])
                if remaining_ids:
                    failed_message_ids.append(remaining_ids.pop(0))

    return failed_message_ids


def resolve_timestamp(payload: dict[str, Any]) -> str:
    timestamp_value = payload.get("timestamp") or payload.get("@timestamp")

    if isinstance(timestamp_value, str):
        parsed = parse_iso_timestamp(timestamp_value)
        if parsed:
            return parsed

    if isinstance(timestamp_value, (int, float)):
        dt = datetime.fromtimestamp(float(timestamp_value), tz=timezone.utc).replace(
            microsecond=0
        )
        return dt.isoformat().replace("+00:00", "Z")

    raise AlertValidationError(
        "alert must include a valid timestamp or @timestamp value"
    )


def parse_iso_timestamp(value: str) -> str | None:
    cleaned = value.strip()
    if not cleaned:
        return None

    if cleaned.endswith("Z"):
        cleaned = f"{cleaned[:-1]}+00:00"

    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    else:
        parsed = parsed.astimezone(timezone.utc)

    return parsed.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def coerce_int(value: Any, default: int | None) -> int | None:
    if isinstance(value, bool):
        return int(value)
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def require_object(payload: dict[str, Any], key: str) -> dict[str, Any]:
    value = payload.get(key)
    if isinstance(value, dict):
        return value
    raise AlertValidationError(f"alert must include an object '{key}' field")


def first_non_empty(*values: Any) -> Any:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None
