import json
import os
from datetime import datetime, timezone
from urllib.parse import unquote

import boto3
from botocore.exceptions import ClientError

USER_POOL_ID = os.environ["USER_POOL_ID"]
ADMIN_GROUP_NAME = os.environ.get("ADMIN_GROUP_NAME", "SentinelNetAdmins")
ANALYST_GROUP_NAME = os.environ.get("ANALYST_GROUP_NAME", "SentinelNetAnalysts")
VIEWER_GROUP_NAME = os.environ.get("VIEWER_GROUP_NAME", "SentinelNetViewers")
MANAGED_GROUPS = [ADMIN_GROUP_NAME, ANALYST_GROUP_NAME, VIEWER_GROUP_NAME]
MANAGED_GROUP_SET = set(MANAGED_GROUPS)
PAGE_SIZE = int(os.environ.get("LIST_USERS_PAGE_SIZE", "25"))

cognito = boto3.client("cognito-idp")


def json_response(body, status_code=200):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Authorization,Content-Type",
        },
        "body": json.dumps(body),
    }


def get_claims(event):
    return (event or {}).get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})


def get_groups_from_claims(claims):
    raw = claims.get("cognito:groups") or claims.get("groups") or []
    if isinstance(raw, list):
        return {str(group).strip() for group in raw if str(group).strip()}
    if isinstance(raw, str):
        return {group.strip() for group in raw.replace(" ", ",").split(",") if group.strip()}
    return set()


def get_actor(event):
    claims = get_claims(event)
    username = claims.get("cognito:username") or claims.get("username") or claims.get("sub")
    email = claims.get("email")
    groups = get_groups_from_claims(claims)
    return {"username": username, "email": email, "groups": groups}


def ensure_admin(event):
    actor = get_actor(event)
    if not actor["username"]:
        return None, json_response({"error": "Unauthorized"}, 401)
    if ADMIN_GROUP_NAME not in actor["groups"]:
        return None, json_response({"error": "Forbidden"}, 403)
    return actor, None


def parse_body(event):
    if not event.get("body"):
        return {}
    if isinstance(event["body"], dict):
        return event["body"]
    try:
        return json.loads(event["body"])
    except Exception:
        raise ValueError("Invalid JSON")


def get_attribute(attributes, name):
    for attr in attributes or []:
        if attr.get("Name") == name:
            return attr.get("Value")
    return None


def serialize_user(user, groups):
    attributes = user.get("Attributes", [])
    return {
        "username": user.get("Username"),
        "email": get_attribute(attributes, "email"),
        "enabled": user.get("Enabled", True),
        "userCreateDate": user.get("UserCreateDate").isoformat() if user.get("UserCreateDate") else None,
        "userLastModifiedDate": user.get("UserLastModifiedDate").isoformat() if user.get("UserLastModifiedDate") else None,
        "groups": sorted(group for group in groups if group in MANAGED_GROUP_SET),
    }


def list_groups_for_user(username):
    response = cognito.admin_list_groups_for_user(
        UserPoolId=USER_POOL_ID,
        Username=username,
    )
    return sorted(group["GroupName"] for group in response.get("Groups", []) if group.get("GroupName") in MANAGED_GROUP_SET)


def find_user(identifier):
    try:
        response = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=identifier)
        return {
            "Username": response.get("Username"),
            "Enabled": response.get("Enabled", True),
            "UserCreateDate": response.get("UserCreateDate"),
            "UserLastModifiedDate": response.get("UserLastModifiedDate"),
            "Attributes": response.get("UserAttributes", []),
        }
    except ClientError as error:
        code = error.response.get("Error", {}).get("Code")
        if code != "UserNotFoundException":
            raise

    paginator = cognito.get_paginator("list_users")
    for page in paginator.paginate(UserPoolId=USER_POOL_ID, PaginationConfig={"PageSize": 60}):
        for user in page.get("Users", []):
            email = get_attribute(user.get("Attributes", []), "email")
            if email and email.lower() == identifier.lower():
                return user
    return None


def require_identifier(identifier):
    if not isinstance(identifier, str) or not identifier.strip():
        raise ValueError("Missing user identifier")
    return identifier.strip()


def require_group(group):
    if group not in MANAGED_GROUP_SET:
        raise ValueError("Invalid group")
    return group


def audit_log(actor, operation, target_user=None, target_group=None, success=True, detail=None):
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": actor["username"],
        "actorEmail": actor.get("email"),
        "operation": operation,
        "targetUser": target_user,
        "targetGroup": target_group,
        "success": success,
        "detail": detail,
    }
    print(json.dumps(payload))


def handle_list_users(event):
    # Query params for pagination are intentionally backend-controlled and not
    # exposed as freeform shell behavior.
    query = event_query_params(event)
    next_token = query.get("nextToken")
    kwargs = {"UserPoolId": USER_POOL_ID, "Limit": PAGE_SIZE}
    if next_token:
        kwargs["PaginationToken"] = next_token
    response = cognito.list_users(**kwargs)
    users = []
    for user in response.get("Users", []):
        groups = list_groups_for_user(user.get("Username"))
        users.append(serialize_user(user, groups))
    return json_response({"users": users, "nextToken": response.get("PaginationToken")})


def handle_get_user(identifier):
    user = find_user(identifier)
    if not user:
        return json_response({"error": "User not found"}, 404)
    groups = list_groups_for_user(user["Username"])
    return json_response({"user": serialize_user(user, groups)})


def handle_group_mutation(actor, operation, body):
    identifier = require_identifier(body.get("identifier"))
    group = require_group(body.get("group"))
    user = find_user(identifier)
    if not user:
        audit_log(actor, operation, target_user=identifier, target_group=group, success=False, detail="user_not_found")
        return json_response({"error": "User not found"}, 404)

    username = user["Username"]
    try:
        if operation == "grant-access":
            cognito.admin_add_user_to_group(UserPoolId=USER_POOL_ID, Username=username, GroupName=group)
            message = f"Granted {group} to {username}"
        else:
            cognito.admin_remove_user_from_group(UserPoolId=USER_POOL_ID, Username=username, GroupName=group)
            message = f"Revoked {group} from {username}"
        groups = list_groups_for_user(username)
        audit_log(actor, operation, target_user=username, target_group=group, success=True)
        return json_response({
            "ok": True,
            "message": message,
            "user": serialize_user(user, groups),
        })
    except ClientError as error:
        audit_log(actor, operation, target_user=username, target_group=group, success=False, detail=error.response.get("Error", {}).get("Code"))
        print(error)
        return json_response({"error": "AWS API failure"}, 502)

def event_query_params(event):
    return (event or {}).get("queryStringParameters") or {}


def handler(event, context):
    event = event or {}

    method = (event.get("requestContext") or {}).get("http", {}).get("method") or event.get("httpMethod")
    if method == "OPTIONS":
        return json_response({}, 200)

    actor, auth_error = ensure_admin(event)
    if auth_error:
        return auth_error

    path = event.get("rawPath") or (event.get("requestContext") or {}).get("http", {}).get("path", "")
    try:
        if method == "GET" and path == "/admin/access/groups":
            return json_response({"groups": MANAGED_GROUPS})

        if method == "GET" and path == "/admin/access/whoami":
            return json_response({
                "user": {
                    "username": actor["username"],
                    "email": actor.get("email"),
                    "groups": sorted(actor["groups"] & MANAGED_GROUP_SET),
                    "isAdmin": ADMIN_GROUP_NAME in actor["groups"],
                }
            })

        if method == "GET" and path == "/admin/access/users":
            return handle_list_users(event)

        if method == "GET" and path.startswith("/admin/access/users/"):
            identifier = require_identifier(unquote(path.rsplit("/", 1)[-1]))
            return handle_get_user(identifier)

        if method == "POST" and path == "/admin/access/grant":
            return handle_group_mutation(actor, "grant-access", parse_body(event))

        if method == "POST" and path == "/admin/access/revoke":
            return handle_group_mutation(actor, "revoke-access", parse_body(event))

        return json_response({"error": "Unknown command"}, 404)
    except ValueError as error:
        audit_log(actor, "validation-error", success=False, detail=str(error))
        return json_response({"error": str(error)}, 400)
    except ClientError as error:
        audit_log(actor, "aws-error", success=False, detail=error.response.get("Error", {}).get("Code"))
        print(error)
        code = error.response.get("Error", {}).get("Code")
        if code == "UserNotFoundException":
            return json_response({"error": "User not found"}, 404)
        return json_response({"error": "AWS API failure"}, 502)
    except Exception as error:
        audit_log(actor, "internal-error", success=False, detail=type(error).__name__)
        print(error)
        return json_response({"error": "Internal server error"}, 500)
