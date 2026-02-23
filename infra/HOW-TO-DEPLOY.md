# How to deploy SentinelNet (step-by-step for the team)

Use this when you need to put the latest website on CloudFront. Follow the steps in order. Don’t skip any.

---

## One account, one site — don’t delete anything

We all deploy to **the same AWS account**. When you run the deploy steps below, you’re **updating** the shared SentinelNet site (new frontend build goes to S3 and CloudFront). You are **not** creating a separate site or your own stack.

- **`cdk deploy SentinelNet-Website`** — Safe. This only updates the existing stack (uploads new files, refreshes the cache). Use this whenever you want to push the latest site.
- **Do NOT run `cdk destroy`** or delete the stack in the AWS Console. That would remove the site for everyone. If you’re not sure, stick to the commands in this doc.

---

## What you need before you start

- **Git** — so you can clone the repo (you probably have it).
- **Node.js and npm** — for (1) building the frontend and (2) running the `cdk` command. Install from https://nodejs.org (LTS). After installing, open a new terminal and run `node -v` and `npm -v`; you should see version numbers.
- **Python 3** — for the CDK app (infra code). Install from https://python.org or your package manager. Run `python --version` or `python3 --version`; you should see 3.8 or higher.
- **CDK CLI** — so the `cdk` command works. After Node is installed, run: `npm install -g aws-cdk`. Then run `cdk --version`; you should see a version number.
- **AWS credentials** — Ask the person who set up the project for an **Access Key ID** and **Secret Access Key**. Do **not** put them in the repo or in a file you commit. You’ll paste them into your terminal only (see below).

---

## Step 1: Clone the repo (if you don’t have it yet)

Open a terminal (PowerShell, Command Prompt, or Git Bash on Windows; Terminal on Mac/Linux).

Go to the folder where you keep projects, then run:

```bash
git clone https://github.com/wjed/sentinel.git
cd sentinel
```

(If you already have the repo, just `cd` into the repo folder and run `git pull` so you have the latest code.)

---

## Step 2: Set your AWS credentials

**You must do this in the same terminal you’ll use for the rest of the steps.** If you close the terminal, you’ll have to do this again.

Replace `YOUR_ACCESS_KEY_HERE` and `YOUR_SECRET_KEY_HERE` with the real values you were given. Then run these three lines, one at a time:

**On Mac/Linux / Git Bash:**

```bash
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_HERE
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY_HERE
export AWS_DEFAULT_REGION=us-east-1
```

**On Windows (PowerShell):**

```powershell
$env:AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY_HERE"
$env:AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY_HERE"
$env:AWS_DEFAULT_REGION="us-east-1"
```

**On Windows (Command Prompt):**

```cmd
set AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_HERE
set AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY_HERE
set AWS_DEFAULT_REGION=us-east-1
```

Nothing should print. If you get an error, check that you didn’t leave a space around the `=` and that the keys are in quotes (PowerShell) or have no spaces (Bash).

---

## Step 3: Build the frontend

**You have to do this every time before you deploy.** If you don’t, the site won’t show your latest changes.

Make sure you’re in the **repo root** (the folder that contains `frontend` and `infra`). Then run these commands **one at a time**:

```bash
cd frontend
```

```bash
npm install
```

(Wait for it to finish. It might take a minute.)

```bash
npm run build
```

(You should see “built in … ms” at the end.)

```bash
cd ..
```

You’re back in the repo root. The folder `frontend/dist` now has the built website. The next step will upload that folder.

---

## Step 4: First time only — install Python deps and bootstrap

**Only do this the very first time you deploy** (or on a new machine). If you’ve already deployed from this machine before, skip to Step 5.

From the **repo root**, run:

```bash
cd infra
```

```bash
pip install -r requirements.txt
```

(If that fails, try `pip3 install -r requirements.txt`.)

```bash
cdk bootstrap
```

(Wait for it to finish. You might see a lot of output. That’s normal.)

```bash
cd ..
```

You’re back in the repo root. You **don’t** need to run `cdk bootstrap` again for future deploys.

---

## Step 5: Deploy the website

From the **repo root**, run:

```bash
cd infra
```

```bash
cdk deploy SentinelNet-Website --require-approval never
```

Wait. It can take a few minutes. You’ll see a list of resources and then “✅ SentinelNet-Website” when it’s done.

At the end you’ll see **outputs** like:

- **WebsiteURL** — that’s the link to the site (e.g. `https://d1zrndjozdwm01.cloudfront.net`).
- **DistributionDomainName** — same thing without `https://`.

Open that URL in your browser. The site might take 1–2 minutes to update because of caching.

---

## Deploying again later (after you’ve done it once)

Every time you want to push a new version of the site:

1. **Pull latest code** (if someone else changed it):  
   From repo root: `git pull`
2. **Set AWS credentials** (Step 2) in your terminal if you opened a new one.
3. **Build the frontend** (Step 3):  
   `cd frontend` → `npm install` → `npm run build` → `cd ..`
4. **Deploy** (Step 5 only, skip bootstrap):  
   `cd infra` → `cdk deploy SentinelNet-Website --require-approval never`

You do **not** need to run `cdk bootstrap` again.

---

## Sign-in: "Something went wrong" on the Cognito page

If clicking **Sign in** takes you to a Cognito page that says *"Something went wrong / An error was encountered with the requested page"*, Cognito is rejecting the request because the **callback URL** isn't allowed.

**Fix (in AWS Console):**

1. Open **Amazon Cognito** → **User pools** → select the SentinelNet pool → **App integration**.
2. Under **App client list**, open the **SentinelNet** app client.
3. Under **Hosted UI**, find **Allowed callback URLs**.
4. Add the **exact** URL your app runs on, with **no trailing slash**:
   - Local: `http://localhost:3000`
   - Production: your CloudFront URL from deploy outputs, e.g. `https://d1zrndjozdwm01.cloudfront.net`
5. In **Allowed sign-out URLs**, add the same URL(s).
6. Save.

The app sends `redirect_uri` = that URL (no trailing slash). If the URL in Cognito doesn't match exactly, Cognito shows the generic error. For production builds, set `VITE_REDIRECT_URI` in `.env` to your CloudFront URL so it's fixed at build time.

---

## If something goes wrong

- **“npm: command not found”** — Install Node.js from https://nodejs.org and open a **new** terminal.
- **“python” or “pip: command not found”** — Install Python and make sure “Add to PATH” was checked. Try `python3` and `pip3` instead of `python` and `pip`.
- **“cdk: command not found”** — Install the CDK CLI: run `npm install -g aws-cdk`. Open a new terminal and try again from the `infra` folder.
- **“The security token included in the request is invalid”** — Your AWS credentials are wrong or expired. Get new ones and do Step 2 again.
- **“No such file or directory: frontend/dist”** — You skipped Step 3. Go back and run `npm run build` inside the `frontend` folder.

---

## Quick checklist (copy this)

- [ ] Repo cloned / pulled
- [ ] AWS credentials set in this terminal (Step 2)
- [ ] `cd frontend` → `npm install` → `npm run build` → `cd ..`
- [ ] First time only: `cd infra` → `pip install -r requirements.txt` → `cdk bootstrap` → `cd ..`
- [ ] `cd infra` → `cdk deploy SentinelNet-Website --require-approval never`
- [ ] Open the URL from the outputs in your browser

---

**Live site (current):** https://d1zrndjozdwm01.cloudfront.net
