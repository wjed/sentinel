# SentinelNet

A security operations platform: marketing pages (Home, Product, Pricing) + a dashboard with a **real-time SOC backend** (Wazuh, TheHive, Grafana). It runs on AWS (S3, CloudFront, EC2, Lambda). Originally a JMU university project.

---

## Handoff status (read this first)

> The original AWS account (`639418629910`) used by the JMU team has been torn down at the end of the semester. The CloudFront distribution, EC2 SOC, ALB, Cognito user pool, Lambdas, S3 buckets, DynamoDB tables, and VPC are all gone, and so is the Terraform state backend. The code, Terraform modules, and docs are all here and ready to be redeployed into a **new AWS account**.
>
> Two things were intentionally preserved in the old AWS account: the Route 53 hosted zone for `sentinelnetsolutions.com` and the domain registration itself (paid through **2027-02-16**, auto-renew off). If JMU keeps that account open and you want the same domain, you can ask for the hosted zone ID and re-point Terraform at it — but the simpler path is to register a new domain in your new account and follow the steps below from scratch.
>
> If you are picking this project up, follow [Starting fresh on a new AWS account](#starting-fresh-on-a-new-aws-account) below.

---

## What's in this repo

| Folder | What it is |
|--------|------------|
| **frontend/** | The website. React app. You edit code here. |
| **infra/** | AWS deployment (Terraform). One command deploys the site and SOC. |
| **backend/lambda/** | Lambdas for the telemetry alerts API and the SQS → S3 alert ingester. (The Terraform `backend_api` module also references `profile_api` and `admin_access_api`; their source code was removed from the repo so the next team will need to either restore those lambdas or trim the references in `infra/terraform/modules/backend_api/main.tf`.) |
| **backend/dashboard_api/** | Flask container that runs on the SOC EC2. Queries Wazuh (indexer + manager), TheHive, Grafana, Elasticsearch, and Cassandra and powers the live dashboard at `/api/dashboard/*`. |
| **docs/** | Architecture diagrams, agent enrollment guide, project overview, final presentation. |
| **infra/HOW-TO-DEPLOY.md** | Step-by-step deploy guide. |
| **infra/terraform/README.md** | Detailed Terraform reference: modules, state, troubleshooting. |

**SentinelNet** includes a full backend SOC running on a single cost-optimized EC2 instance, with a dedicated SQS/Lambda alert ingestion pipeline and Cognito-gated SSO for the analyst portal.

---

## Run the frontend on your computer

You don't need AWS to develop the marketing pages — only to deploy them.

From the **repo root** (the folder that contains `frontend` and `infra`):

```bash
cd frontend
npm install
npm run build
npm run dev
```

Open **http://localhost:3000** in your browser. Sign-in won't work without a deployed Cognito user pool, but everything public-facing renders.

---

## Starting fresh on a new AWS account

If you've inherited this project and need to stand it up in a brand-new AWS account, work through these steps in order. Plan on ~30 minutes for a CloudFront-only dev deploy, ~1–2 hours for a full prod deploy with a custom domain.

### 0. Prereqs

| Tool | Version | Install |
|------|---------|---------|
| Terraform | >= 1.5 | https://developer.hashicorp.com/terraform/install |
| AWS CLI | >= 2.x | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html |
| Node.js | >= 18 | https://nodejs.org |
| npm | >= 9 | bundled with Node.js |

You also need an IAM user (or SSO role) in the new AWS account with permissions to create the resources Terraform manages: S3, CloudFront, EC2, Lambda, API Gateway, Cognito, ALB, ACM, Route 53, IAM, DynamoDB, SQS, CloudWatch Logs.

### 1. Configure AWS credentials

```bash
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
export AWS_DEFAULT_REGION=us-east-1
```

(Or `aws configure` once and use a named profile.)

Verify with `aws sts get-caller-identity` — it should return your new account ID.

### 2. Bootstrap remote Terraform state (one-time, per AWS account)

The root Terraform config keeps its state in an S3 bucket with DynamoDB locking. The previous account's state bucket (`sentinelnet-terraform-state-639418629910`) is gone — you must create a new one.

```bash
cd infra/terraform/bootstrap
```

Edit `variables.tf` and set `state_bucket_name` to something globally unique (S3 bucket names are global). Convention: `sentinelnet-terraform-state-<your-12-digit-account-id>`.

Then:

```bash
terraform init
terraform apply
```

This creates the state bucket and `sentinelnet-terraform-locks` DynamoDB table.

### 3. Wire the root config to your new bucket

Edit `infra/terraform/versions.tf` and update the `backend "s3"` block to reference the bucket name you just created:

```hcl
backend "s3" {
  bucket         = "sentinelnet-terraform-state-<your-account-id>"   # ← change this
  key            = "sentinelnet/dev/terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "sentinelnet-terraform-locks"
  encrypt        = true
}
```

### 4. Initialize the root config

```bash
cd infra/terraform
terraform init
```

If init complains about state migration, you're in a fresh bucket — answer `no` to copy and let Terraform create new state in the new bucket.

### 5. Pick a deployment mode and apply

**Option A — Dev (cheapest, no custom domain, no SOC backend).** Frontend on CloudFront + Cognito only. ~$1/month.

```bash
cd frontend && npm install && npm run build && cd ..
cd infra/terraform
./scripts/deploy-dev-cloudfront.sh
```

When it finishes, Terraform prints `website_url` — that's a CloudFront URL like `https://d1234abcd.cloudfront.net`. Open it.

**Option B — Prod (custom domain + full SOC stack).** ~$60–80/month while running.

Prereqs:
1. Buy a domain (Namecheap, Google Domains, etc.).
2. Create a Route 53 hosted zone for it: `aws route53 create-hosted-zone --name yourdomain.com --caller-reference $(date +%s)`.
3. Point your domain's nameservers at the four Route 53 nameservers (allow up to 48h to propagate).
4. Copy and edit the prod tfvars:
   ```bash
   cd infra/terraform
   cp envs/prod.tfvars.example envs/prod.tfvars
   # fill in domain_name, hosted_zone_id, etc.
   ```
5. Deploy:
   ```bash
   ./scripts/deploy-prod-domain.sh
   ```

See `infra/HOW-TO-DEPLOY.md` and `infra/terraform/README.md` for module-level detail.

### 6. Create your first admin user

After a prod apply, Terraform creates a default admin in Cognito (`jack`, password in `prod.tfvars.example` — **change this immediately**). For dev mode, create one yourself:

```bash
USER_POOL_ID=$(cd infra/terraform && terraform output -raw cognito_user_pool_id)
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username your-email@example.com \
  --user-attributes Name=email,Value=your-email@example.com Name=email_verified,Value=true \
  --temporary-password 'TempPassword1!'
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$USER_POOL_ID" \
  --username your-email@example.com \
  --group-name SentinelNetAdmins
```

Sign in at the website, then change the password.

---

## Day-to-day deploys (after fresh setup is done)

```bash
cd frontend && npm install && npm run build && cd ..
cd infra/terraform
terraform apply -var-file=envs/dev.tfvars   # or envs/prod.tfvars
```

If you only changed frontend code, `./scripts/deploy-dev-cloudfront.sh` runs the build + apply + CloudFront invalidation in one shot.

---

## Where things live in a deployed environment

After a prod apply, services are reachable at:

| Tool | URL pattern | Auth |
|------|-------------|------|
| Analyst Portal | `https://yourdomain.com` | Cognito SSO |
| Admin console | `https://yourdomain.com/console` | Inherits portal session (admins + analysts) |
| TheHive 5 | `https://yourdomain.com/thehive/` | Cognito SSO (auto-redirect) |
| Grafana | `https://yourdomain.com/grafana/` | Cognito SSO (auto-redirect) |
| Wazuh Dashboard | `https://yourdomain.com/wazuh/` | Cognito SSO via OIDC |
| Wazuh agent endpoints | EC2 public IP, ports 1514 (events), 1515 (registration), 55000 (REST API) | Open enrollment |

Access is gated on Cognito groups: `SentinelNetAdmins`, `SentinelNetAnalysts`, `SentinelNetViewers`. Viewers get a 403 from TheHive/Grafana/Wazuh and should consume telemetry through the dashboard pages instead. Group membership can be managed from the AWS Cognito console or via `aws cognito-idp admin-add-user-to-group`.

---

## Cost management

Running the full SOC stack costs ~$60–80/month. To save money during off-hours:

**Stop the EC2 instance** (you keep paying ~$4/mo for EBS storage, but not the instance):

```bash
INSTANCE_ID=$(cd infra/terraform && terraform output -raw soc_instance_id)
aws ec2 stop-instances --instance-ids "$INSTANCE_ID"
```

**Restart for a demo:**

```bash
aws ec2 start-instances --instance-ids "$INSTANCE_ID"
```

Wait **5–10 minutes** for Cassandra, Elasticsearch, TheHive, Grafana to come up.

**Tear everything down between semesters:**

```bash
cd infra/terraform
./scripts/destroy-prod.sh   # or destroy-dev.sh for the dev env
```

After teardown the only AWS spend is the Route 53 hosted zone (~$0.50/mo) and the empty state bucket (pennies). To clean those up too, `terraform destroy` from `infra/terraform/bootstrap/` after emptying the versioned state bucket.

---

## When something breaks

- **"security token invalid" / "credentials could not be used"** → Re-export AWS credentials.
- **"No such file or directory: frontend/dist"** → `npm run build` in `frontend/` before deploying.
- **"terraform: command not found"** → Install Terraform.
- **"Backend initialization required"** on `terraform init` → Backend bucket name in `versions.tf` doesn't match an existing bucket. Re-check step 3 above.
- **Cognito "redirect_uri_mismatch"** in CloudFront-only mode → Set `site_url_override` in tfvars to the CloudFront URL from `terraform output website_url` and re-apply.
- **CloudFront serving stale content** → `aws cloudfront create-invalidation --distribution-id $(cd infra/terraform && terraform output -raw cloudfront_distribution_id) --paths "/*"`.
- **EC2 came up but services aren't responding** → Wait 5–10 min after first boot for Cassandra/ES to initialize. SSM into the instance: `aws ssm start-session --target $INSTANCE_ID` and check `docker ps`.

More detail: **infra/HOW-TO-DEPLOY.md** and **infra/terraform/README.md**.

---

## Suggested team workflow

The original team enforced a single-merger PR review process. Adapt this to your team's preference, but at minimum:

- Work on feature branches; open PRs into `main`.
- Don't push directly to `main`.
- Don't run `terraform apply` against shared infra without team awareness — apply mutates real AWS resources and can break a live demo for everyone.
- Keep `prod.tfvars` out of git (it's already in `.gitignore`). Share secrets via a password manager, not the repo.
