# SentinelNet Dashboard Specification

> **For:** the team member wiring up Wazuh, TheHive, and Grafana  
> **Purpose:** Every panel in the UI is documented here with its required data, the API endpoint that should back it, and an example payload. Replace mock data with live calls once services are running.

---

## Table of Contents

1. [Dashboard — SOC Overview](#1-dashboard--soc-overview)
2. [Alerts — Wazuh Alert Feed](#2-alerts--wazuh-alert-feed)
3. [Incidents — TheHive Cases](#3-incidents--thehive-cases)
4. [Assets — Wazuh Agents](#4-assets--wazuh-agents)
5. [System Health](#5-system-health)
6. [Notes for Grafana embedding](#6-notes-for-grafana-embedding)

---

## 1. Dashboard — SOC Overview

### 1.1 Wazuh KPI Cards

| Panel | Field | Notes |
|---|---|---|
| Total Alerts (24h) | `total` | Count of all alerts in last 86400s |
| Critical | `by_severity.critical` | Wazuh level ≥ 12 |
| High | `by_severity.high` | Wazuh level 7–11 |
| Active Agents | `agents.active` | Agents with `status=active` |

**Endpoint:** `GET /api/dashboard/wazuh/summary`

**Expected response:**
```json
{
  "window": "24h",
  "total": 1847,
  "by_severity": {
    "critical": 12,
    "high": 89,
    "medium": 423,
    "low": 1323
  },
  "agents": {
    "total": 16,
    "active": 14,
    "disconnected": 2
  }
}
```

**How to get it from Wazuh:**  
Query the Wazuh Indexer (OpenSearch) on the `wazuh-alerts-*` index:
```json
POST /wazuh-alerts-*/_search
{
  "query": { "range": { "timestamp": { "gte": "now-24h" } } },
  "aggs": {
    "by_level": {
      "range": {
        "field": "rule.level",
        "ranges": [
          { "key": "low",      "to": 3 },
          { "key": "medium",   "from": 3,  "to": 7  },
          { "key": "high",     "from": 7,  "to": 12 },
          { "key": "critical", "from": 12 }
        ]
      }
    }
  },
  "size": 0
}
```

---

### 1.2 Alert Severity Distribution (Donut chart)

Same data as 1.1 `by_severity` — no extra endpoint needed.

---

### 1.3 Top 5 Triggered Rules

**Endpoint:** `GET /api/dashboard/wazuh/top-rules?window=24h&limit=5`

**Expected response:**
```json
{
  "rules": [
    { "id": "5710",  "description": "SSH brute force: multiple authentication failures", "count": 312 },
    { "id": "5503",  "description": "SSH login success from unknown IP address",          "count": 127 },
    { "id": "80792", "description": "sudo: command execution by non-root user",           "count":  94 },
    { "id": "554",   "description": "File modified in /etc directory",                    "count":  67 },
    { "id": "530",   "description": "Attempt to login using a non-existent user",         "count":  45 }
  ]
}
```

**How to get it from Wazuh (OpenSearch `terms` agg):**
```json
POST /wazuh-alerts-*/_search
{
  "query": { "range": { "timestamp": { "gte": "now-24h" } } },
  "aggs": {
    "top_rules": {
      "terms": { "field": "rule.id", "size": 5, "order": { "_count": "desc" } },
      "aggs": { "description": { "terms": { "field": "rule.description", "size": 1 } } }
    }
  },
  "size": 0
}
```

---

### 1.4 TheHive KPI Cards

| Panel | Field |
|---|---|
| Open Cases | count of cases with `status=Open` |
| In Progress | count of cases with `status=InProgress` |
| Resolved (30d) | count closed in last 30 days |
| Avg MTTR | mean of `(closeDate - createdAt)` for resolved cases |

**Endpoint:** `GET /api/dashboard/thehive/summary`

**Expected response:**
```json
{
  "open": 7,
  "in_progress": 4,
  "resolved_30d": 23,
  "avg_mttr_seconds": 15720,
  "avg_mttr_human": "4h 22m"
}
```

**How to get it from TheHive:**
```
GET https://<thehive>:9000/api/case?status=Open&range=all   → count
GET https://<thehive>:9000/api/case?status=InProgress&range=all
GET https://<thehive>:9000/api/case?status=Resolved&range=0-100
  Filter by _createdAt >= now - 30d, compute avg closeDate-createdAt
```

TheHive API auth: `Authorization: Bearer <api_key>` header.

---

### 1.5 Cases by Status (Donut)

Same data as 1.4 — no extra endpoint.

---

### 1.6 Active Cases Table

**Endpoint:** `GET /api/dashboard/thehive/active-cases?limit=10`

**Expected response:**
```json
{
  "cases": [
    {
      "id": "CS-2024-047",
      "title": "SSH Brute-Force Campaign — prod-web-01",
      "severity": "High",
      "status": "InProgress",
      "assignee": "n.reed",
      "createdAt": "2024-04-08T14:52:00Z",
      "updatedAt": "2024-04-08T15:30:00Z"
    }
  ]
}
```

---

## 2. Alerts — Wazuh Alert Feed

### 2.1 Alert Volume Chart (24h histogram)

**Endpoint:** `GET /api/alerts/volume?window=24h&interval=1h`

**Expected response:**
```json
{
  "interval": "1h",
  "buckets": [
    { "hour": 0,  "count": 18 },
    { "hour": 1,  "count": 12 },
    ...
    { "hour": 23, "count": 31 }
  ]
}
```

**OpenSearch query:**
```json
POST /wazuh-alerts-*/_search
{
  "query": { "range": { "timestamp": { "gte": "now-24h" } } },
  "aggs": {
    "by_hour": {
      "date_histogram": {
        "field": "timestamp",
        "calendar_interval": "hour",
        "min_doc_count": 0,
        "extended_bounds": { "min": "now-24h", "max": "now" }
      }
    }
  },
  "size": 0
}
```

---

### 2.2 Alert List

**Endpoint:** `GET /api/alerts?severity=high&agent=prod-web-01&rule_id=5710&from=2024-04-08T00:00:00Z&size=100`

**Query params:**
| Param | Type | Description |
|---|---|---|
| `severity` | string | `critical`, `high`, `medium`, `low` |
| `agent` | string | agent name (exact match) |
| `rule_id` | string | partial match on rule.id |
| `from` | ISO timestamp | start of window |
| `to` | ISO timestamp | end of window (default: now) |
| `size` | int | max results (default 100) |

**Single alert shape (Wazuh native):**
```json
{
  "sk": "alert-001",
  "timestamp": "2024-04-08T14:52:11.000Z",
  "agent": {
    "id": "003",
    "name": "prod-web-01",
    "ip": "10.0.2.11"
  },
  "rule": {
    "id": "5710",
    "description": "SSH brute force: multiple authentication failures",
    "level": 10,
    "groups": ["authentication_failures", "ssh"]
  },
  "data": {
    "srcip": "185.220.101.47",
    "dstport": "22"
  },
  "full_log": "Apr  8 14:52:11 prod-web-01 sshd[12345]: Failed password for root from 185.220.101.47 port 51234 ssh2"
}
```

The Lambda `telemetry_api` currently writes this shape to DynamoDB — match it exactly or add a transform layer.

---

## 3. Incidents — TheHive Cases

### 3.1 Case Summary Cards

Same as 1.4 (`/api/dashboard/thehive/summary`).

---

### 3.2 Case List

**Endpoint:** `GET /api/incidents?status=Open&severity=High&assignee=n.reed&from=2024-04-01&size=50`

**Query params:**
| Param | Type | Description |
|---|---|---|
| `status` | string | `Open`, `InProgress`, `Resolved` |
| `severity` | string | `Critical`, `High`, `Medium`, `Low` |
| `assignee` | string | TheHive username |
| `from` | date | created after date |
| `size` | int | page size |

**Single case shape:**
```json
{
  "id": "CS-2024-047",
  "thehive_id": "~12345",
  "title": "SSH Brute-Force Campaign — prod-web-01",
  "severity": "High",
  "status": "InProgress",
  "assignee": "n.reed",
  "tags": ["ssh", "brute-force"],
  "createdAt": "2024-04-08T14:52:00Z",
  "updatedAt": "2024-04-08T15:30:00Z",
  "closeDate": null
}
```

**Mapping from TheHive v5 API:**  
`GET /api/case` returns `_id`, `title`, `severity` (1=Low, 2=Medium, 3=High, 4=Critical), `status`, `owner`, `tags`, `_createdAt`, `_updatedAt`.  
Map `severity` integer → label in the Lambda handler.

---

## 4. Assets — Wazuh Agents

### 4.1 Agent Summary Cards

**Endpoint:** `GET /api/assets/summary`

**Expected response:**
```json
{
  "total": 16,
  "active": 14,
  "disconnected": 2,
  "never_connected": 1
}
```

---

### 4.2 Agent List

**Endpoint:** `GET /api/assets?status=active&os=Ubuntu&group=web`

**Query params:**
| Param | Type | Description |
|---|---|---|
| `status` | string | `active`, `disconnected`, `never_connected` |
| `os` | string | partial match on OS string |
| `group` | string | Wazuh agent group name |
| `q` | string | search name or IP |

**Single agent shape (Wazuh Manager API `/agents` normalized):**
```json
{
  "id": "003",
  "name": "prod-web-01",
  "ip": "10.0.2.11",
  "os": {
    "name": "Ubuntu",
    "version": "22.04",
    "platform": "ubuntu",
    "full": "Ubuntu 22.04"
  },
  "version": "Wazuh v4.7.2",
  "status": "active",
  "lastKeepAlive": "2024-04-08T15:31:58Z",
  "groups": ["linux", "web"]
}
```

**How to get it from Wazuh Manager:**
```
GET https://<wazuh-manager>:55000/agents?status=active&limit=500
Authorization: Bearer <jwt>
```

Get a JWT first:
```
POST https://<wazuh-manager>:55000/security/user/authenticate
Authorization: Basic <base64(user:pass)>
```

Cache the agent list in DynamoDB or Redis, refreshed every 60s by a Lambda, so the frontend doesn't hit the Manager directly.

---

## 5. System Health

### 5.1 Service Status

**Endpoint:** `GET /api/health`  
Called by frontend every 30s.

**Expected response:**
```json
{
  "services": [
    { "name": "Wazuh Manager",  "status": "up",   "latency_ms": 12,  "checked_at": "2024-04-08T15:32:00Z" },
    { "name": "TheHive",        "status": "up",   "latency_ms": 28,  "checked_at": "2024-04-08T15:32:00Z" },
    { "name": "Grafana",        "status": "up",   "latency_ms": 9,   "checked_at": "2024-04-08T15:32:00Z" },
    { "name": "Lambda Ingest",  "status": "up",   "latency_ms": null,"checked_at": "2024-04-08T15:32:00Z" },
    { "name": "DynamoDB",       "status": "up",   "latency_ms": 4,   "checked_at": "2024-04-08T15:32:00Z" }
  ]
}
```

**Implementation:** A CloudWatch EventBridge rule on a 1-minute schedule triggers a `health_check` Lambda that:
1. Sends an HTTP GET to each service's health endpoint
2. Measures response time
3. Writes `{ status, latency_ms, checked_at }` to a DynamoDB `service_health` table (TTL = 5 min)
4. The `/api/health` Lambda reads from that table and returns the latest row per service

---

## 6. Notes for Grafana Embedding

The "Attack Origin Map" panel on Dashboard is a placeholder for a Grafana panel. To embed it:

1. Create a Grafana dashboard with a **Geomap** panel pointed at the DynamoDB/InfluxDB honeypot data source
2. Enable **anonymous access** for the embedded panel (Grafana → Configuration → Anonymous Auth) or use a service account token
3. Generate a **share URL** with `&kiosk` mode: `https://grafana.internal/d/<uid>/panel?orgId=1&panelId=<id>&kiosk`
4. Replace the SVG placeholder in `Dashboard.jsx` with:
   ```jsx
   <iframe
     src="https://grafana.internal/d/abc123/panel?orgId=1&panelId=3&kiosk"
     style={{ width: '100%', height: '100%', border: 'none' }}
     title="Attack Origin Map"
   />
   ```
5. Set `Content-Security-Policy: frame-src https://grafana.internal` in the CloudFront response headers policy

---

*Last updated: 2024-04-08 · maintained by the SentinelNet infra team*
