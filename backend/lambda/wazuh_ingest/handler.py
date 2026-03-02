import json
import os
import time
from datetime import datetime, timezone
from typing import Any

import boto3

TABLE_NAME = os.environ["TABLE_NAME"]
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "30"))
MAX_BATCH_WRITE_SIZE = 25
MAX_BATCH_WRITE_RETRIES = 5

DYNAMODB = boto3.client("dynamodb")


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
                raise ValueError("Event payload must be a JSON object")

            normalized = normalize_event(payload)
            prepared_items.append((message_id, to_dynamodb_item(normalized)))
        except Exception as err:
            print(f"Failed to parse/normalize SQS message {message_id}: {err}")
            if message_id:
                failed_message_ids.append(message_id)

    if prepared_items:
        failed_message_ids.extend(batch_write_with_retries(prepared_items))

    return {
        "batchItemFailures": [
            {"itemIdentifier": message_id}
            for message_id in sorted(set(failed_message_ids))
        ]
    }


def normalize_event(payload: dict[str, Any]) -> dict[str, Any]:
    event_time_iso, event_time_epoch = resolve_timestamp(payload)

    agent = payload.get("agent") if isinstance(payload.get("agent"), dict) else {}
    derived_id = (
        payload.get("id")
        or payload.get("agentId")
        or payload.get("agent_id")
        or agent.get("id")
        or payload.get("source")
        or "unknown-source"
    )

    rule = payload.get("rule") if isinstance(payload.get("rule"), dict) else {}
    event_type = (
        payload.get("eventType")
        or payload.get("event_type")
        or payload.get("type")
        or rule.get("description")
        or "wazuh.alert"
    )

    severity = payload.get("severity")
    if severity is None:
        severity = rule.get("level")

    if severity is None:
        severity = "0"

    ttl_epoch = event_time_epoch + (RETENTION_DAYS * 24 * 60 * 60)

    return {
        "id": str(derived_id),
        "timestamp": event_time_iso,
        "eventType": str(event_type),
        "severity": severity,
        "raw": json.dumps(payload, separators=(",", ":"), sort_keys=True, default=str),
        "expiresAt": ttl_epoch,
    }


def to_dynamodb_item(normalized: dict[str, Any]) -> dict[str, dict[str, str]]:
    severity = normalized["severity"]
    if isinstance(severity, (int, float)):
        severity_attr = {"N": str(severity)}
    else:
        severity_text = str(severity)
        severity_attr = {"N": severity_text} if severity_text.isdigit() else {"S": severity_text}

    return {
        "id": {"S": normalized["id"]},
        "timestamp": {"S": normalized["timestamp"]},
        "eventType": {"S": normalized["eventType"]},
        "severity": severity_attr,
        "raw": {"S": normalized["raw"]},
        "expiresAt": {"N": str(int(normalized["expiresAt"]))},
    }


def batch_write_with_retries(
    prepared_items: list[tuple[str, dict[str, dict[str, str]]]]
) -> list[str]:
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
                time.sleep(0.2 * (2 ** retries))
            retries += 1

        if unprocessed:
            for request in unprocessed:
                item = request["PutRequest"]["Item"]
                item_key = json.dumps(item, sort_keys=True)
                remaining = id_lookup.get(item_key, [])
                if remaining:
                    failed_message_ids.append(remaining.pop(0))

    return failed_message_ids


def resolve_timestamp(payload: dict[str, Any]) -> tuple[str, int]:
    candidate = payload.get("timestamp") or payload.get("@timestamp") or payload.get("time")

    if isinstance(candidate, (int, float)):
        dt = datetime.fromtimestamp(float(candidate), tz=timezone.utc)
        dt = dt.replace(microsecond=0)
        return dt.isoformat().replace("+00:00", "Z"), int(dt.timestamp())

    if isinstance(candidate, str):
        parsed = parse_iso_timestamp(candidate)
        if parsed is not None:
            return parsed

    now = datetime.now(timezone.utc).replace(microsecond=0)
    return now.isoformat().replace("+00:00", "Z"), int(now.timestamp())


def parse_iso_timestamp(value: str) -> tuple[str, int] | None:
    text = value.strip()
    if not text:
        return None

    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"

    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)

    dt = dt.replace(microsecond=0)
    return dt.isoformat().replace("+00:00", "Z"), int(dt.timestamp())
