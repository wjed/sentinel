# SentinelNet — Infrastructure (AWS CDK, Python)

AWS CDK app written in **Python**: stacks for Website, UserData, and Network. All CDK code is in Python (`.py`); run with `python app.py` / `cdk` from this directory.

---

## What this folder is for

- **Stacks:** **Website** (S3 + CloudFront + Cognito + profile API), **UserData** (DynamoDB + S3), **Network** (VPC). Edit stack files in `stacks/`. Run all CDK commands **from this directory** (`infra/`).

---

## Deploying the website

**Live site:** https://d1zrndjozdwm01.cloudfront.net

**Teammates deploying?** Use **[HOW-TO-DEPLOY.md](HOW-TO-DEPLOY.md)** — step-by-step, no assumptions.

The **SentinelNet-Website** stack hosts the React app on S3 and CloudFront. See **[DEPLOY.md](DEPLOY.md)** for:

- Setting AWS credentials (never commit them)
- Building the frontend (`npm run build` in `frontend/`)
- First-time bootstrap and `cdk deploy SentinelNet-Website`
- Stack outputs (WebsiteURL, DistributionDomainName) and how to get the URL after deploy

---

## How it works

1. **`app.py`** — Creates all stacks. Uses default account/region from your AWS credentials (env or profile).
2. **`cdk.json`** — Tells CDK to run `python app.py`.
3. **`stacks/`** — One file per stack. **`website_stack.py`** (S3 + CloudFront + Cognito), **`user_data_stack.py`** (DynamoDB + S3), **`network_stack.py`** (VPC).

---

## Structure

| Path | Purpose |
|------|--------|
| **`app.py`** | App entry; instantiates all stacks. |
| **`cdk.json`** | CDK config. |
| **`requirements.txt`** | Python deps for CDK. |
| **`stacks/`** | **Website**, **UserData**, **Network**. |
| **`DEPLOY.md`** | Step-by-step deploy instructions. |
