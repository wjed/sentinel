# SentinelNet

A small web app: marketing pages (Home, Product, Pricing) + a dashboard you sign into with Cognito. It runs on AWS (S3 + CloudFront). JMU university project.

---

## What’s in this repo

| Folder | What it is |
|--------|------------|
| **frontend/** | The website. React app. You edit code here. |
| **infra/** | AWS deployment (CDK). One command deploys the site. |

That’s it. No backend server. Sign-in is AWS Cognito.

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

## Put the site on the internet (deploy)

You need: **Node.js**, **npm**, **Python 3**, and **AWS credentials** (access key + secret).

### First time only (once per computer)

Open a terminal at the **repo root**. Run:

```bash
cd infra
pip install -r requirements.txt
cdk bootstrap
cd ..
```

(If `cdk` says “command not found”, run: `npm install -g aws-cdk` and open a new terminal.)

### Every time you want to deploy

**Step 1 — Set AWS credentials** (same terminal you’ll use for the next steps).

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

**Step 2 — Build the site**

```bash
cd frontend
npm install
npm run build
cd ..
```

**Step 3 — Deploy**

```bash
cd infra
cdk deploy SentinelNet-Website --require-approval never
cd ..
```

When it finishes, the terminal prints **WebsiteURL** (e.g. `https://xxxxx.cloudfront.net`). That’s your live site. Share that link. Sign-in works because the stack creates Cognito and wires it to that URL.

---

## Checklist (so you don’t forget a step)

- [ ] AWS credentials are set in the terminal
- [ ] You ran `cd frontend` → `npm install` → `npm run build` → `cd ..`
- [ ] First time only: you ran `cd infra` → `pip install -r requirements.txt` → `cdk bootstrap`
- [ ] You ran `cd infra` → `cdk deploy SentinelNet-Website --require-approval never`
- [ ] You copied **WebsiteURL** from the output

---

## Something broke?

- **“security token invalid”** → Set the AWS credentials again (Step 1).
- **“No such file or directory: frontend/dist”** → You didn’t run `npm run build` in `frontend`. Do Step 2.
- **“cdk: command not found”** → Run `npm install -g aws-cdk`, then open a new terminal.

More detail and other issues: **infra/HOW-TO-DEPLOY.md**.
