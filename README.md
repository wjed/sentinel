# SentinelNet
Nick's branch
**Cloud-native, B2B-style Security Operations Center (SOC) platform** — university project for simulating real-world SOC workflows: ingesting security data, processing and correlating it, escalating incidents, and exposing an executive dashboard to clients.

---

## Live site

The dashboard is deployed on AWS (S3 + CloudFront):

**https://d1zrndjozdwm01.cloudfront.net**

Backend and other infra stacks are scaffolding only; the website stack is the one that deploys.

---

## What each folder is for

| Folder | What it is | Where to work | How it fits in |
|--------|------------|---------------|----------------|
| **`frontend/`** | React + Vite dashboard UI (black theme). Pages: Dashboard, Incidents, Data, Settings, Login. | Add and edit pages in `frontend/src/pages/`, shared UI in `frontend/src/components/`. | Clients see this. It will call the backend API and show SOC data. |
| **`backend/`** | API and business logic (Python or Node — your choice). No server runs yet. | Put HTTP routes in `backend/api/`, ingestion/correlation/escalation logic in `backend/services/`. | Sits between the frontend and data/infra. Handles auth, incidents, and data pipelines. |
| **`infra/`** | **AWS CDK in Python**: stacks (Network, Identity, Data, Backend, Website) and shared constants/constructs. | Edit stacks in `infra/stacks/`, shared in `infra/shared/`. Run `cdk` from `infra/`. | Defines VPC, IAM, data, compute, and S3+CloudFront (website) in code. Website stack is deployable. |
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

The **frontend** is deployed to CloudFront (see live URL above). You can also run it locally with `npm start` in `frontend/`. Backend is structure-only for now.

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
├── infra/             # AWS CDK (Python) — stacks and shared; website stack deployable
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

1. **Clone and open** — no AWS credentials required to read or run the frontend locally.
2. **Run the frontend locally (optional):**
   ```bash
   cd frontend && npm install && npm start
   ```
   Opens at http://localhost:3000 (black theme, placeholder pages).
3. **Deploy the website (optional):** See [Deploying the website](#deploying-the-website) below. Full step-by-step guide: [infra/DEPLOY.md](infra/DEPLOY.md).

---

## Deploying the website

Developers who want to deploy (or redeploy) the frontend to S3 + CloudFront need:

- **AWS credentials** — Set via environment variables or `aws configure`. Never commit keys to the repo. See [infra/DEPLOY.md](infra/DEPLOY.md).
- **Python CDK** — Infra is AWS CDK in Python; run all `cdk` commands from the `infra/` directory.

**Quick deploy (after first-time bootstrap):**

1. **Set credentials** (same terminal you’ll use for deploy):
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key_id
   export AWS_SECRET_ACCESS_KEY=your_secret_access_key
   export AWS_DEFAULT_REGION=us-east-1
   ```
2. **Build the frontend:**
   ```bash
   cd frontend && npm install && npm run build && cd ..
   ```
3. **Deploy the website stack:**
   ```bash
   cd infra
   pip install -r requirements.txt   # first time or when deps change
   cdk deploy SentinelNet-Website --require-approval never
   ```

**First time only:** run `cdk bootstrap` from `infra/` before the first `cdk deploy`.

After deploy, the **CloudFront URL** is in the terminal output and in **AWS Console → CloudFormation → SentinelNet-Website → Outputs** (e.g. `WebsiteURL`). To redeploy after frontend changes: build again (`npm run build` in `frontend/`), then run `cdk deploy SentinelNet-Website` again from `infra/`.

Full details, troubleshooting, and how to get the URL from the stack: **[infra/DEPLOY.md](infra/DEPLOY.md)**.

---

## For students new to CDK and AWS

- **Infra** holds CDK stacks; each stack is a class that will later define AWS resources. They are intentionally empty.
- **Frontend** and **backend** are separate so UI and API teams can work in parallel.
- When the course allows, deployment will be introduced separately.

---

## License and course

Used for the SentinelNet university project. See your course materials for licensing and submission details.
