# SentinelNet — Infrastructure (AWS CDK, Python)

AWS CDK app written in **Python**: stacks and shared constructs. The **website stack** (S3 + CloudFront) is deployable; the rest are placeholders. All CDK code is in Python (`.py`); run with `python app.py` / `cdk` from this directory.

---

## What this folder is for

- **Stacks:** Network, Identity, Data, Backend (placeholders), plus **Website** (S3 + CloudFront for the frontend).
- **Shared:** Constants and reusable constructs.
- **Where to work:** Edit stack files in `stacks/`, shared code in `shared/`. Run all CDK commands **from this directory** (`infra/`).

---

## Deploying the website

**Live site:** https://d1zrndjozdwm01.cloudfront.net

The **SentinelNet-Website** stack hosts the React app on S3 and CloudFront. See **[DEPLOY.md](DEPLOY.md)** for:

- Setting AWS credentials (never commit them)
- Building the frontend (`npm run build` in `frontend/`)
- First-time bootstrap and `cdk deploy SentinelNet-Website`
- Stack outputs (WebsiteURL, DistributionDomainName) and how to get the URL after deploy

---

## How it works

1. **`app.py`** — Creates all stacks. Uses default account/region from your AWS credentials (env or profile).
2. **`cdk.json`** — Tells CDK to run `python app.py`.
3. **`stacks/`** — One file per stack. **`website_stack.py`** defines S3 bucket + CloudFront + deployment of `frontend/dist`.
4. **`shared/`** — Constants and constructs.

---

## Structure

| Path | Purpose |
|------|--------|
| **`app.py`** | App entry; instantiates all stacks. |
| **`cdk.json`** | CDK config. |
| **`requirements.txt`** | Python deps for CDK. |
| **`stacks/`** | Network, Identity, Data, Backend (empty), **Website** (S3 + CloudFront). |
| **`shared/`** | Constants and constructs. |
| **`DEPLOY.md`** | Step-by-step deploy instructions. |
