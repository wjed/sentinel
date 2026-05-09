# SentinelNet — Terraform Infrastructure

> **Terraform is the only deployment path.** CDK has been fully removed from this repo.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Remote State](#remote-state)
3. [Architecture Overview](#architecture-overview)
4. [Deployment Modes](#deployment-modes)
5. [Quick Start — CloudFront-Only (Recommended for New Accounts)](#quick-start--cloudfront-only)
6. [Production Deploy — Custom Domain](#production-deploy--custom-domain)
7. [Updating the Frontend](#updating-the-frontend)
8. [SOC Backend — Start / Stop / Deploy](#soc-backend)
9. [Cost Estimates](#cost-estimates)
10. [Destroy / Teardown](#destroy--teardown)
11. [Module Reference](#module-reference)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Terraform | >= 1.5 | https://developer.hashicorp.com/terraform/install |
| AWS CLI | >= 2.x | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html |
| Node.js | >= 18 | https://nodejs.org |
| npm | >= 9 | bundled with Node.js |

Configure AWS credentials before running any Terraform commands. State now lives in S3, so credentials are required even for `terraform init`:

```bash
# Option A — environment variables
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-east-1

# Option B — AWS profile
export AWS_PROFILE=sentinelnet-dev
```

---

## Remote State

Terraform state lives in an encrypted, versioned S3 bucket with DynamoDB-based locking. The backend is wired in `versions.tf`:

| Setting | Value |
|---------|-------|
| Bucket | `sentinelnet-terraform-state-639418629910` |
| Key | `sentinelnet/dev/terraform.tfstate` |
| Lock table | `sentinelnet-terraform-locks` |
| Region | `us-east-1` |
| Encryption | AES256 (SSE-S3) |

The bucket and lock table are provisioned by `bootstrap/`, a one-shot Terraform config that runs once per AWS account with its own local state.

**Existing account (`639418629910`):** bootstrap is already applied — just run `terraform init` from `infra/terraform/`, which picks up the S3 backend automatically.

**New AWS account:** bootstrap first, then init the root config.

```bash
cd infra/terraform/bootstrap
# Edit variables.tf — bucket name must be globally unique
terraform init
terraform apply

cd ..
# Update versions.tf with the new bucket name, then:
terraform init
```

If you ever need to re-migrate state (e.g. moving environments), use `terraform init -migrate-state`. Versioning is on, so prior state revisions are recoverable from the bucket.

---

## Architecture Overview

```
Internet → CloudFront
              ├── /* (default)        → S3 (React SPA)
              ├── /thehive/*          → ALB → EC2:9000  (TheHive 5)
              ├── /grafana/*          → ALB → EC2:3000  (Grafana)
              └── /oauth2/idpresponse → ALB (Cognito relay)

Lambda APIs (HTTP API Gateway, JWT auth via Cognito):
  GET/PATCH /profile           → profile_api_py Lambda
  GET/POST  /admin/access/*    → admin_access_api_py Lambda
  GET       /alerts            → telemetry_api Lambda

SQS → Lambda → S3 (Wazuh alert ingestion pipeline)

EC2 (t3.medium, 50 GB GP3):
  Docker-compose: Cassandra + Elasticsearch + TheHive 5 + Wazuh + Grafana
```

---

## Deployment Modes

| Mode | Domain | ACM | Route 53 | ALB/SOC behaviors via CF |
|------|--------|-----|----------|--------------------------|
| `cloudfront_only` (default) | `xxxx.cloudfront.net` | default CF cert | ✗ | ✗ (access via ALB DNS) |
| `custom_domain` | your domain | ACM in us-east-1 | ✓ | ✓ |

---

## Quick Start — CloudFront-Only

Best for demos, student labs, or testing in a fresh AWS account. No custom domain required.

```bash
cd infra/terraform

# 1. Copy and review the example config
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars if needed (defaults are fine for a basic deploy)

# 2. Initialize providers
terraform init

# 3. Deploy infrastructure + build + sync frontend in one step
./scripts/deploy-dev-cloudfront.sh

# OR, step by step:
./scripts/build-frontend.sh
terraform apply -var-file=envs/dev.tfvars
# Then sync (see "Updating the Frontend" section)
```

After apply, Terraform prints `website_url`. Open it in a browser — the React app should load.

### CloudFront-only + SOC Backend

The SOC backend requires knowing the CloudFront URL for Cognito callback configuration. Deploy in two phases:

```bash
# Phase 1: frontend + APIs only
terraform apply -var-file=envs/dev.tfvars  # create_soc_backend = false in dev.tfvars

# Note the CloudFront URL:
terraform output website_url
# → https://d1abc123.cloudfront.net

# Phase 2: add SOC backend
# Add to terraform.tfvars:
#   site_url_override = "https://d1abc123.cloudfront.net"
#   create_soc_backend = true
terraform apply -var-file=envs/dev.tfvars
```

When `create_soc_backend = true` in cloudfront_only mode:
- TheHive and Grafana are accessed via the **ALB DNS name** shown in `soc_alb_dns_name` output
- CloudFront does NOT proxy `/thehive/*` and `/grafana/*` in this mode (no circular dependency)
- Full CloudFront → ALB routing is available in `custom_domain` mode

---

## Production Deploy — Custom Domain

1. **Create a Route 53 hosted zone** for your domain in the target AWS account.

2. **Copy and fill in production tfvars:**
   ```bash
   cp envs/prod.tfvars.example envs/prod.tfvars
   # Edit prod.tfvars with real domain, hosted_zone_id, etc.
   ```

3. **Deploy:**
   ```bash
   ./scripts/deploy-prod-domain.sh
   ```

4. **ACM certificate validation** happens automatically via Route 53 DNS records. This can take 5–30 minutes on first deploy. Terraform will wait for validation before proceeding.

5. After deploy, the site is live at `https://yourdomain.com`.

---

## Updating the Frontend

After making code changes to `frontend/`:

```bash
# Build
./scripts/build-frontend.sh

# Sync to S3 (replace BUCKET and DIST_ID with terraform outputs)
BUCKET=$(cd infra/terraform && terraform output -raw frontend_bucket_name)
DIST_ID=$(cd infra/terraform && terraform output -raw cloudfront_distribution_id)

aws s3 sync frontend/dist/ "s3://$BUCKET/" --delete --cache-control "public,max-age=86400" --exclude "config.json"

# Bust the CloudFront cache
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

The `config.json` file is managed by Terraform and is NOT overwritten by the sync command.

### Local Development

To run the frontend locally against a deployed backend:

```bash
cd infra/terraform
./scripts/render-frontend-config.sh   # writes frontend/public/config.json

cd ../../frontend
npm run dev
# Open http://localhost:3000
```

---

## SOC Backend

### Stop the EC2 to save cost

The EC2 instance running Wazuh/TheHive/Grafana is the main ongoing cost (~$30-40/month for t3.medium). Stop it when not in use:

```bash
INSTANCE_ID=$(cd infra/terraform && terraform output -raw soc_instance_id)
aws ec2 stop-instances --instance-ids "$INSTANCE_ID"
```

Restart:
```bash
aws ec2 start-instances --instance-ids "$INSTANCE_ID"
# Wait ~3-5 minutes for services to come up
```

### Check SOC service status

```bash
INSTANCE_ID=$(cd infra/terraform && terraform output -raw soc_instance_id)

# Connect via SSM (no SSH key needed)
aws ssm start-session --target "$INSTANCE_ID"

# Then inside the session:
cd /opt/sentinel
docker-compose ps
docker-compose logs --tail=50 thehive
docker-compose logs --tail=50 grafana
```

### Toggle SOC backend off entirely

Set `create_soc_backend = false` and re-apply to remove EC2/ALB (S3/SQS pipelines remain):

```bash
terraform apply -var-file=envs/dev.tfvars -var="create_soc_backend=false"
```

---

## Cost Estimates

| Scenario | Monthly cost (us-east-1) |
|----------|--------------------------|
| Frontend + APIs only (`create_soc_backend=false`) | ~$5–15 |
| Full deploy with t3.medium running 24/7 | ~$50–90 |
| Full deploy, EC2 stopped (storage only) | ~$10–20 (EBS + ALB idle) |
| Destroy dev entirely | $0 |

**Cost drivers:**
- EC2 t3.medium = ~$30/month
- ALB = ~$18/month
- CloudFront = pay-per-use (~$0.01/GB after free tier)
- Lambda + DynamoDB + SQS = essentially free at low volume
- S3 = negligible

---

## Destroy / Teardown

```bash
cd infra/terraform

# Dev environment (force_destroy = true, removes all objects from buckets)
./scripts/destroy-dev.sh

# Manual
terraform destroy -var-file=envs/dev.tfvars

# Production (careful! force_destroy = false)
terraform destroy -var-file=envs/prod.tfvars
```

If destroy fails due to S3 bucket not empty:
```bash
BUCKET=$(terraform output -raw frontend_bucket_name)
aws s3 rm "s3://$BUCKET" --recursive
terraform destroy -var-file=envs/dev.tfvars
```

---

## Module Reference

| Module | Description |
|--------|-------------|
| `network` | VPC, public subnets, IGW, security groups |
| `auth` | Cognito User Pool, domain, groups, app clients |
| `userdata` | DynamoDB profiles table, S3 profile pictures |
| `frontend` | S3 website bucket, CloudFront, OAC, optional ACM/Route53 |
| `backend_api` | Profile API, Admin Access API, Telemetry API Lambdas + HTTP APIs |
| `soc_backend` | EC2, ALB, Wazuh/TheHive/Grafana docker-compose, Wazuh Ingest Lambda |
| `alert_pipeline` | SQS queue + DLQ, S3 alerts data lake |
| `monitoring` | CloudWatch log groups, optional GuardDuty |

---

## Troubleshooting

### Cognito redirect mismatch ("redirect_uri_mismatch")

**Cause:** The browser's redirect URL doesn't match the Cognito app client's allowed callback URLs.

**Fix:**
1. Check `terraform output website_url` — this must match the redirect.
2. In cloudfront_only mode, if you see `PENDING_REPLACE_WITH_CLOUDFRONT_URL` in a callback, set `site_url_override` to the actual CloudFront URL and re-apply.
3. If running locally at `localhost:3000` or `localhost:5173`, these are pre-configured in the app client.

### CloudFront still serving old frontend

```bash
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```
Wait ~30–60 seconds for invalidation to propagate.

### Lambda environment variable missing

If a Lambda fails due to a missing env var:
```bash
terraform apply   # re-apply to ensure all env vars are set
# Or check manually:
aws lambda get-function-configuration --function-name sentinelnet-dev-profile-api | jq .Environment
```

### "BucketAlreadyOwnedByYou" or "BucketAlreadyExists" on apply

The S3 bucket name is already taken (either by you or globally). Change the `project_name` or `environment` variables to generate a unique bucket name.

### ACM certificate validation stuck "Pending"

Route 53 DNS records for validation are created automatically when `create_route53_records = true`. If validation is stuck:
1. Confirm the Route 53 hosted zone has the correct NS records pointing to AWS.
2. Check the validation CNAME records exist: `aws route53 list-resource-record-sets --hosted-zone-id YOUR_ZONE_ID`
3. Validation can take up to 30 minutes for new domains.

### EC2 SOC services not ready yet

Services take 5–10 minutes to start after the EC2 instance boots. TheHive depends on Cassandra and Elasticsearch which are slow to initialize:

```bash
# SSH or SSM into instance
cd /opt/sentinel
docker-compose ps            # check service state
docker-compose logs thehive  # check TheHive startup
```

TheHive commonly fails on first boot if Cassandra isn't ready yet — it will restart automatically.

### TheHive or Grafana showing 502/503 behind CloudFront

In `custom_domain` mode, CloudFront routes to the ALB. Check:
1. ALB target group health: `aws elbv2 describe-target-health --target-group-arn <arn>`
2. EC2 security groups allow ALB → EC2 on port 9000 (TheHive) and 3000 (Grafana).
3. TheHive health check path is `/thehive/login` — ensure TheHive is started.

### Grafana subpath not working (returns 404 on assets)

Ensure `GF_SERVER_ROOT_URL` ends with `/grafana/` and `GF_SERVER_SERVE_FROM_SUB_PATH=true`. Both are set in the user_data template. If you modified the docker-compose manually, restart Grafana:

```bash
cd /opt/sentinel && docker-compose restart grafana
```

### Terraform "Error: creating CloudFront Distribution: InvalidViewerCertificate"

This happens when `enable_custom_domain = true` but the ACM certificate isn't in `us-east-1`. The `frontend` module uses the `aws.us_east_1` provider alias — ensure it's configured in `providers.tf`.

### terraform fmt / validate errors

Run from `infra/terraform/`:
```bash
terraform fmt -recursive
terraform validate
```
