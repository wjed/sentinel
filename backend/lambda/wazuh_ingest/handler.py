"""
Wazuh Ingest Lambda - reads alert batches from SQS, writes to DynamoDB.

Environment variables:
  TABLE_NAME     - DynamoDB telemetry table name
  RETENTION_DAYS - TTL in days (default 30)
"""

import json
import os
import time
import uuid
from datetime import datetime

import boto3

TABLE_NAME = os.environ["TABLE_NAME"]
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "30"))

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def handler(event, context):
    """Process SQS batch of Wazuh alerts -> DynamoDB."""
    failures = []

    for record in event.get("Records", []):
        try:
            body = json.loads(record["body"])

            alert_id = body.get("id", str(uuid.uuid4()))
            timestamp = body.get("timestamp", datetime.utcnow().isoformat())
            ttl = int(time.time()) + (RETENTION_DAYS * 86400)

            table.put_item(Item={
                "pk": f"ALERT#{timestamp[:10]}",
                "sk": f"{timestamp}#{alert_id}",
                "alertId": alert_id,
                "timestamp": timestamp,
                "rule": body.get("rule", {}),
                "agent": body.get("agent", {}),
                "data": body.get("data", {}),
                "level": body.get("rule", {}).get("level", 0),
                "ttl": ttl,
                "raw": json.dumps(body),
            })

        except Exception as e:
            print(f"Failed to process record {record['messageId']}: {e}")
            failures.append({"itemIdentifier": record["messageId"]})

    return {"batchItemFailures": failures}
