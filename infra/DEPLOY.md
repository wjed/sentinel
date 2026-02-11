# Deploying the SentinelNet website (S3 + CloudFront)

Infra is **AWS CDK in Python**. The **SentinelNet-Website** stack deploys the frontend to S3 and serves it via CloudFront.

**Live site (current deployment):** https://d1zrndjozdwm01.cloudfront.net

**Every time you deploy:** You must run `npm run build` in `frontend/` first (so `frontend/dist` is up to date), then run `cdk deploy SentinelNet-Website` from `infra/`. CDK uploads whatever is in `dist`—no build, no new code on CloudFront.

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

This creates `frontend/dist/`. The CDK deployment will upload that folder to S3.

---

## 3. Bootstrap (first time only)

From **infra/** (Python env):

```bash
cd infra
pip install -r requirements.txt   # Python CDK deps
cdk bootstrap
```

Use the same account/region you set in step 1.

---

## 4. Deploy the website stack

From **infra/**:

```bash
cdk deploy SentinelNet-Website --require-approval never
```

Or run `cdk deploy SentinelNet-Website` and approve the IAM changes when prompted.

When it finishes, CDK will print stack **outputs** including the CloudFront URL. Open that URL to see the site.

---

## 5. Get the website URL after deploy

The stack exports two outputs:

| Output | Description |
|--------|-------------|
| **WebsiteURL** | Full URL to open the dashboard (e.g. `https://d1zrndjozdwm01.cloudfront.net`) |
| **DistributionDomainName** | CloudFront domain only (e.g. `d1zrndjozdwm01.cloudfront.net`) |

**Where to find them:**

- **Terminal** — Printed at the end of `cdk deploy SentinelNet-Website`.
- **AWS Console** — CloudFormation → **SentinelNet-Website** → **Outputs** tab.
- **CLI:** `aws cloudformation describe-stacks --stack-name SentinelNet-Website --query "Stacks[0].Outputs"`

---

## 6. Redeploy after frontend changes

1. Build again: `cd frontend && npm run build && cd ..`
2. From `infra/`: `cdk deploy SentinelNet-Website --require-approval never`

CloudFront will be invalidated so the new content is served.

---

## Summary

| Step              | Command / action |
|------------------|-------------------|
| Set credentials  | `export AWS_ACCESS_KEY_ID=...` and `AWS_SECRET_ACCESS_KEY=...` (or `aws configure`) |
| Build frontend  | `cd frontend && npm run build` |
| Bootstrap (once) | `cd infra && cdk bootstrap` |
| Deploy website  | `cd infra && cdk deploy SentinelNet-Website` |
| Get URL         | Stack outputs **WebsiteURL** / **DistributionDomainName** (terminal, CloudFormation Outputs tab, or CLI above) |

**Live site (current):** https://d1zrndjozdwm01.cloudfront.net
