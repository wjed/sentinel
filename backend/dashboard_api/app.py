"""
SentinelNet dashboard aggregations API.

Runs as a docker container on the SOC EC2 host. Queries wazuh.indexer (alerts)
and thehive (cases) via docker DNS and returns combined KPIs to the React
dashboard. Validates the caller's Cognito ID/access token using the user pool's
JWKS.

Endpoints:
  GET /healthz        - liveness probe (no auth)
  GET /api/dashboard/kpis  - aggregated KPIs (Cognito JWT required)

Env vars:
  COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID
  ALLOWED_GROUPS                 (comma-separated)
  INDEXER_URL, INDEXER_USER, INDEXER_PASS
  THEHIVE_URL, THEHIVE_API_KEY
"""

import json
import os
import ssl
import time
import urllib.request
import urllib.error
from base64 import urlsafe_b64decode
from functools import lru_cache

from flask import Flask, jsonify, request

try:
    import jwt
    from jwt import PyJWKClient
except ImportError:
    jwt = None
    PyJWKClient = None

app = Flask(__name__)

REGION = os.environ.get("COGNITO_REGION", "us-east-1")
USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")
CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "")
ALLOWED_GROUPS = {
    g.strip()
    for g in os.environ.get(
        "ALLOWED_GROUPS",
        "SentinelNetAdmins,SentinelNetAnalysts,SentinelNetViewers",
    ).split(",")
    if g.strip()
}

INDEXER_URL = os.environ.get("INDEXER_URL", "https://wazuh.indexer:9200").rstrip("/")
INDEXER_USER = os.environ.get("INDEXER_USER", "admin")
INDEXER_PASS = os.environ.get("INDEXER_PASS", "")

THEHIVE_URL = os.environ.get("THEHIVE_URL", "http://thehive:9000").rstrip("/")
THEHIVE_API_KEY = os.environ.get("THEHIVE_API_KEY", "")

WAZUH_MANAGER_URL = os.environ.get("WAZUH_MANAGER_URL", "https://wazuh-manager:55000").rstrip("/")
WAZUH_MANAGER_USER = os.environ.get("WAZUH_MANAGER_USER", "wazuh-wui")
WAZUH_MANAGER_PASS = os.environ.get("WAZUH_MANAGER_PASS", "")

GRAFANA_URL = os.environ.get("GRAFANA_URL", "http://grafana:3000").rstrip("/")
WAZUH_DASHBOARD_URL = os.environ.get("WAZUH_DASHBOARD_URL", "http://wazuh-dashboard:5601").rstrip("/")
ELASTICSEARCH_URL = os.environ.get("ELASTICSEARCH_URL", "http://elasticsearch:9200").rstrip("/")

ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}" if USER_POOL_ID else ""
JWKS_URL = f"{ISSUER}/.well-known/jwks.json" if ISSUER else ""


# ── Auth ─────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _jwk_client():
    if not PyJWKClient or not JWKS_URL:
        return None
    return PyJWKClient(JWKS_URL)


def _decode_unverified(token):
    """Fallback when PyJWT isn't available — decode payload without verifying."""
    try:
        _, payload_b64, _ = token.split(".")
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        return json.loads(urlsafe_b64decode(padded))
    except Exception:
        return None


def verify_token(token):
    if not token:
        return None
    if not jwt or not USER_POOL_ID:
        return _decode_unverified(token)
    try:
        signing_key = _jwk_client().get_signing_key_from_jwt(token).key
        # access tokens have client_id, id tokens have aud
        unverified = jwt.decode(token, options={"verify_signature": False})
        if unverified.get("token_use") == "id":
            claims = jwt.decode(
                token, signing_key, algorithms=["RS256"],
                audience=CLIENT_ID, issuer=ISSUER,
            )
        else:
            claims = jwt.decode(
                token, signing_key, algorithms=["RS256"], issuer=ISSUER,
            )
            if CLIENT_ID and claims.get("client_id") != CLIENT_ID:
                return None
        return claims
    except Exception as e:
        app.logger.warning("token verify failed: %s", e)
        return None


def _claim_groups(claims):
    raw = (claims or {}).get("cognito:groups") or []
    if isinstance(raw, list):
        return {str(g).strip() for g in raw if str(g).strip()}
    if isinstance(raw, str):
        return {g.strip() for g in raw.replace(" ", ",").split(",") if g.strip()}
    return set()


def require_auth():
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.lower().startswith("bearer ") else None
    claims = verify_token(token)
    if not claims:
        return None, jsonify({"error": "Unauthorized"}), 401
    if ALLOWED_GROUPS and not (ALLOWED_GROUPS & _claim_groups(claims)):
        return None, jsonify({"error": "Forbidden"}), 403
    return claims, None, None


# ── HTTP helpers (stdlib, no requests) ───────────────────────────────────────

_TLS = ssl.create_default_context()
_TLS.check_hostname = False
_TLS.verify_mode = ssl.CERT_NONE  # self-signed indexer cert


def _http_json(method, url, body=None, headers=None, timeout=10):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=_TLS) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8") or "null")
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode("utf-8", "ignore")}
    except Exception as e:
        return 0, {"error": str(e)}


def _basic_auth_header(user, password):
    from base64 import b64encode
    return "Basic " + b64encode(f"{user}:{password}".encode()).decode()


# ── Wazuh aggregations ───────────────────────────────────────────────────────

def wazuh_kpis():
    """Aggregate over the last 24h from wazuh-alerts-*."""
    if not INDEXER_PASS:
        return {"error": "indexer not configured"}
    headers = {"Authorization": _basic_auth_header(INDEXER_USER, INDEXER_PASS)}
    body = {
        "size": 0,
        "query": {"range": {"timestamp": {"gte": "now-24h"}}},
        "aggs": {
            "severity": {
                "range": {
                    "field": "rule.level",
                    "ranges": [
                        {"key": "low",      "from": 0,  "to": 4},
                        {"key": "medium",   "from": 4,  "to": 7},
                        {"key": "high",     "from": 7,  "to": 12},
                        {"key": "critical", "from": 12, "to": 16},
                    ],
                },
            },
            "top_rules": {
                "terms": {"field": "rule.id", "size": 5, "order": {"_count": "desc"}},
                "aggs": {
                    "description": {"top_hits": {
                        "size": 1,
                        "_source": {"includes": ["rule.description", "rule.level"]},
                    }},
                },
            },
            "top_agents": {
                "terms": {"field": "agent.name", "size": 5, "order": {"_count": "desc"}},
            },
            "timeline": {
                "date_histogram": {
                    "field": "timestamp",
                    "fixed_interval": "1h",
                    "min_doc_count": 0,
                    "extended_bounds": {"min": "now-24h", "max": "now"},
                },
            },
        },
    }
    status, data = _http_json(
        "POST", f"{INDEXER_URL}/wazuh-alerts-*/_search", body=body, headers=headers,
    )
    if status != 200:
        return {"error": f"indexer {status}", "detail": data}

    aggs = data.get("aggregations", {})
    sev = {b["key"]: b["doc_count"] for b in aggs.get("severity", {}).get("buckets", [])}
    top_rules = []
    for b in aggs.get("top_rules", {}).get("buckets", []):
        hits = b.get("description", {}).get("hits", {}).get("hits", [])
        src = (hits[0].get("_source") if hits else {}) or {}
        top_rules.append({
            "rule_id": b["key"],
            "count": b["doc_count"],
            "description": (src.get("rule") or {}).get("description", ""),
            "level": (src.get("rule") or {}).get("level", 0),
        })
    top_agents = [
        {"agent": b["key"], "count": b["doc_count"]}
        for b in aggs.get("top_agents", {}).get("buckets", [])
    ]
    timeline = [
        {"t": b["key_as_string"], "count": b["doc_count"]}
        for b in aggs.get("timeline", {}).get("buckets", [])
    ]
    return {
        "total_24h": data.get("hits", {}).get("total", {}).get("value", 0),
        "severity": {
            "low": sev.get("low", 0),
            "medium": sev.get("medium", 0),
            "high": sev.get("high", 0),
            "critical": sev.get("critical", 0),
        },
        "top_rules": top_rules,
        "top_agents": top_agents,
        "timeline": timeline,
    }


# ── TheHive aggregations ─────────────────────────────────────────────────────

def thehive_kpis():
    """Counts and recent cases from TheHive."""
    if not THEHIVE_API_KEY:
        return {"error": "thehive not configured"}
    headers = {"Authorization": f"Bearer {THEHIVE_API_KEY}"}

    def query(body, path="/api/v1/query?name=kpi"):
        return _http_json("POST", f"{THEHIVE_URL}/thehive{path}", body=body, headers=headers)

    # status counts
    status, by_status = query({"query": [
        {"_name": "listCase"},
        {"_name": "aggregation", "_agg": "field", "_field": "status", "_select": [{"_agg": "count"}]},
    ]})
    if status != 200:
        return {"error": f"thehive {status}", "detail": by_status}

    # severity counts
    _, by_severity = query({"query": [
        {"_name": "listCase"},
        {"_name": "aggregation", "_agg": "field", "_field": "severity", "_select": [{"_agg": "count"}]},
    ]})

    # 5 most recent open cases
    _, recent = query({"query": [
        {"_name": "listCase"},
        {"_name": "filter", "_field": "status", "_value": "Open"},
        {"_name": "sort", "_fields": [{"_createdAt": "desc"}]},
        {"_name": "page", "from": 0, "to": 5, "extraData": ["assignee"]},
    ]})

    def to_counts(rows):
        out = {}
        for r in rows or []:
            if isinstance(r, dict):
                k = str(list(r.keys())[0]) if r else ""
                v = r.get(k) if k else 0
                out[k] = v
            elif isinstance(r, list) and len(r) >= 2:
                out[str(r[0])] = r[1]
        return out

    sev_map = to_counts(by_severity if isinstance(by_severity, list) else [])
    status_map = to_counts(by_status if isinstance(by_status, list) else [])

    recent_list = []
    for c in (recent if isinstance(recent, list) else []):
        recent_list.append({
            "number": c.get("number"),
            "title": c.get("title"),
            "severity": c.get("severity"),
            "status": c.get("status"),
            "createdAt": c.get("_createdAt") or c.get("createdAt"),
            "assignee": c.get("assignee"),
        })

    total = sum(status_map.values()) or sum(sev_map.values())
    open_count = (status_map.get("Open", 0) + status_map.get("InProgress", 0))

    return {
        "total": total,
        "open": open_count,
        "by_status": status_map,
        "by_severity": {
            "1_low": sev_map.get(1, 0),
            "2_medium": sev_map.get(2, 0),
            "3_high": sev_map.get(3, 0),
            "4_critical": sev_map.get(4, 0),
        },
        "recent": recent_list,
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/healthz")
@app.route("/api/dashboard/healthz")
def healthz():
    return jsonify({"ok": True, "indexer_configured": bool(INDEXER_PASS),
                    "thehive_configured": bool(THEHIVE_API_KEY)})


@app.route("/api/dashboard/kpis")
def kpis():
    claims, err, code = require_auth()
    if err:
        return err, code
    t0 = time.time()
    return jsonify({
        "wazuh": wazuh_kpis(),
        "thehive": thehive_kpis(),
        "elapsed_ms": int((time.time() - t0) * 1000),
        "user": claims.get("email") or claims.get("username"),
    })


# ── Wazuh agents (Assets page) ───────────────────────────────────────────────

def _wazuh_manager_token():
    """Authenticate to Wazuh manager API and return a JWT, or None on failure."""
    if not WAZUH_MANAGER_PASS:
        return None
    headers = {"Authorization": _basic_auth_header(WAZUH_MANAGER_USER, WAZUH_MANAGER_PASS)}
    status, data = _http_json(
        "POST", f"{WAZUH_MANAGER_URL}/security/user/authenticate",
        headers=headers, timeout=5,
    )
    if status == 200 and isinstance(data, dict):
        return (data.get("data") or {}).get("token")
    return None


def list_agents():
    token = _wazuh_manager_token()
    if not token:
        return {"error": "manager unreachable", "agents": []}
    headers = {"Authorization": f"Bearer {token}"}
    status, data = _http_json(
        "GET", f"{WAZUH_MANAGER_URL}/agents?limit=500&select=id,name,ip,os.name,os.version,version,status,lastKeepAlive,group",
        headers=headers, timeout=8,
    )
    if status != 200:
        return {"error": f"manager {status}", "agents": []}
    items = ((data or {}).get("data") or {}).get("affected_items", [])
    agents = []
    for a in items:
        os_info = a.get("os") or {}
        agents.append({
            "id":         a.get("id"),
            "name":       a.get("name"),
            "ip":         a.get("ip"),
            "os":         f"{os_info.get('name', '')} {os_info.get('version', '')}".strip() or "—",
            "version":    a.get("version"),
            "status":     a.get("status"),
            "lastSeen":   a.get("lastKeepAlive"),
            "groups":     a.get("group") or [],
        })
    return {"agents": agents, "total": len(agents)}


@app.route("/api/dashboard/agents")
def agents_route():
    claims, err, code = require_auth()
    if err:
        return err, code
    return jsonify(list_agents())


# ── TheHive cases (Incidents page) ───────────────────────────────────────────

def list_cases(limit=200):
    if not THEHIVE_API_KEY:
        return {"error": "thehive not configured", "cases": []}
    headers = {"Authorization": f"Bearer {THEHIVE_API_KEY}"}
    body = {"query": [
        {"_name": "listCase"},
        {"_name": "sort", "_fields": [{"_createdAt": "desc"}]},
        {"_name": "page", "from": 0, "to": limit, "extraData": ["assignee"]},
    ]}
    status, data = _http_json(
        "POST", f"{THEHIVE_URL}/thehive/api/v1/query?name=cases",
        body=body, headers=headers, timeout=8,
    )
    if status != 200:
        return {"error": f"thehive {status}", "cases": []}
    cases = []
    for c in (data if isinstance(data, list) else []):
        cases.append({
            "id":           c.get("number"),
            "title":        c.get("title"),
            "description":  c.get("description"),
            "severity":     c.get("severity"),
            "tlp":          c.get("tlp"),
            "pap":          c.get("pap"),
            "status":       c.get("status"),
            "tags":         c.get("tags") or [],
            "assignee":     c.get("assignee"),
            "createdBy":    c.get("_createdBy") or c.get("createdBy"),
            "createdAt":    c.get("_createdAt") or c.get("createdAt"),
            "updatedAt":    c.get("_updatedAt") or c.get("updatedAt"),
        })
    return {"cases": cases, "total": len(cases)}


@app.route("/api/dashboard/cases")
def cases_route():
    claims, err, code = require_auth()
    if err:
        return err, code
    return jsonify(list_cases())


# ── Recent alerts (Alerts page) ──────────────────────────────────────────────

def recent_alerts(limit=200):
    if not INDEXER_PASS:
        return {"error": "indexer not configured", "alerts": []}
    headers = {"Authorization": _basic_auth_header(INDEXER_USER, INDEXER_PASS)}
    body = {
        "size": limit,
        "sort": [{"timestamp": {"order": "desc"}}],
        "_source": ["timestamp", "rule", "agent", "data", "decoder", "location",
                    "manager", "predecoder", "id", "full_log"],
    }
    status, data = _http_json(
        "POST", f"{INDEXER_URL}/wazuh-alerts-*/_search",
        body=body, headers=headers, timeout=8,
    )
    if status != 200:
        return {"error": f"indexer {status}", "alerts": []}
    hits = ((data or {}).get("hits") or {}).get("hits", [])
    return {
        "alerts": [{**h.get("_source", {}), "_id": h.get("_id")} for h in hits],
        "total": len(hits),
    }


@app.route("/api/dashboard/alerts")
def alerts_route():
    claims, err, code = require_auth()
    if err:
        return err, code
    return jsonify(recent_alerts())


# ── System health (Dashboard page service-status grid) ───────────────────────

def _check(label, fn, **meta):
    t0 = time.time()
    try:
        ok, detail = fn()
    except Exception as e:
        ok, detail = False, str(e)
    return {
        "name":       label,
        "status":     "up" if ok else "down",
        "latency_ms": int((time.time() - t0) * 1000),
        "detail":     detail,
        **meta,
    }


def _http_status(method, url, headers=None, expect=(200,), timeout=4):
    code, _ = _http_json(method, url, headers=headers, timeout=timeout)
    return code in expect, f"HTTP {code}"


def system_health():
    checks = []

    # TheHive
    checks.append(_check("TheHive", lambda: _http_status(
        "GET", f"{THEHIVE_URL}/thehive/api/status",
    ), href="/thehive/"))

    # Grafana
    checks.append(_check("Grafana", lambda: _http_status(
        "GET", f"{GRAFANA_URL}/api/health",
    ), href="/grafana/"))

    # Wazuh Dashboard (uses kibanaserver basic auth on /api/status)
    def _wazuh_dashboard():
        headers = {"Authorization": _basic_auth_header("kibanaserver", INDEXER_PASS or "WazuhSentinel24")}
        return _http_status("GET", f"{WAZUH_DASHBOARD_URL}/wazuh/api/status", headers=headers)
    checks.append(_check("Wazuh Dashboard", _wazuh_dashboard, href="/wazuh/"))

    # Wazuh Manager API
    def _wazuh_manager():
        token = _wazuh_manager_token()
        if not token:
            return False, "auth failed"
        headers = {"Authorization": f"Bearer {token}"}
        return _http_status("GET", f"{WAZUH_MANAGER_URL}/", headers=headers)
    checks.append(_check("Wazuh Manager", _wazuh_manager,
                         tooltip="Agent collection endpoint — port 1514/1515/55000"))

    # Wazuh Indexer (OpenSearch)
    def _wazuh_indexer():
        headers = {"Authorization": _basic_auth_header(INDEXER_USER, INDEXER_PASS)}
        return _http_status("GET", f"{INDEXER_URL}/_cluster/health", headers=headers)
    checks.append(_check("Wazuh Indexer", _wazuh_indexer,
                         tooltip="OpenSearch cluster backing wazuh-alerts-*"))

    # Elasticsearch (TheHive's storage)
    checks.append(_check("Elasticsearch", lambda: _http_status(
        "GET", f"{ELASTICSEARCH_URL}/_cluster/health",
    ), tooltip="Internal — TheHive search backend"))

    # Cassandra (TheHive's primary store) — TCP connect probe
    def _cassandra():
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        try:
            s.connect(("cassandra", 9042))
            s.close()
            return True, "tcp:9042 open"
        except Exception as e:
            return False, str(e)
    checks.append(_check("Cassandra", _cassandra,
                         tooltip="Internal — TheHive primary store"))

    return {"services": checks, "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}


@app.route("/api/dashboard/health")
def health_route():
    claims, err, code = require_auth()
    if err:
        return err, code
    return jsonify(system_health())


# ── Agent enrollment info (Console page) ─────────────────────────────────────

_IMDS = "http://169.254.169.254/latest"


@lru_cache(maxsize=1)
def _imds_token():
    """Fetch an IMDSv2 session token; cached for the process lifetime."""
    try:
        req = urllib.request.Request(
            f"{_IMDS}/api/token", method="PUT",
            headers={"X-aws-ec2-metadata-token-ttl-seconds": "21600"},
        )
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.read().decode("utf-8")
    except Exception:
        return None


def _imds_get(path):
    tok = _imds_token()
    if not tok:
        return None
    try:
        req = urllib.request.Request(
            f"{_IMDS}/meta-data/{path}",
            headers={"X-aws-ec2-metadata-token": tok},
        )
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.read().decode("utf-8").strip()
    except Exception:
        return None


def agent_info():
    public_ip = _imds_get("public-ipv4") or os.environ.get("MANAGER_PUBLIC_IP", "")
    public_hostname = _imds_get("public-hostname") or ""
    return {
        "manager_ip":         public_ip,
        "manager_hostname":   public_hostname,
        "agent_event_port":   1514,
        "agent_register_port": 1515,
        "manager_api_port":   55000,
        # The Wazuh authd is configured with "no password required" by default
        # in this deployment; agents register over TCP with their hostname.
        "enrollment_password_required": False,
    }


@app.route("/api/dashboard/agent-info")
def agent_info_route():
    claims, err, code = require_auth()
    if err:
        return err, code
    return jsonify(agent_info())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8090)
