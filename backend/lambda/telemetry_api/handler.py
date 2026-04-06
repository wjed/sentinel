import json
import os
import boto3

BUCKET_NAME = os.environ["ALERTS_BUCKET_NAME"]
s3 = boto3.client("s3")


def json_response(body, status_code=200):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(body),
    }


def handler(event, context):
    """List 50 most recent alerts from S3 and return content to Dashboard."""
    if event.get("httpMethod") == "OPTIONS":
        return json_response({}, 200)

    try:
        # List alerts (sortable by Key: alerts/YYYY-MM-DD/HH-MM-SS-<uuid>.json)
        response = s3.list_objects_v2(
            Bucket=BUCKET_NAME, 
            Prefix="alerts/",
            MaxKeys=100
        )
        
        contents = response.get("Contents", [])
        if not contents:
            return json_response([])

        # Sort by Key Descending (latest first)
        contents.sort(key=lambda x: x["Key"], reverse=True)
        
        # Pull the latest 50 alerts
        latest_50 = contents[:50]
        results = []
        
        for obj in latest_50:
            try:
                res = s3.get_object(Bucket=BUCKET_NAME, Key=obj["Key"])
                data = json.loads(res["Body"].read().decode("utf-8"))
                results.append(data)
            except Exception as e:
                print(f"Failed to read {obj['Key']}: {e}")

        return json_response(results)

    except Exception as e:
        print(f"Error fetching alerts: {e}")
        return json_response({"error": str(e)}, 500)
