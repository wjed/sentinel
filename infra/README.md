# SentinelNet — Infrastructure (Terraform)

This folder contains the **AWS deployment** for SentinelNet. All infrastructure is defined as Terraform modules under `infra/terraform/`. You don't click in the AWS console; you run `terraform apply` from `infra/terraform/`.

**Do not deploy without approval** — deploying changes live AWS resources. See the main repo README for the team workflow.

---

## What's in this folder

| Path | What it is |
|------|------------|
| **`terraform/`** | All Terraform code. This is where you work. |
| **`terraform/modules/`** | One module per concern (network, auth, frontend, soc_backend, etc.). Edit here to add or change AWS resources. |
| **`terraform/envs/`** | Per-environment tfvars files (`dev.tfvars`, `prod.tfvars.example`). |
| **`terraform/scripts/`** | Helper shell scripts: build frontend, deploy, destroy, render local config. |
| **`HOW-TO-DEPLOY.md`** | Step-by-step deploy instructions. Start here when you're actually deploying. |
| **`DEPLOY.md`** | Credential safety reminders. |
| **`lambda/`** | Python Lambda source code deployed by the `backend_api` module. |
| **`AWS/`** | Network specs and reference docs for the AWS account. |

All `terraform` commands run from **`infra/terraform/`**, not from `infra/`.

---

## Terraform modules (what each one does)

| Module | AWS resources |
|--------|--------------|
| `network` | VPC, public subnets, IGW, security groups |
| `auth` | Cognito user pool, domain, groups, app clients (web + soc) |
| `userdata` | DynamoDB profiles table, S3 profile pictures bucket |
| `frontend` | S3 website bucket, CloudFront OAC distribution, optional ACM + Route 53 |
| `backend_api` | Profile API, Admin Access API, Telemetry API — Lambda + HTTP API Gateway |
| `soc_backend` | EC2 (Wazuh/TheHive/Grafana), ALB, docker-compose user data, Wazuh ingest Lambda |
| `alert_pipeline` | SQS queue + DLQ, S3 alerts data lake |
| `monitoring` | CloudWatch log groups, optional GuardDuty |

---

## Commands (all from `infra/terraform/`)

```bash
# First time on this machine
terraform init

# See what would change (no apply)
terraform plan -var-file=envs/dev.tfvars

# Deploy dev environment
terraform apply -var-file=envs/dev.tfvars

# One-shot deploy + frontend build
./scripts/deploy-dev-cloudfront.sh

# Deploy prod (custom domain)
./scripts/deploy-prod-domain.sh
```

---

## Where to change what

- **VPC / subnets / security groups:** `modules/network/`
- **Cognito (user pool, groups, clients):** `modules/auth/`
- **DynamoDB / S3 for user profiles:** `modules/userdata/`
- **CloudFront, S3 site bucket, ACM, Route 53:** `modules/frontend/`
- **Profile API / Admin API / Telemetry API Lambdas:** `modules/backend_api/` and `../lambda/`
- **EC2 (SOC), ALB, docker-compose:** `modules/soc_backend/`
- **SQS + S3 alert pipeline:** `modules/alert_pipeline/`

---

## Deployment modes

| Mode | Domain | Use case |
|------|--------|----------|
| `cloudfront_only` (dev default) | `xxxx.cloudfront.net` | Demos, testing, no custom domain needed |
| `custom_domain` | your domain | Production — full CloudFront → ALB routing for TheHive/Grafana |

Set `enable_custom_domain = true` in tfvars and provide `domain_name` + `hosted_zone_id` for the production path.

---

## Live site

After a successful apply, `terraform output website_url` gives the live URL. Current production URL: **https://sentinelnetsolutions.com/**

---

## Full documentation

- **HOW-TO-DEPLOY.md** — deploy walkthrough, credential setup, SOC start/stop, teardown
- **terraform/README.md** — full module reference, architecture diagram, troubleshooting
- **terraform/AGENT.md** — migration notes, known issues, design decisions
