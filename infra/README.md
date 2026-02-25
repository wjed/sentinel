# SentinelNet — Infrastructure (AWS CDK)

This folder is the **AWS deployment** for SentinelNet. Everything that runs in AWS (the website, the database, the VPC, the profile API) is defined here as **CDK stacks** in **Python**. You don’t deploy by clicking in the AWS console; you run `cdk deploy` from this directory (and only if you have approval — see the main repo README).

---

## What’s in this folder

| Path | What it is |
|------|------------|
| **`app.py`** | The entry point. It creates all three stacks and passes the UserData stack to the Website stack so the profile API can use the DynamoDB table. **Don’t** rename the stack names in here (`SentinelNet-Website`, etc.) or deploys will get confused. |
| **`cdk.json`** | Tells the CDK CLI to run `app.py` when you run `cdk` commands. You usually don’t need to touch this. |
| **`requirements.txt`** | Python packages needed for CDK. Run `pip install -r requirements.txt` from this directory before your first `cdk` command. |
| **`stacks/`** | One Python file per stack. This is where you **edit** when you want to add or change AWS resources. |
| **`lambda/`** | Lambda function code that gets deployed by the Website stack (the profile API). **`profile_api_py/`** = Python handler for GET/PATCH profile. |
| **`HOW-TO-DEPLOY.md`** | Step-by-step deploy instructions (credentials, build frontend, deploy order). Use this when you’re actually deploying. |
| **`DEPLOY.md`** | Extra deploy notes (e.g. not committing keys, rotating if leaked). |

You run **all** `cdk` commands from **this directory** (`infra/`). Not from the repo root. Not from `stacks/`. From `infra/`.

---

## The three stacks (what each one does)

| Stack name | File | What it creates in AWS |
|------------|------|-------------------------|
| **SentinelNet-Network** | `stacks/network_stack.py` | A **VPC** with public and private subnets (for the center/backend team). Outputs VPC ID and subnet IDs so other stuff can use them later. |
| **SentinelNet-UserData** | `stacks/user_data_stack.py` | A **DynamoDB table** (user profiles: display name, avatar icon, job, bio) and an **S3 bucket** (for future use). No Lambda here — just storage. |
| **SentinelNet-Website** | `stacks/website_stack.py` | The **live site**: S3 bucket for the built React app, **CloudFront** so people hit a URL like `https://xxxxx.cloudfront.net`, **Cognito** (user pool + app client) for sign-in, and a **profile API** (Lambda + API Gateway) that reads/writes the UserData table. Also writes **`config.json`** to the site so the frontend knows the Cognito pool and profile API URL. |

**Dependency:** The Website stack uses the UserData stack (it needs the DynamoDB table for the profile API). So UserData has to exist before Website can use it. Network is independent.

**Deploy order** (when you have approval): Network → UserData → Website. And deploy Website with `--exclusively` so CDK doesn’t try to update UserData and hit an export error (see HOW-TO-DEPLOY.md).

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

- **Add or change something in the VPC (subnets, etc.):** Edit `stacks/network_stack.py`.
- **Add or change the DynamoDB table or S3 bucket for user data:** Edit `stacks/user_data_stack.py`.
- **Add or change the site, CloudFront, Cognito, or the profile API:** Edit `stacks/website_stack.py`. The profile API Lambda code lives in `lambda/profile_api_py/handler.py` — change that file if you need to change what the profile API does (e.g. new fields, new endpoints).
- **Add a whole new stack:** Create a new file in `stacks/` (e.g. `something_stack.py`), define a class that extends `Stack`, then in `app.py` import it and add e.g. `SomethingStack(app, "SentinelNet-Something", env=env)`.

---

## Live site

After a successful Website deploy, the output shows **WebsiteURL**. The current live URL is in the **main repo README** (e.g. `https://d7lsgn7zae54e.cloudfront.net/`). That’s the CloudFront URL; the React app and sign-in run there.

---

## If something breaks

- **“cdk: command not found”** → Run `npm install -g aws-cdk`, then open a new terminal.
- **“credentials could not be used” / “security token invalid”** → Set AWS credentials (see HOW-TO-DEPLOY.md or the main README).
- **“Cannot delete export … in use by SentinelNet-Website”** → You must deploy the Website stack with `--exclusively`. Don’t deploy UserData and Website together without that flag. See HOW-TO-DEPLOY.md.
- **“No such file or directory: frontend/dist”** → Someone needs to run `npm run build` in the `frontend/` folder before deploying the Website stack. The deploy uploads the contents of `frontend/dist/`.

More detail: **HOW-TO-DEPLOY.md** and **DEPLOY.md**.
