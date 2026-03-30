import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ.setdefault("TABLE_NAME", "telemetry-test")
os.environ.setdefault("RETENTION_DAYS", "30")

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import handler as ingest_handler  # noqa: E402


class FakeDynamoDbClient:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def batch_write_item(self, RequestItems: dict) -> dict:
        self.calls.append(RequestItems)
        return {"UnprocessedItems": {}}


class WazuhIngestHandlerTests(unittest.TestCase):
    def test_valid_and_invalid_records(self) -> None:
        fake_ddb = FakeDynamoDbClient()
        valid_body = (
            '{"timestamp":"2026-03-02T18:30:00Z","agent":{"id":"001","name":"endpoint-001"},'
            '"manager":{"name":"wazuh-manager"},"rule":{"id":"5710","level":10,'
            '"description":"SSH brute force attempt"},'
            '"full_log":"Failed password for invalid user admin from 1.2.3.4 port 4242 ssh2"}'
        )

        sqs_event = {
            "Records": [
                {"messageId": "msg-valid", "body": valid_body},
                {"messageId": "msg-invalid", "body": '{"rule":'},
            ]
        }

        with patch.object(ingest_handler, "DYNAMODB", fake_ddb), patch.object(
            ingest_handler, "TABLE_NAME", "telemetry-test"
        ), patch.object(ingest_handler.time, "time", return_value=1_700_000_000):
            response = ingest_handler.handler(sqs_event, None)

        self.assertEqual(
            response,
            {"batchItemFailures": [{"itemIdentifier": "msg-invalid"}]},
        )
        self.assertEqual(len(fake_ddb.calls), 1)
        request_items = fake_ddb.calls[0]["telemetry-test"]
        self.assertEqual(len(request_items), 1)

        written_item = request_items[0]["PutRequest"]["Item"]
        self.assertEqual(written_item["agentId"]["S"], "001")
        self.assertEqual(written_item["id"]["S"], "001")
        self.assertEqual(written_item["timestamp"]["S"], "2026-03-02T18:30:00Z")
        self.assertEqual(written_item["severity"]["N"], "10")
        self.assertEqual(written_item["eventType"]["S"], "wazuh_alert")
        self.assertEqual(written_item["raw"]["S"], valid_body)
        expected_ttl = 1_700_000_000 + (30 * 24 * 60 * 60)
        self.assertEqual(written_item["expiresAt"]["N"], str(expected_ttl))

    def test_structurally_invalid_alert_returns_record_failure(self) -> None:
        fake_ddb = FakeDynamoDbClient()
        invalid_body = json.dumps(
            {
                "timestamp": "2026-03-02T18:30:00Z",
                "agent": {"id": "001"},
                "rule": {"description": "missing level"},
            }
        )
        sqs_event = {"Records": [{"messageId": "msg-schema", "body": invalid_body}]}

        with patch.object(ingest_handler, "DYNAMODB", fake_ddb), patch.object(
            ingest_handler, "TABLE_NAME", "telemetry-test"
        ):
            response = ingest_handler.handler(sqs_event, None)

        self.assertEqual(
            response,
            {"batchItemFailures": [{"itemIdentifier": "msg-schema"}]},
        )
        self.assertEqual(fake_ddb.calls, [])

    def test_invalid_json_returns_record_failure(self) -> None:
        fake_ddb = FakeDynamoDbClient()
        sqs_event = {"Records": [{"messageId": "msg-bad", "body": "not-json"}]}

        with patch.object(ingest_handler, "DYNAMODB", fake_ddb), patch.object(
            ingest_handler, "TABLE_NAME", "telemetry-test"
        ):
            response = ingest_handler.handler(sqs_event, None)

        self.assertEqual(
            response,
            {"batchItemFailures": [{"itemIdentifier": "msg-bad"}]},
        )
        self.assertEqual(fake_ddb.calls, [])

    def test_epoch_timestamp_is_normalized_to_utc_iso(self) -> None:
        normalized = ingest_handler.normalize_event(
            payload={
                "timestamp": 1_709_311_800,
                "agent": {"name": "endpoint-002"},
                "rule": {"level": "7"},
            },
            raw_body="{}",
        )

        self.assertEqual(normalized["id"], "endpoint-002")
        self.assertEqual(normalized["timestamp"], "2024-03-01T16:50:00Z")
        self.assertEqual(normalized["severity"], 7)


if __name__ == "__main__":
    unittest.main()
