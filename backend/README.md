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
# Wazuh Alert Queue Ingestion (MVP)

BackendStack provisions an ingestion path:

`Wazuh Manager -> SQS (sentinel-wazuh-alerts) -> Lambda (sentinel-wazuh-ingest) -> DynamoDB (sentinel-telemetry)`

The Wazuh EC2 instance role is granted `sqs:SendMessage` to the alerts queue.

Example producer command from the Wazuh host (or any principal with queue access):

```bash
aws sqs send-message \
  --queue-url "$WAZUH_ALERTS_QUEUE_URL" \
  --message-body '{"agent":{"id":"001"},"timestamp":"2026-03-01T18:00:00Z","severity":7,"eventType":"wazuh.alert","rule":{"description":"test alert"}}'
```

Message requirements:
- Body must be a JSON object string.
- One event per SQS message.
- If `timestamp` is missing/invalid, Lambda uses current UTC time.
- If ID fields are missing, Lambda falls back to `unknown-source`.
