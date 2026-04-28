# SentinelNet

A security operations platform: marketing pages (Home, Product, Pricing) + a dashboard with a **real-time SOC backend** (Wazuh, TheHive, Grafana). It runs on AWS (S3, CloudFront, EC2, Lambda). JMU university project.

---

## What’s in this repo

| Folder | What it is |
|--------|------------|
| **frontend/** | The website. React app. You edit code here. |
| **infra/** | AWS deployment (CDK). One command deploys the site and SOC. |
| **backend/** | Lambda functions for alert ingestion and the Telemetry API. |

That’s it. **SentinelNet** includes a full backend SOC running on a cost-optimized EC2 instance, with a dedicated SQS/Lambda alert ingestion pipeline.

**Live site:** [https://sentinelnetsolutions.com/](https://sentinelnetsolutions.com/) (Route 53). Sign-in and the dashboard work there.

---

## Team workflow (Git & deploy)

- **Push only to your branch.** Do not push directly to `main`. Create a branch, push your branch, then open a **pull request (PR)** to get your changes into `main`.
- **How to make a PR:** Create a branch (`git checkout -b your-name/feature-name`), commit and push it, then on GitHub open a PR from your branch into `main`. **Your entire team must review your PR before it is merged.** Do not merge the PR yourself — all approvals and merges go through **Will**. Will will move the PR in after the team has reviewed and approved. Do not merge `main` into your branch and then push; keep `main` as the source of truth and merge your branch into `main` via the PR.
- **Never merge or push to `main` directly.** All changes to `main` should go through a PR, with full team review and approval from Will.
- **Do not run `cdk deploy` unless you have approval.** Deploying changes the live site and AWS resources. Get approval from whoever owns deployment before you run the deploy steps below.

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

## Deploying to AWS (CDK)

**Do not run `cdk deploy` without approval.** Deploying updates the live site and AWS; get approval first (see “Team workflow” above).

We deploy this project with AWS CDK. There is no separate “deploy script” or CI job — someone runs `cdk deploy` from their machine (see below). If you’ve been approved to deploy and have never done it before, follow every step in order.

You need: **Node.js**, **npm**, **Python 3**, and **AWS credentials** (access key + secret for an IAM user that can deploy CloudFormation, or use `aws configure` if you already have credentials saved).

---

### First time only (once per computer)

From the **repo root**:

```bash
cd infra
pip install -r requirements.txt
cdk bootstrap
cd ..
```

If the terminal says **“cdk: command not found”**, run `npm install -g aws-cdk` and open a new terminal, then run the commands above again.

---

### Every time you deploy

Do these in the same terminal, in order.

**Step 1 — Log in to AWS**

Set credentials in the terminal you’ll use for the rest of the steps.

Windows PowerShell:

```powershell
$env:AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
$env:AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"
$env:AWS_DEFAULT_REGION="us-east-1"
```

Mac / Linux / Git Bash:

```bash
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
export AWS_DEFAULT_REGION=us-east-1
```

(Or run `aws configure` once and use that profile; then you can skip this step next time.)

**Step 2 — Build the frontend**

From the **repo root**:

```bash
cd frontend
npm install
npm run build
cd ..
```

**Step 3 — Deploy with CDK**

From the **repo root** you can deploy everything in order:

```bash
cd infra
./deploy-all.sh
cd ..
```

Or deploy step by step (from `infra/`):

```bash
cd infra
cdk deploy SentinelNet-Network --require-approval never --exclusively
cdk deploy SentinelNet-UserData --require-approval never
cdk deploy SentinelNet-Backend --require-approval never
cdk deploy SentinelNet-Website --require-approval never --exclusively
cd ..
```

- **SentinelNet-Network** — VPC and subnets (center team). Public subnets only, no NAT Gateway.
- **SentinelNet-UserData** — DynamoDB (profiles), S3 (profile pictures), and **Cognito UserPool** (shared auth).
- **SentinelNet-Website** — The React frontend (S3 + CloudFront) and the Profile API.
- **SentinelNet-Backend** — Full SOC suite (Wazuh, TheHive 5, Cassandra, Elasticsearch) on a cost-optimized **`t3.large`** (8GB RAM / **50GB GP3 SSD**) instance + **4GB Swap** and SQS/Lambda/S3 alert data lake. See **SOC_SERVICES.md** for service details.

**If Network fails** with “Cannot delete export … in use by SentinelNet-Backend”, run the one-time fix from `infra/`: `./fix-network-export-conflict.sh` (see **infra/HOW-TO-DEPLOY.md**).

When the Website deploy finishes, the output shows **WebsiteURL** (e.g. `https://xxxxx.cloudfront.net`). That’s the live site. Sign-in works because the stack creates Cognito and points it at that URL.

---

### Deploy checklist

- [ ] AWS credentials set (Step 1) or already configured
- [ ] `cd frontend` → `npm install` → `npm run build` → `cd ..`
- [ ] First time only: `cd infra` → `pip install -r requirements.txt` → `cdk bootstrap`
- [ ] `cd infra` → deploy **Network**, then **UserData**, then **Backend**, then **Website** (with `--exclusively` on Website)
- [ ] Copy **WebsiteURL** from the output

---

### 🌐 Live Dashboard Access (POC Default)

| Tool | Access URL | Authentication |
| :--- | :--- | :--- |
| **Analyst Portal** | [https://sentinelnetsolutions.com](https://sentinelnetsolutions.com) | **Cognito SSO** |
| **TheHive 5** | `https://sentinelnetsolutions.com/thehive/` | **Cognito SSO + group gate** (TheHive session via auth proxy) |
| **Grafana** | `https://sentinelnetsolutions.com/grafana/` | **Cognito SSO** (or `admin` / `sentinel`) |
| **Wazuh Agent** | Port **1514** (TCP) | (Public IP Registration) |

> **Note:** For TheHive and Grafana, use the **"Sign in with SentinelNet"** button. TheHive sessions are created by the auth proxy using a local TheHive user.

### TheHive auth proxy credentials

The backend stack uses an automated bootstrap process to create the necessary proxy accounts in TheHive 5.4. For this to work, you MUST provide both the proxy user credentials and the default admin credentials in a `.thehive_proxy.env` file (ignored by git) in the repo root.

Example file:

```bash
# Credentials for the proxy service to use
THEHIVE_USER=thehive-proxy@sentinelnetsolutions.com
THEHIVE_PASSWORD=SnNet!Hive2026$Q9

# Factory default admin credentials for bootstrap (TheHive 5.4)
THEHIVE_ADMIN_USER=admin@thehive.local
THEHIVE_ADMIN_PASSWORD=secret
THEHIVE_ORG=admin
```

The stack will automatically create the `THEHIVE_USER` in the `THEHIVE_ORG` during deployment.

---

### When something breaks

- **“security token invalid” / “credentials could not be used”** → Set AWS credentials again (Step 1).
- **“No such file or directory: frontend/dist”** → Run Step 2 (`npm run build` in `frontend`) before deploying.
- **“cdk: command not found”** → Run `npm install -g aws-cdk`, then open a new terminal.
- **“Cannot delete export … in use by SentinelNet-Website”** → Deploy Website with `--exclusively` (see Step 3).
- **“Cannot delete export … in use by SentinelNet-Backend”** (when deploying Network) → Run the one-time fix: from `infra/`, run `./fix-network-export-conflict.sh`. Then deploy as usual.

More detail: **infra/HOW-TO-DEPLOY.md**.

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

## 💰 Cost Management (Demo Mode)

Since this is a demo/university project, you can save money by stopping the SOC backend when it's not in use.

### Stopping the Instance
1. Log into the **AWS Console**.
2. Go to **EC2** -> **Instances**.
3. Select the **SentinelNet-Backend** instance.
4. Click **Instance state** -> **Stop instance**.
   * *Note: You only pay for the 50GB storage (~$4/mo) while it's stopped, instead of the full ~$60/mo.*

### Restarting for a Demo
1. Go to the **EC2 Console** and **Start** the instance.
2. **Wait 5-10 minutes.** The services take a few minutes to boot up and the ALB needs time to mark the targets as healthy.
3. Refresh the **Dashboard** and you're back in business!
