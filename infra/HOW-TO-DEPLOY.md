# Deploy SentinelNet to CloudFront

One stack. Build the frontend, deploy, share the CloudFront URL. People sign in with Cognito.

---

## What you need

- **Node.js** (LTS) and **npm**
- **Python 3** (3.8+)
- **CDK CLI:** `npm install -g aws-cdk`
- **AWS credentials** (access key + secret) for the account that will hold the stack

---

## First-time setup (once per machine)

From the **repo root**:

```bash
cd infra
pip install -r requirements.txt
cdk bootstrap
cd ..
```

---

## Deploy (every time you want to push an update)

**1. Set AWS credentials** (same terminal you’ll use below).

Mac/Linux / Git Bash:

```bash
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
export AWS_DEFAULT_REGION=us-east-1
```

Windows PowerShell:

```powershell
$env:AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
$env:AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"
$env:AWS_DEFAULT_REGION="us-east-1"
```

**2. Build the frontend**

```bash
cd frontend
npm install
npm run build
cd ..
```

**3. Deploy the website stack**

```bash
cd infra
cdk deploy SentinelNet-Website --require-approval never
cd ..
```

At the end you’ll see **WebsiteURL** (e.g. `https://xxxxx.cloudfront.net`). That’s the live site.

**4. (Optional) See changes right away** — run once, using the **DistributionId** from the deploy output:

```bash
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
```

---

## Sign-in (Cognito)

The app uses **Cognito** for sign-in. The URL people use is the **CloudFront URL** from the deploy output.

**In Cognito** (User pool → App client → Edit managed login pages configuration):

- **Allowed callback URLs:** add your CloudFront URL with a trailing slash, e.g. `https://xxxxx.cloudfront.net/`
- **Allowed sign-out URLs:** same
- **OAuth 2.0 grant types:** **Authorization code grant**
- **OpenID Connect scopes:** **OpenID**, **Email** (and **Phone** if you use it)

**In `frontend/.env`** (optional, for a fixed production URL):

- `VITE_REDIRECT_URI=https://xxxxx.cloudfront.net/`  
  (use your real CloudFront URL)

Then rebuild and redeploy so the app and Cognito use the same URL.

---

## Quick checklist

- [ ] AWS credentials set
- [ ] `cd frontend` → `npm install` → `npm run build` → `cd ..`
- [ ] First time only: `cd infra` → `pip install -r requirements.txt` → `cdk bootstrap` → `cd ..`
- [ ] `cd infra` → `cdk deploy SentinelNet-Website --require-approval never`
- [ ] Use **WebsiteURL** from the output; add that URL (with `/`) to Cognito callback and sign-out URLs

---

## Removing old stacks from AWS (optional)

If you previously deployed the old placeholder stacks (SentinelNet-Network, SentinelNet-Identity, SentinelNet-Data, SentinelNet-Backend), they’re no longer in the codebase but still exist in your AWS account. To delete them:

```bash
cd infra
cdk destroy SentinelNet-Network SentinelNet-Identity SentinelNet-Data SentinelNet-Backend --force
```

Only do this if you want to clean up those stacks. Don’t run `cdk destroy SentinelNet-Website` or you’ll remove the live site.

---

## If something goes wrong

- **“The security token included in the request is invalid”** — Set AWS credentials again (Step 1).
- **“No such file or directory: frontend/dist”** — Run `npm run build` in `frontend` first.
- **“cdk: command not found”** — Run `npm install -g aws-cdk` and open a new terminal.
- **Sign-in 404 or “user pool does not exist”** — Use the correct Cognito user pool in the app (see `frontend/.env.example` for `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_CLIENT_ID`). Clean build: `rm -rf frontend/dist` then `npm run build`, then deploy again.
- **Sign-in “Something went wrong”** — Add the exact CloudFront URL (with trailing slash) to Cognito **Allowed callback URLs** and **Allowed sign-out URLs**.
