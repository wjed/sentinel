# Deploying the SentinelNet website (S3 + CloudFront)

Infrastructure is **Terraform**. The `frontend` module deploys the React app to S3 and serves it via CloudFront.

**Live site:** https://sentinelnetsolutions.com

**Every time you deploy:** Run `npm run build` in `frontend/` first (so `frontend/dist` is current), then run `terraform apply` from `infra/terraform/`. Terraform syncs whatever is in `dist` to S3.

**Important:** Never commit AWS keys to the repo. If you shared your access key or secret anywhere (e.g. in chat), **rotate them now** in the AWS IAM console (create a new key, delete the old one).

---

## 1. AWS credentials (required)

**Do not put credentials in the repo.** Use one of:

- **Environment variables** (for this terminal session):
  ```bash
  export AWS_ACCESS_KEY_ID=your_access_key_id
  export AWS_SECRET_ACCESS_KEY=your_secret_access_key
  export AWS_DEFAULT_REGION=us-east-1
  ```
- **AWS CLI profile:** run `aws configure` and then `export AWS_PROFILE=your_profile`.

**If you shared your access key or secret in chat or in a file, rotate them now** in the AWS IAM console (create new key, delete old one).

---

## 2. Build the frontend

From the **repo root**:

```bash
cd frontend
npm install
npm run build
cd ..
```

This creates `frontend/dist/`. Terraform uploads that folder to S3.

---

## 3. Initialize Terraform (first time only)

```bash
cd infra/terraform
terraform init
```

---

## 4. Deploy

```bash
cd infra/terraform
terraform apply -var-file=envs/dev.tfvars
```

Or use the one-shot script (builds frontend + applies):

```bash
cd infra/terraform
./scripts/deploy-dev-cloudfront.sh
```

When Terraform finishes it prints `website_url`. Open it to see the live site.

---

## 5. Get the website URL after deploy

```bash
cd infra/terraform
terraform output website_url
terraform output cloudfront_distribution_id
```

Or via AWS CLI:
```bash
aws cloudformation describe-stacks  # not needed — use terraform output
```

---

## 6. Redeploy after frontend changes

```bash
cd frontend && npm run build && cd ..
cd infra/terraform && terraform apply -var-file=envs/dev.tfvars
```

Or sync directly without a full apply (faster for frontend-only changes):

```bash
BUCKET=$(terraform output -raw frontend_bucket_name)
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws s3 sync frontend/dist/ "s3://$BUCKET/" --delete --cache-control "public,max-age=86400" --exclude "config.json"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

---

## Summary

| Step | Command / action |
|------|-----------------|
| Set credentials | `export AWS_ACCESS_KEY_ID=...` and `AWS_SECRET_ACCESS_KEY=...` (or `aws configure`) |
| Build frontend | `cd frontend && npm run build` |
| Init (once) | `cd infra/terraform && terraform init` |
| Deploy | `terraform apply -var-file=envs/dev.tfvars` |
| Get URL | `terraform output website_url` |

**Live site:** https://sentinelnetsolutions.com
