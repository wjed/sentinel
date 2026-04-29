# How to Deploy SentinelNet

Infrastructure is managed with **Terraform**. All commands run from `infra/terraform/`.

**Live site:** https://sentinelnetsolutions.com

---

## What you need

| Tool | Version | Install |
|------|---------|---------|
| Terraform | >= 1.5 | https://developer.hashicorp.com/terraform/install |
| AWS CLI | >= 2.x | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html |
| Node.js | >= 18 | https://nodejs.org |
| npm | >= 9 | bundled with Node.js |

---

## AWS credentials (required every session)

Never commit credentials to the repo. Use environment variables or an AWS profile:

```bash
# Environment variables (this terminal session only)
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
export AWS_DEFAULT_REGION=us-east-1

# OR — named profile
export AWS_PROFILE=sentinelnet-dev
```

If you accidentally shared a key, rotate it immediately in the AWS IAM console (create new, delete old).

---

## First-time setup (once per machine)

```bash
cd infra/terraform
terraform init
```

That's it — no Python deps, no bootstrapping.

---

## Deploy (every time)

**Option A — one script (recommended)**

```bash
cd infra/terraform
./scripts/deploy-dev-cloudfront.sh
```

This builds the frontend, runs `terraform apply`, and prints `website_url` when done.

**Option B — step by step**

```bash
# 1. Build the frontend
cd frontend && npm install && npm run build && cd ..

# 2. Apply infrastructure
cd infra/terraform
terraform apply -var-file=envs/dev.tfvars
```

After apply, Terraform prints `website_url`. That's the live site.

---

## Production deploy (custom domain)

```bash
cd infra/terraform
cp envs/prod.tfvars.example envs/prod.tfvars
# Edit prod.tfvars with your domain, hosted_zone_id, etc.
./scripts/deploy-prod-domain.sh
```

ACM certificate validation via Route 53 happens automatically — can take 5–30 minutes on first deploy.

---

## Updating the frontend only

After changing code in `frontend/`:

```bash
./scripts/build-frontend.sh

BUCKET=$(cd infra/terraform && terraform output -raw frontend_bucket_name)
DIST_ID=$(cd infra/terraform && terraform output -raw cloudfront_distribution_id)

aws s3 sync frontend/dist/ "s3://$BUCKET/" --delete \
  --cache-control "public,max-age=86400" \
  --exclude "config.json"

aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

`config.json` is managed by Terraform and excluded from the sync.

---

## SOC backend (EC2 — Wazuh / TheHive / Grafana)

### Stop to save cost

The EC2 instance (~$60–80/month) is the main ongoing cost. Stop it when not in use:

```bash
INSTANCE_ID=$(cd infra/terraform && terraform output -raw soc_instance_id)
aws ec2 stop-instances --instance-ids "$INSTANCE_ID"
```

Restart:

```bash
aws ec2 start-instances --instance-ids "$INSTANCE_ID"
# Wait 5–10 minutes for SOC services to come up
```

### Connect to the instance

```bash
INSTANCE_ID=$(cd infra/terraform && terraform output -raw soc_instance_id)
aws ssm start-session --target "$INSTANCE_ID"

# Inside the session:
cd /opt/sentinel
docker-compose ps
docker-compose logs --tail=50 thehive
```

### Toggle SOC backend off entirely

Set `create_soc_backend = false` in your tfvars and re-apply:

```bash
terraform apply -var-file=envs/dev.tfvars -var="create_soc_backend=false"
```

---

## Tear down / destroy

```bash
cd infra/terraform

# Dev (safe — force_destroy=true empties buckets first)
./scripts/destroy-dev.sh

# Manual
terraform destroy -var-file=envs/dev.tfvars
```

If destroy fails because a bucket is non-empty:

```bash
BUCKET=$(terraform output -raw frontend_bucket_name)
aws s3 rm "s3://$BUCKET" --recursive
terraform destroy -var-file=envs/dev.tfvars
```

---

## Quick checklist

- [ ] AWS credentials set
- [ ] `terraform init` (first time only)
- [ ] `cd frontend && npm install && npm run build && cd ..`
- [ ] `cd infra/terraform && terraform apply -var-file=envs/dev.tfvars`
- [ ] Copy `website_url` from output

---

## If something goes wrong

| Error | Fix |
|-------|-----|
| "The security token included in the request is invalid" | Re-export AWS credentials |
| "No such file or directory: frontend/dist" | Run `npm run build` in `frontend/` first |
| "terraform: command not found" | Install Terraform from https://developer.hashicorp.com/terraform/install |
| Cognito "redirect_uri_mismatch" | In cloudfront_only mode, set `site_url_override` to the CloudFront URL from `terraform output website_url` and re-apply |
| CloudFront serving stale content | Run `aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"` |
| "BucketAlreadyExists" on apply | Change `project_name` or `environment` in tfvars to generate a unique bucket name |
| ACM certificate stuck "Pending" | DNS validation via Route 53 can take up to 30 minutes — check NS records are correct |

Full troubleshooting: **infra/terraform/README.md**
