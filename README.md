# SentinelNet

**Cloud-native, B2B-style Security Operations Center (SOC) platform** — university project for simulating real-world SOC workflows: ingesting security data, processing and correlating it, escalating incidents, and exposing an executive dashboard to clients.

---

## This repository does not deploy anything yet

- **This is scaffolding only.** No AWS resources are created or deployed.
- There is **no runnable `cdk deploy`**; the infra app is not set up for deployment.
- The project is **safe to open and use without AWS credentials**.

---

## What each folder is for

| Folder | What it is | Where to work | How it fits in |
|--------|------------|---------------|----------------|
| **`frontend/`** | React + Vite dashboard UI (black theme). Pages: Dashboard, Incidents, Data, Settings, Login. | Add and edit pages in `frontend/src/pages/`, shared UI in `frontend/src/components/`. | Clients see this. It will call the backend API and show SOC data. |
| **`backend/`** | API and business logic (Python or Node — your choice). No server runs yet. | Put HTTP routes in `backend/api/`, ingestion/correlation/escalation logic in `backend/services/`. | Sits between the frontend and data/infra. Handles auth, incidents, and data pipelines. |
| **`infra/`** | AWS CDK app: empty stacks (Network, Identity, Data, Backend) and shared constants/constructs. | Edit stacks in `infra/stacks/`, shared stuff in `infra/shared/`. Run from `infra/` only. | Defines (when you’re ready) VPC, IAM, data stores, and compute in code. Not deployed yet. |
| **`docs/`** | Design docs, architecture notes, and how things connect. | Add markdown files and diagrams here. | Single place for “how the system works” and team handoffs. |
| **`expansion/`** | Placeholder for extra modules or experiments that don’t live in frontend/backend/infra yet. | Use when you need a new top-level area (e.g. tooling, scripts). | Keeps the main tree clean while you grow. |

---

## Where to do what

- **UI / dashboard** → `frontend/` (see [frontend/README.md](frontend/README.md)).
- **API and business logic** → `backend/` (see [backend/README.md](backend/README.md)).
- **AWS resources (later)** → `infra/` (see [infra/README.md](infra/README.md)).
- **Documentation** → `docs/` (see [docs/README.md](docs/README.md)).

---

## How it works (high level)

1. **Frontend** — Users open the dashboard, see KPIs and incidents, use Data and Settings. The app talks to the **backend** over HTTP.
2. **Backend** — Receives requests, runs **services** (ingestion, correlation, escalation), and may read/write data that **infra** will eventually provide (S3, queues, DBs).
3. **Infra** — CDK stacks describe (but don’t yet deploy) network, identity, data stores, and compute. When you enable deployment, these become the real AWS footprint.

Right now only the **frontend** runs (`npm start` in `frontend/`); backend and infra are structure-only.

---

## Project structure

```
sentinel-net/
├── frontend/          # SOC dashboard UI (React + Vite, black theme)
│   ├── src/
│   │   ├── pages/     # Dashboard, Incidents, Data, Settings, Login
│   │   └── components/
│   ├── package.json
│   └── README.md
├── backend/           # API and services (scaffolding)
│   ├── api/           # Routes, handlers
│   ├── services/      # Business logic
│   └── README.md
├── infra/             # AWS CDK — stacks and shared (no deploy)
│   ├── app.py
│   ├── stacks/        # Network, Identity, Data, Backend
│   ├── shared/
│   └── README.md
├── docs/              # Documentation
├── expansion/         # Future modules
└── README.md          # This file
```

---

## Getting started

1. **Clone and open** — no AWS credentials required.
2. **Run the frontend (optional):**
   ```bash
   cd frontend && npm install && npm start
   ```
   Opens at http://localhost:3000 (black theme, placeholder pages).
3. **Infra (optional, read-only):** From `infra/`, run `pip install -r requirements.txt` for IDE support. Do not run `cdk deploy`.

---

## For students new to CDK and AWS

- **Infra** holds CDK stacks; each stack is a class that will later define AWS resources. They are intentionally empty.
- **Frontend** and **backend** are separate so UI and API teams can work in parallel.
- When the course allows, deployment will be introduced separately.

---

## License and course

Used for the SentinelNet university project. See your course materials for licensing and submission details.

## Hey, it's Andrew!