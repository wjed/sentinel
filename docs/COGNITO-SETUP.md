# Set up sign-in with AWS Cognito (from scratch)

Use this guide to add sign-in to SentinelNet using AWS Cognito Hosted UI. Do the steps in order.

---

## 1. Create a user pool (if you don’t have one)

1. In **AWS Console** go to **Amazon Cognito** → **User pools** → **Create user pool**.
2. **Sign-in options**: choose **Email** (or Email and username, depending on what you want). Click Next.
3. **Password policy**: keep defaults or adjust. **Multi-factor**: optional. Next.
4. **Sign-up experience**: keep self-registration if you want “Create account”. Next.
5. **Message delivery**: choose **Send email with Cognito** (or configure SES later). Next.
6. **Integrate your app**: leave as “Use the Cognito Hosted UI” / “Federated identity provider sign-in” for now. Next.
7. **Configure security requirements**: defaults are fine. Next.
8. **App client**: we’ll add this in the next section; you can skip or create a placeholder. Next.
9. **Review and create** → Create pool.
10. Note the **User pool ID** (e.g. `us-east-1_XXXXXXXX`) and **Region**.

---

## 2. Add a domain for Hosted UI

1. In your user pool, go to **Branding** → **Domain** (or **App integration** → **Domain**).
2. Under **Cognito domain**, type a prefix (e.g. `sentinelnet-auth`). The full domain will be `sentinelnet-auth.auth.us-east-1.amazoncognito.com`.
3. **Save**. Note the full domain URL (you’ll use it in the app for logout).

---

## 3. Create an app client for the web app

1. In the user pool go to **Applications** → **App clients** → **Create app client**.
2. **App type**: choose **Public client** (or **Web client** / “Public client for frontend”).
3. **App client name**: e.g. `SentinelNet`.
4. **Authentication flows**: enable **ALLOW_USER_PASSWORD_AUTH** only if you need it; for Hosted UI you don’t need it. What matters next is the Hosted UI config.
5. Do **not** generate a client secret (public client).
6. Create the app client. Note the **Client ID**.

---

## 4. Configure Hosted UI for the app client

1. Go to **Applications** → **App clients** → open **SentinelNet**.
2. Open **Edit managed login pages configuration** (or the Hosted UI / OAuth section for this app client).
3. Set:

   **Allowed callback URLs** (one per line; use the exact URLs your app runs on):

   - `https://sentinelnetsolutions.com/`
   - `https://sentinelnetsolutions.com`
   - `https://d1zrndjozdwm01.cloudfront.net/` (if you use CloudFront)
   - `http://localhost:3000/` (for local dev)

   **Default redirect URL:** e.g. `https://sentinelnetsolutions.com/`

   **Allowed sign-out URLs:** same list as callback URLs.

   **Identity providers:** leave **Cognito user pool** checked.

   **OAuth 2.0 grant types:** check **Authorization code grant**.

   **OpenID Connect scopes:** check **OpenID**, **Email**, and **Phone** (or at least **OpenID** and **Email**).

4. **Save**.

---

## 5. App client attribute permissions

1. In **App clients** → **SentinelNet** → **Edit** (main app client settings, not managed login).
2. Under **Attribute read and write permissions**, ensure the app has **read** access to any attribute you use in scopes (e.g. **email**, **email_verified**; if you use **phone** scope, **phone_number**, **phone_number_verified**).
3. Save.

---

## 6. Add auth back into the frontend

The repo currently has auth **removed** so the site runs without sign-in. To turn it back on:

1. **Restore the auth stack**
   - Wrap the app in `AuthProvider` again in `frontend/src/main.jsx` using `react-oidc-context` and an OIDC config that uses your **User pool ID**, **Client ID**, **redirect_uri** (e.g. `https://sentinelnetsolutions.com/`), and **Cognito domain** for logout.
   - Point `authority` to the Cognito issuer:  
     `https://cognito-idp.<region>.amazonaws.com/<user-pool-id>`
   - Use **one** consistent `redirect_uri` (with or without trailing slash) and the **exact** same value in Cognito’s Allowed callback URLs.

2. **Re-enable protected routes**
   - In `App.jsx`, wrap dashboard (and other app) routes in `ProtectedRoute` again so unauthenticated users are redirected to sign-in.

3. **Restore TopNav / Login / Account**
   - TopNav: show “Sign in” when not authenticated and user email + “Sign out” when authenticated (using the same OIDC provider and logout URL from your Cognito domain).
   - Login page: trigger redirect to Cognito Hosted UI; after login, redirect to dashboard.
   - Account page: show user profile from the OIDC user and a sign-out button.

4. **Avoid token 400**
   - Use the **same** `redirect_uri` in both the authorize and token requests (e.g. always `https://sentinelnetsolutions.com/` with trailing slash).
   - Do **not** use React StrictMode around the auth provider if it causes the callback to run twice (and the token exchange to get a 400).

5. **Optional:** keep a single `frontend/src/auth/config.js` that reads `VITE_COGNITO_*` env vars (user pool ID, client ID, redirect URI, Cognito domain) so you can switch between local and production without code changes.

---

## Checklist

- [ ] User pool created; User pool ID and region noted.
- [ ] Cognito domain created; domain URL noted.
- [ ] App client created as **Public client**; Client ID noted.
- [ ] **Edit managed login pages configuration**: callback URLs, sign-out URLs, **Authorization code grant**, scopes (openid, email, phone).
- [ ] App client attribute read permissions set for email (and phone if used).
- [ ] Frontend updated with AuthProvider, same redirect_uri as in Cognito, protected routes, and Hosted UI sign-in/sign-out.

Once this is done, “Sign in” on the site will send users to Cognito and back to your app after login.
