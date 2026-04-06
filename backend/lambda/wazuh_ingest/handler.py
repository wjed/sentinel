"""
Wazuh Ingest Lambda - reads alert batches from SQS, writes to S3 Data Lake.

Environment variables:
  ALERTS_BUCKET_NAME - S3 bucket name for alert storage
"""

import json
import os
import uuid
from datetime import datetime

import boto3

BUCKET_NAME = os.environ["ALERTS_BUCKET_NAME"]
s3 = boto3.client("s3")


def handler(event, context):
    """Process SQS batch of Wazuh alerts -> S3."""
    failures = []

    for record in event.get("Records", []):
        try:
            body = json.loads(record["body"])

            alert_id = body.get("id", str(uuid.uuid4()))
            timestamp_str = body.get("timestamp", datetime.utcnow().isoformat())
            
            # Use sortable filename: YYYY-MM-DD/HH-MM-SS-<uuid>.json
            try:
                # Wazuh: 2026-04-06T13:30:05.123+0000
                dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00").split(".")[0])
                time_prefix = dt.strftime("%H-%M-%S")
                date_prefix = dt.strftime("%Y-%m-%d")
            except:
                time_prefix = "00-00-00"
                date_prefix = timestamp_str[:10]

            key = f"alerts/{date_prefix}/{time_prefix}-{alert_id}.json"

            s3.put_object(
                Bucket=BUCKET_NAME,
                Key=key,
                Body=json.dumps({
                    "alertId": alert_id,
                    "timestamp": timestamp_str,
                    "rule": body.get("rule", {}),
                    "agent": body.get("agent", {}),
                    "data": body.get("data", {}),
                    "level": body.get("rule", {}).get("level", 0),
                    "raw": body
                }),
                ContentType="application/json"
            )

        except Exception as e:
            print(f"Failed to process record {record.get('messageId')}: {e}")
            failures.append({"itemIdentifier": record.get("messageId")})

    return {"batchItemFailures": failures}
