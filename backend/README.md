# SentinelNet — Backend

API and services for the SOC platform. **Scaffolding only** — no running server yet. This is where HTTP endpoints and business logic will live.

---

## What this folder is for

- **API layer:** HTTP routes, request/response handling, and (later) auth.
- **Services layer:** Business logic: ingesting security data, correlating events, escalating incidents.
- **Where to work:** Add routes and handlers in `api/`, add ingestion/correlation/escalation logic in `services/`. The frontend will call this backend over HTTP.

---

## How it fits in the system

1. **Frontend** sends requests to the backend (e.g. “list incidents”, “get dashboard KPIs”).
2. **Backend** receives them in `api/`, calls into `services/` for logic, then returns JSON (or similar).
3. **Infra** (when deployed) will provide data stores and queues that the backend uses; for now you can mock or use local storage.

---

## Structure

| Path | Purpose |
|------|--------|
| **`api/`** | HTTP surface: routes, handlers, request/response models. See [api/README.md](api/README.md). |
| **`services/`** | Core logic: ingestion, correlation, escalation. See [services/README.md](services/README.md). |

You can add a top-level `main.py` or `app.py` (or Node `index.js`) later to start the server and mount the API.

---

## Where to do what

- **New endpoint** (e.g. `GET /incidents`) → Add a handler in `api/` and wire it to a route.
- **New business rule** (e.g. “when severity > X, escalate”) → Implement in `services/` and call it from the API.
- **Auth** (e.g. validate JWT or session) → Handle in `api/` middleware or a shared auth module used by routes.

Language and framework (Python/Flask, Python/FastAPI, Node/Express, etc.) are up to your team; keep API and services separated so multiple people can work in parallel.

---

## Wazuh Alert Queue Ingestion (MVP)

BackendStack provisions:

`Wazuh Manager -> SQS (wazuh-alerts-queue) -> Lambda (wazuh-ingest-handler) -> DynamoDB (sentinel-telemetry)`

Message requirements:
- Body must be one JSON object string per SQS message.
- Stored fields: `agentId`, `id`, `timestamp`, `severity`, `eventType`, `raw`, `expiresAt`.
- `agent` must be an object and include `agent.id` or `agent.name`.
- `timestamp` or `@timestamp` must be present and parse as a valid UTC-normalizable time.
- `rule` must be an object and `rule.level` must be numeric.
- `eventType` is always `wazuh_alert`.
- Invalid JSON or structurally invalid alerts fail only that record (`batchItemFailures`) so SQS retries and eventually sends to DLQ.

### Local offline test

Run from repo root:

```bash
PYTHONDONTWRITEBYTECODE=1 python -m unittest backend/lambda/wazuh_ingest/test_local.py
```

What it verifies:
- Valid Wazuh-like message is normalized and batched for DynamoDB.
- Invalid JSON returns a per-record failure and does not block valid records.

### Integration test after deploy

1. Fetch stack outputs and export shell vars:

```bash
aws cloudformation describe-stacks \
  --stack-name SentinelNet-Backend \
  --query "Stacks[0].Outputs[].[OutputKey,OutputValue]" \
  --output table
```

```bash
export WAZUH_ALERTS_QUEUE_URL="$(aws cloudformation describe-stacks --stack-name SentinelNet-Backend --query \"Stacks[0].Outputs[?OutputKey=='WazuhAlertsQueueUrl'].OutputValue\" --output text)"
export TELEMETRY_TABLE_NAME="$(aws cloudformation describe-stacks --stack-name SentinelNet-Backend --query \"Stacks[0].Outputs[?OutputKey=='TelemetryTableName'].OutputValue\" --output text)"
export WAZUH_INGEST_LAMBDA_NAME="$(aws cloudformation describe-stacks --stack-name SentinelNet-Backend --query \"Stacks[0].Outputs[?OutputKey=='WazuhIngestLambdaName'].OutputValue\" --output text)"
```

2. Send sample Wazuh alert JSON to SQS:

```bash
aws sqs send-message \
  --queue-url "$WAZUH_ALERTS_QUEUE_URL" \
  --message-body '{"timestamp":"2026-03-02T18:30:00Z","agent":{"id":"001","name":"endpoint-001"},"manager":{"name":"wazuh-manager"},"rule":{"id":"5710","level":10,"description":"SSH brute force attempt"},"full_log":"Failed password for invalid user admin from 1.2.3.4 port 4242 ssh2"}'
```

3. Verify Lambda processed it (logs contain `id` and `timestamp`):

```bash
aws logs tail "/aws/lambda/$WAZUH_INGEST_LAMBDA_NAME" --since 10m --follow
```

Expected log line includes:
- `Prepared Wazuh alert id=001 timestamp=2026-03-02T18:30:00Z severity=10`

4. Verify item exists in DynamoDB:

```bash
aws dynamodb get-item \
  --table-name "$TELEMETRY_TABLE_NAME" \
  --key '{"agentId":{"S":"001"},"timestamp":{"S":"2026-03-02T18:30:00Z"}}' \
  --consistent-read
```

Expected outcome:
- `Item` is returned with `agentId` = `001`, `id` = `001`, `eventType` = `wazuh_alert`, `severity` = `10`, and `raw` containing the full original message body.
