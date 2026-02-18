# SentinelNet Backend Architecture Proposal

# SentinelNet Backend Architecture Proposal (Managed SOC Platform)

This README documents the backend service architecture and deployment plan required to make **SentinelNet** operationally successful as a managed SOC platform.

It covers:
- Required services by phase (MVP vs Scale-Up vs Service Extras)
- AWS services required to support them
- Integration flow between tools
- Event escalation logic (Wazuh → Enrichment → TheHive → Client Notification)
- Proposed AWS deployment topology and operational considerations

---

## 1) Objective

SentinelNet’s backend is designed to:
- Ingest telemetry and detections (Wazuh, honeypots, scanners)
- Normalize alerts into a single canonical event format
- Reduce noise with deduplication + suppression + correlation
- Enrich alerts automatically (Cortex analyzers)
- Create and manage incidents (TheHive)
- Notify clients with clean, predictable escalation logic
- Provide executive metrics dashboards (Grafana) from curated rollups

Success criteria:
- No dropped alerts during spikes
- No duplicate cases on retries
- Minimal client spam (dedupe + throttling)
- Clear audit trail and traceability from detection → case → notification

---

## 2) Core Architecture Overview

### High-level pipeline
1. **Wazuh emits alerts** (and optionally Cowrie/OpenVAS emit findings)
2. Alerts are **ingested** into a message backbone
3. Pipeline stages perform:
   - normalize + client tagging
   - dedupe + correlation + suppression
   - enrichment (Cortex)
   - TheHive synchronization (alert/case)
   - client notifications (email/webhook/portal)
4. Metrics are rolled up for Grafana dashboards

Key architectural choice:
- Use an **event-driven pipeline with SQS buffering** so alert storms do not overload downstream tooling.

---

## 3) Required Services by Phase

### 3.1 MVP (Minimum Viable Platform)
These components are required for a functional managed SOC offering.

#### SOC Tools
- **Wazuh (SIEM/EDR)**
  - Role: ingestion + detection/alerting
  - Deployment: EC2 (pragmatic MVP choice)
- **TheHive (Incident Management)**
  - Role: alert triage, case workflow, analyst tasks, ownership, SLA management
  - Deployment: ECS/Fargate
- **Cortex (Enrichment / Responders)**
  - Role: enrich alerts with context (WHOIS, GeoIP, reputation, hash lookups)
  - Deployment: ECS/Fargate
- **Grafana (Dashboards)**
  - Role: executive/client dashboards from curated rollups
  - Deployment: ECS/Fargate or managed Grafana

#### Platform Backbone (non-negotiable)
- **SQS + DLQs**: stage-by-stage buffering + retries
- **Lambda**: pipeline compute for each stage
- **DynamoDB**: dedupe state + client routing configuration
- **S3**: raw logs + evidence/artifacts
- **IAM + KMS + Secrets Manager**: least privilege + encryption + secret storage
- **CloudWatch + CloudTrail**: monitoring and audit

#### Optional in MVP
- **Cowrie honeypot** (ECS/Fargate): high-signal telemetry + demo value

---

### 3.2 Scale-Up (Reliability + Workload Reduction + Coverage)
- **Shuffle (SOAR)** (ECS/Fargate)
  - Run playbooks for repeatable triage + comms (high ROI after dedupe is stable)
- **OpenVAS** (ECS/Fargate)
  - Scheduled vulnerability scans → findings can create TheHive alerts/cases
- **RDS Postgres (optional)**
  - Client/org model, RBAC, asset inventory, SLAs/billing, complex querying
- **Multi-tenant hardening**
  - Stronger isolation of client data paths and IAM boundaries

---

### 3.3 Service Extras (Differentiators)
- Threat intel ingestion (MISP/feeds) → enrichment pipeline
- Client portal (read-only + incident communication)
- Advanced correlation/anomaly detection stream (“insights”)
- Automated containment responders (only with approval guardrails)

---

## 4) AWS Services Required (MVP)

### 4.1 Compute / Hosting
- **EC2**: Wazuh Manager + Indexer + Dashboard
- **ECS Fargate**: TheHive, Cortex, Grafana (and later Cowrie/OpenVAS/Shuffle)
- **Lambda**: event pipeline stages + notification + metrics rollups

### 4.2 Messaging / Event Backbone
- **SQS queues** (each with a DLQ):
  - `normalize_queue`
  - `dedupe_queue`
  - `enrich_queue`
  - `case_queue`
  - `notify_queue`
- **EventBridge (recommended)**:
  - Central routing by `client_id`, `event_type`, `severity`, `source`

### 4.3 Storage / State
- **DynamoDB**
  - `AlertState`: dedupe + correlation state, linked TheHive IDs
  - `ClientConfig`: per-client thresholds, suppression rules, notification routing
  - `NotificationState`: throttling keys to prevent spam
- **S3**
  - `raw-logs/` (archive)
  - `evidence/` (artifacts per case)

### 4.4 Security / Secrets / Observability
- **IAM**: least privilege roles per Lambda and ECS task
- **KMS**: encrypt SQS/S3/Dynamo/Secrets
- **Secrets Manager**: API keys + webhook secrets
- **CloudWatch**: logs, metrics, alarms
- **CloudTrail**: audit trails

---

## 5) Tool Integration Flow

### 5.1 Wazuh → Pipeline
Wazuh emits alerts (JSON). SentinelNet ingests these via:
- API Gateway + Lambda ingestion endpoint (preferred), or
- log forwarding to CloudWatch + subscription filter to Lambda

The ingest function pushes events into the pipeline backbone (EventBridge and/or SQS).

### 5.2 Pipeline → Cortex
Enrichment stage calls Cortex analyzers for eligible events:
- Fast analyzers first (reputation/GeoIP)
- Deeper analyzers only for higher severity or correlated events

Enrichment results are stored:
- inline in DynamoDB (small summaries)
- full analyzer outputs in S3 (if large)

### 5.3 Pipeline → TheHive
Case stage creates or updates TheHive objects:
- create TheHive **Alert** for SEV2+ (or thresholded SEV3)
- promote/create **Case** for SEV1 or correlated/high-confidence alerts
- store TheHive IDs back in DynamoDB for idempotency

### 5.4 TheHive → Client Notification
Notification stage sends:
- email (SES), webhook, or portal event (future)
- throttled per client and per fingerprint to avoid spam

### 5.5 Metrics → Grafana
Grafana reads curated KPI rollups:
- alert volume by severity
- MTTA/MTTR (once analyst workflow exists)
- top event types / top IOCs
- client-level summary

Avoid pointing Grafana directly at raw SIEM indices for exec reporting.

---

## 6) SentinelNet Event Schema (Canonical)

All sources are normalized to a common schema (`SentinelNet Event v1`).

Minimum required fields:
- `version`
- `client_id`
- `source` (wazuh/cowrie/openvas/etc.)
- `event_type` (taxonomy)
- `severity` (1=critical … 4=info) or similar
- `timestamp`
- `host` (name/ip) and `principal` (user) when applicable
- `observables` (ip/domain/hash)
- `raw` (trimmed original payload)

Example:
```json
{
  "version": "1.0",
  "client_id": "acme-co",
  "source": "wazuh",
  "event_type": "auth.bruteforce",
  "severity": 2,
  "timestamp": "2026-02-14T19:22:11Z",
  "host": { "name": "srv-1", "ip": "10.0.2.10" },
  "principal": { "user": "admin" },
  "observables": { "ip": "1.2.3.4", "domain": null, "hash": null },
  "raw": { "wazuh_rule_id": "5715" }
}
