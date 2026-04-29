# SentinelNet

A security operations platform: marketing pages (Home, Product, Pricing) + a dashboard with a **real-time SOC backend** (Wazuh, TheHive, Grafana). It runs on AWS (S3, CloudFront, EC2, Lambda). JMU university project.

---

## What’s in this repo

| Folder | What it is |
|--------|------------|
| **frontend/** | The website. React app. You edit code here. |
| **infra/** | AWS deployment (Terraform). One command deploys the site and SOC. |
| **backend/lambda/** | Lambdas for the profile API, telemetry alerts API, admin access terminal API, and the SQS → S3 alert ingester. |
| **backend/dashboard_api/** | Flask container that runs on the SOC EC2. Queries Wazuh (indexer + manager), TheHive, Grafana, Elasticsearch, and Cassandra and powers the live dashboard at `/api/dashboard/*`. |

That’s it. **SentinelNet** includes a full backend SOC running on a cost-optimized EC2 instance, with a dedicated SQS/Lambda alert ingestion pipeline.

**Live site:** [https://sentinelnetsolutions.com/](https://sentinelnetsolutions.com/) (Route 53). Sign-in and the dashboard work there.

---

## Team workflow (Git & deploy)

- **Push only to your branch.** Do not push directly to `main`. Create a branch, push your branch, then open a **pull request (PR)** to get your changes into `main`.
- **How to make a PR:** Create a branch (`git checkout -b your-name/feature-name`), commit and push it, then on GitHub open a PR from your branch into `main`. **Your entire team must review your PR before it is merged.** Do not merge the PR yourself — all approvals and merges go through **Will**. Will will move the PR in after the team has reviewed and approved. Do not merge `main` into your branch and then push; keep `main` as the source of truth and merge your branch into `main` via the PR.
- **Never merge or push to `main` directly.** All changes to `main` should go through a PR, with full team review and approval from Will.
- **Do not run `terraform apply` without approval.** Deploying changes the live site and AWS resources. Get approval from whoever owns deployment before you run the deploy steps below.

---

## Run the site on your computer

From the **repo root** (the folder that contains `frontend` and `infra`):

```bash
cd frontend
npm install
npm run build
npm run dev
```

Open **http://localhost:3000** in your browser. You’ll see the site. Sign-in will redirect to Cognito (only works after you deploy, or with Cognito set up).

---

## Deploying to AWS (Terraform)

**Do not run `terraform apply` without approval.** Deploying updates the live site and AWS; get approval first (see “Team workflow” above).

We deploy with Terraform from `infra/terraform/`. If you’ve been approved to deploy and have never done it before, follow every step in order.

You need: **Terraform >= 1.5**, **AWS CLI >= 2**, **Node.js >= 18**, and **AWS credentials**.

---

### First time only (once per computer)

```bash
cd infra/terraform
terraform init
```

---

### Every time you deploy

**Step 1 — Log in to AWS**

Mac / Linux / Git Bash:

```bash
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
export AWS_DEFAULT_REGION=us-east-1
```

Windows PowerShell:

```powershell
$env:AWS_ACCESS_KEY_ID=”YOUR_ACCESS_KEY”
$env:AWS_SECRET_ACCESS_KEY=”YOUR_SECRET_KEY”
$env:AWS_DEFAULT_REGION=”us-east-1”
```

(Or run `aws configure` once and use that profile.)

**Step 2 — Build the frontend**

```bash
cd frontend
npm install
npm run build
cd ..
```

**Step 3 — Deploy**

One-shot (builds frontend + applies everything):

```bash
cd infra/terraform
./scripts/deploy-dev-cloudfront.sh
```

Or step by step:

```bash
cd infra/terraform
terraform apply -var-file=envs/dev.tfvars
```

When apply finishes, Terraform prints `website_url`. That’s the live site. Cognito is configured automatically and pointed at that URL.

---

### Deploy checklist

- [ ] AWS credentials set (Step 1) or already configured
- [ ] `cd frontend` → `npm install` → `npm run build` → `cd ..`
- [ ] First time only: `cd infra/terraform` → `terraform init`
- [ ] `cd infra/terraform` → `terraform apply -var-file=envs/dev.tfvars`
- [ ] Copy `website_url` from the output

---

### 🌐 Live Dashboard Access (POC Default)

| Tool | Access URL | Authentication |
| :--- | :--- | :--- |
| **Analyst Portal** | [https://sentinelnetsolutions.com](https://sentinelnetsolutions.com) | Cognito SSO |
| **Console** *(admin + analyst only)* | `https://sentinelnetsolutions.com/console` | Inherits the analyst portal session — has the service links below + agent enrollment snippets |
| **TheHive 5** | `https://sentinelnetsolutions.com/thehive/` | Cognito SSO (fallback: `admin@thehive.local` / `secret`) |
| **Grafana** | `https://sentinelnetsolutions.com/grafana/` | Cognito SSO only — local login form is disabled |
| **Wazuh Dashboard** | `https://sentinelnetsolutions.com/wazuh/` | Cognito SSO only — auto-redirects via OpenSearch security plugin OIDC |
| **Wazuh Agent endpoints** | Manager public IP, ports **1514** (events), **1515** (registration), **55000** (REST API) | Open enrollment (no password) |

> Always use the **"Sign in with SentinelNet"** button on TheHive — that's the Cognito flow. Wazuh and Grafana redirect to Cognito automatically. Get the agent enrollment commands from the Console tab.

---

### When something breaks

- **”security token invalid” / “credentials could not be used”** → Re-export AWS credentials (Step 1).
- **”No such file or directory: frontend/dist”** → Run `npm run build` in `frontend/` before deploying.
- **”terraform: command not found”** → Install Terraform from https://developer.hashicorp.com/terraform/install.
- **Cognito “redirect_uri_mismatch”** → In cloudfront_only mode, set `site_url_override` in tfvars to the CloudFront URL from `terraform output website_url` and re-apply.
- **CloudFront serving stale content** → Run `aws cloudfront create-invalidation --distribution-id $(cd infra/terraform && terraform output -raw cloudfront_distribution_id) --paths “/*”`.

More detail: **infra/HOW-TO-DEPLOY.md** and **infra/terraform/README.md**.

---

## Access Management Terminal

SentinelNet now includes an admin-only **Access Management Terminal** at `/admin/access`.

- It is a terminal-style UI, but it is **not** a real shell and does **not** execute OS commands.
- It translates a small approved command set into structured API requests backed by Cognito admin APIs.
- Cognito groups remain the source of truth for access:
  - `SentinelNetAdmins`
  - `SentinelNetAnalysts`
  - `SentinelNetViewers`
- Only users in `SentinelNetAdmins` can access the page or call the admin access API.

Supported commands:

- `help`
- `list-users`
- `get-user <email-or-username>`
- `grant-access <email-or-username> <Admins|Analysts|Viewers>`
- `revoke-access <email-or-username> <Admins|Analysts|Viewers>`
- `list-groups`
- `whoami`
- `clear`

New Lambda environment variables:

- `USER_POOL_ID`
- `ADMIN_GROUP_NAME`
- `ANALYST_GROUP_NAME`
- `VIEWER_GROUP_NAME`

Deployment note:

- Redeploy `SentinelNet-Website` after building the frontend so CloudFront gets the new page, runtime config, and the new admin access HTTP API.

---

## Cost Management (Demo Mode)

Since this is a demo/university project, you can save money by stopping the SOC backend when it's not in use.

### Stopping the instance (CLI)

```bash
INSTANCE_ID=$(cd infra/terraform && terraform output -raw soc_instance_id)
aws ec2 stop-instances --instance-ids "$INSTANCE_ID"
```

You only pay for 50GB EBS storage (~$4/mo) while stopped, instead of the full ~$60–80/mo for a running t3.large.

### Restarting for a demo (CLI)

```bash
INSTANCE_ID=$(cd infra/terraform && terraform output -raw soc_instance_id)
aws ec2 start-instances --instance-ids "$INSTANCE_ID"
```

Wait **5–10 minutes** for SOC services (Cassandra, Elasticsearch, TheHive, Grafana) to initialize. Then refresh the dashboard.

### Or via the AWS Console
1. Go to **EC2** → **Instances**, select the SentinelNet instance.
2. **Instance state** → **Stop** / **Start**.
