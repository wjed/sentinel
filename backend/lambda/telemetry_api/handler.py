import json
import os
import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ["TABLE_NAME"]
REGION = os.environ.get("AWS_REGION", "us-east-1")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

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
    if event.get("httpMethod") == "OPTIONS":
        return json_response({}, 200)

    try:
        # Scan for last 50 items (POC simple approach)
        # In production, we would use a GSI or query by date
        response = table.scan(Limit=50)
        items = response.get("Items", [])
        
        # Sort items by timestamp (sk) descending
        items.sort(key=lambda x: x.get("sk", ""), reverse=True)
        
        return json_response(items)
    except Exception as e:
        print(f"Error: {str(e)}")
        return json_response({"error": str(e)}, 500)
