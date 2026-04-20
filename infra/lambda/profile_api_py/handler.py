import json
import os
from datetime import datetime

import boto3

TABLE_NAME = os.environ["TABLE_NAME"]
REGION = os.environ.get("AWS_REGION", "us-east-1")
ALLOWED_GROUPS = {
    g.strip()
    for g in os.environ.get(
        "ALLOWED_GROUPS",
        "SentinelNetAdmins,SentinelNetAnalysts,SentinelNetViewers",
    ).split(",")
    if g.strip()
}

dynamo = boto3.client("dynamodb", region_name=REGION)

PROFILE_ATTRS = ("displayName", "avatarIcon", "jobFunction", "bio")


def json_response(body, status_code=200):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,PATCH,OPTIONS",
            "Access-Control-Allow-Headers": "Authorization,Content-Type",
        },
        "body": json.dumps(body),
    }


def get_sub(event):
    claims = (event or {}).get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    return claims.get("sub")


def get_claim_groups(event):
    claims = (event or {}).get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    raw = claims.get("cognito:groups") or claims.get("groups") or []
    if isinstance(raw, list):
        return {str(g).strip() for g in raw if str(g).strip()}
    if isinstance(raw, str):
        return {g.strip() for g in raw.replace(" ", ",").split(",") if g.strip()}
    return set()


def is_allowed(event):
    return bool(ALLOWED_GROUPS & get_claim_groups(event))


def item_to_profile(sub, item):
    if not item:
        return {"userId": sub, "displayName": None, "avatarIcon": None, "jobFunction": None, "bio": None}
    return {
        "userId": sub,
        **{k: (item.get(k, {}).get("S") if item.get(k) else None) for k in PROFILE_ATTRS},
    }


def handler(event, context):
    method = (event.get("requestContext") or {}).get("http", {}).get("method") or event.get("httpMethod")
    if method == "OPTIONS":
        return json_response({}, 200)

    sub = get_sub(event)
    if not sub:
        return json_response({"error": "Unauthorized"}, 401)
    if not is_allowed(event):
        return json_response({"error": "Forbidden"}, 403)

    path = event.get("rawPath") or (event.get("requestContext") or {}).get("http", {}).get("path", "")

    try:
        if method == "GET" and path == "/profile":
            resp = dynamo.get_item(TableName=TABLE_NAME, Key={"userId": {"S": sub}})
            return json_response(item_to_profile(sub, resp.get("Item")))

        if method == "PATCH" and path == "/profile":
            body = {}
            if event.get("body"):
                try:
                    body = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]
                except Exception:
                    return json_response({"error": "Invalid JSON"}, 400)

            now = datetime.utcnow().isoformat() + "Z"
            item = {"userId": {"S": sub}, "updatedAt": {"S": now}}
            for attr in PROFILE_ATTRS:
                val = body.get(attr)
                if val is not None:
                    item[attr] = {"S": str(val).strip() if attr != "avatarIcon" else str(val)}

            dynamo.put_item(TableName=TABLE_NAME, Item=item)
            return json_response({"ok": True})

        return json_response({"error": "Not found"}, 404)
    except Exception as err:
        print(err)
        return json_response({"error": "Internal server error"}, 500)
