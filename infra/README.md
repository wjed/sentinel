# SentinelNet — Infrastructure (AWS CDK)

This folder is the **AWS deployment** for SentinelNet. Everything that runs in AWS (the website, the database, the VPC, the profile API) is defined here as **CDK stacks** in **Python**. You don’t deploy by clicking in the AWS console; you run `cdk deploy` from this directory (and only if you have approval — see the main repo README).

---

## What’s in this folder

| Path | What it is |
|------|------------|
| **`app.py`** | The entry point. It creates all four stacks; Website gets UserData (profile API), Backend gets Network (VPC + subnets). **Don’t** rename stack names or deploys get confused. |
| **`cdk.json`** | Tells the CDK CLI to run `app.py` when you run `cdk` commands. You usually don’t need to touch this. |
| **`requirements.txt`** | Python packages needed for CDK. Run `pip install -r requirements.txt` from this directory before your first `cdk` command. |
| **`stacks/`** | One Python file per stack. This is where you **edit** when you want to add or change AWS resources. |
| **`lambda/`** | Lambda function code that gets deployed by the Website stack (the profile API). **`profile_api_py/`** = Python handler for GET/PATCH profile. |
| **`HOW-TO-DEPLOY.md`** | Step-by-step deploy instructions (credentials, build frontend, deploy order). Use this when you’re actually deploying. |
| **`DEPLOY.md`** | Extra deploy notes (e.g. not committing keys, rotating if leaked). |

You run **all** `cdk` commands from **this directory** (`infra/`). Not from the repo root. Not from `stacks/`. From `infra/`.

---

## The four stacks (what each one does)

| Stack name | File | What it creates in AWS |
|------------|------|-------------------------|
| **SentinelNet-Network** | `stacks/network_stack.py` | **VPC** with public, private, and internal subnets. Outputs VPC ID and subnet IDs. Backend uses this VPC. |
| **SentinelNet-UserData** | `stacks/user_data_stack.py` | **DynamoDB** (profiles) and **S3** bucket. No Lambda here — just storage. |
| **SentinelNet-Website** | `stacks/website_stack.py` | **Live site**: S3 + CloudFront, **Cognito**, and **profile API** (Lambda + API Gateway) using the UserData table. Writes `config.json` for the frontend. |
| **SentinelNet-Backend** | `stacks/backend_stack.py` | **ECS/Fargate** (e.g. Grafana) and an internal ALB. Uses Network’s VPC and private subnets. |

**Dependencies:** Website uses UserData (profile API). Backend uses Network (VPC + private subnets). **Backend does not deploy Network** — you deploy Network first, then Backend.

**Deploy order:** Network → UserData → Website (`--exclusively`) → Backend. Use `./deploy-all.sh` to run them in order. If Network fails with “export in use by SentinelNet-Backend”, run `./fix-network-export-conflict.sh` once (see HOW-TO-DEPLOY.md).

---

## Commands you’ll use (all from `infra/`)

- **First time on this machine:**  
  `pip install -r requirements.txt`  
  then  
  `cdk bootstrap`  
  (If `cdk` isn’t found, run `npm install -g aws-cdk` and open a new terminal.)

- **See what would be deployed (no changes):**  
  `cdk diff`  
  or  
  `cdk diff SentinelNet-Website`

- **Deploy one stack:**  
  `cdk deploy SentinelNet-Network --require-approval never`  
  (Same pattern for `SentinelNet-UserData` or `SentinelNet-Website` — and for Website you use `--exclusively`; see HOW-TO-DEPLOY.md.)

- **List stacks:**  
  `cdk list`

Don’t run `cdk deploy` without approval. The main repo README explains the workflow.

---

## Where to change what

- **VPC / subnets:** Edit `stacks/network_stack.py`.
- **DynamoDB / S3 for user data:** Edit `stacks/user_data_stack.py`.
- **Site, CloudFront, Cognito, profile API:** Edit `stacks/website_stack.py`. Profile API Lambda: `lambda/profile_api_py/handler.py`.
- **ECS/Fargate (Backend):** Edit `stacks/backend_stack.py`.
- **New stack:** Add a new file in `stacks/`, extend `Stack`, then in `app.py` instantiate it (e.g. `SomethingStack(app, "SentinelNet-Something", env=env)`).

---

## Live site

After a successful Website deploy, the output shows **WebsiteURL**. The current live URL is in the **main repo README** (e.g. `https://d7lsgn7zae54e.cloudfront.net/`). That’s the CloudFront URL; the React app and sign-in run there.

---

## If something breaks

- **“cdk: command not found”** → Run `npm install -g aws-cdk`, then open a new terminal.
- **“credentials could not be used” / “security token invalid”** → Set AWS credentials (see HOW-TO-DEPLOY.md or the main README).
- **“Cannot delete export … in use by SentinelNet-Website”** → You must deploy the Website stack with `--exclusively`. Don’t deploy UserData and Website together without that flag. See HOW-TO-DEPLOY.md.
- **“No such file or directory: frontend/dist”** → Someone needs to run `npm run build` in the `frontend/` folder before deploying the Website stack. The deploy uploads the contents of `frontend/dist/`.
- **“Cannot delete export … in use by SentinelNet-Backend”** (when deploying Network) → Backend is using an export from Network. Run `cdk destroy SentinelNet-Backend --force`, then `cdk deploy SentinelNet-Network --exclusively`, then `cdk deploy SentinelNet-Backend`. See HOW-TO-DEPLOY.md.

More detail: **HOW-TO-DEPLOY.md** and **DEPLOY.md**.
