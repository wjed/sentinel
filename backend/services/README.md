# Backend services (`services/`)

**What this folder is for:** Business logic that the API calls — ingestion, correlation, escalation, and any other core SOC workflows.

---

## Purpose

- **Ingestion:** Accept or pull security data (logs, events), normalize and store (or forward to queues/storage that infra will provide).
- **Correlation:** Combine events into incidents, dedupe, assign severity.
- **Escalation:** Apply rules (e.g. “if severity = critical, notify and create ticket”) and update incident state.

---

## Where to do what

- **New ingestion pipeline** → Add a module or function here that receives or fetches data, validates it, and passes it to the next step (e.g. queue or DB). The API can trigger it or it can run on a schedule.
- **Correlation rules** → Implement logic that groups events into incidents and sets severity. Call this from the API or from a job that processes ingested data.
- **Escalation rules** → Implement logic that reacts to incident state (e.g. “escalate to L2”, “send alert”). Can be called from the API when an analyst escalates, or automatically by a background process.

Keep this folder **independent of HTTP**: no request/response objects here, just functions that take plain data and return results. The `api/` layer will call these and map results to HTTP responses.
