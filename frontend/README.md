# SentinelNet — Frontend

React + Vite app. Dark theme. Marketing pages (Home, Product, Pricing, About) plus a dashboard you sign into with Cognito. **All client-side:** no backend in this folder; API calls go to the profile API (and later other backends) that the infra team deploys.

---

## What’s in this folder

| Folder / file | What it is |
|---------------|------------|
| **`src/`** | All app source code. |
| **`src/main.jsx`** | Entry point: loads `/config.json` (Cognito URLs from deploy), then mounts the app with React Router + auth. |
| **`src/App.jsx`** | All routes. Defines which URL shows which page. |
| **`src/index.css`** | Global styles and dark-theme CSS variables (`--bg`, `--accent`, etc.). Use these so the app looks consistent. |
| **`src/pages/`** | One React component per screen. Home, Product, Pricing, About, Login, Dashboard, Incidents, Alerts, Assets, Reports, Settings, Account, etc. |
| **`src/components/`** | Reusable UI: **TopNav** (logo + nav + Console dropdown + Account dropdown), **Footer**, **PublicLayout** (TopNav + page content + Footer), **ProtectedRoute** (redirects to login if not signed in), **DevAdvice** (the “How to build this” boxes on console pages). |
| **`src/auth/`** | Cognito sign-in: **config.js** (pool ID, client ID, redirect URLs — uses `config.json` when deployed), **resolvedConfig.js** (runtime config from `config.json`), **signOut.js**. |
| **`src/api/`** | API clients. **profile.js** talks to the profile API (get profile, update profile — display name, avatar icon, job, bio). |
| **`index.html`** | The one HTML file. Loads `main.jsx`. |
| **`package.json`** | Dependencies and scripts. **Do not** delete or rename scripts; the deploy process runs `npm run build`. |

There is **no** `Layout.jsx` with a sidebar. The layout is: **TopNav** at the top (with Console and Account dropdowns when you’re signed in), then the current page, then **Footer**. All of that is in **PublicLayout**, which wraps every route except `/login`.

---

## Routes (what lives where)

- **`/`** — Home  
- **`/product`** — Product  
- **`/pricing`** — Pricing  
- **`/about`** — About  
- **`/login`** — Sign-in page (redirects to Cognito Hosted UI)  
- **`/dashboard`** — Dashboard (protected)  
- **`/incidents`** — Incidents list (protected)  
- **`/incidents/:id`** — Incident detail (protected)  
- **`/alerts`** — Alerts (protected)  
- **`/assets`** — Assets (protected)  
- **`/reports`** — Reports (protected)  
- **`/settings`** — Settings (protected)  
- **`/account`** — Account / profile (protected; edit display name, icon, job, bio)

Protected = you must be signed in; otherwise you’re sent to login.

---

## Auth (Cognito)

Sign-in uses **AWS Cognito** (OIDC). **Sign in** in the nav sends users to the Cognito Hosted UI; after login they come back to the app. The app gets pool ID, client ID, and callback URL from **`/config.json`** when deployed (CDK writes that file). For local dev it can use fallbacks in `src/auth/config.js` or env vars.

- **Config:** `src/auth/config.js` — authority, clientId, redirectUri, profile API URL, etc.  
- **Runtime:** `main.jsx` fetches `/config.json` and calls `setResolvedConfig()`; `config.js` reads that so the app uses the right Cognito pool and profile API URL after deploy.

---

## Run locally

From the **`frontend/`** directory (this folder):

```bash
npm install
npm run dev
```

(or `npm start` — same thing). Opens at **http://localhost:3000**. Sign-in will only work if Cognito is set up and the callback URL includes `http://localhost:3000` (or whatever you’re using).

---

## Scripts

| Command | What it does |
|---------|----------------|
| `npm install` | Install dependencies. Run this first. |
| `npm run dev` or `npm start` | Start the Vite dev server. |
| `npm run build` | Production build → **`dist/`**. **You must run this before someone deploys** (see main repo README). |
| `npm run preview` | Serve the `dist/` build locally so you can test the production build. |

---

## Where to change things

- **Add a new page** — Create a file in `src/pages/` (e.g. `MyPage.jsx`). In `src/App.jsx`, add a `<Route>` and, if it should be behind login, wrap it in `<ProtectedRoute>`. If it should be in the Console menu, add it to the `consoleNavLinks` array in `src/components/TopNav.jsx`.
- **Add or change nav links** — Edit `src/components/TopNav.jsx`: `publicNavLinks` (Home, Product, etc.), `consoleNavLinks` (Dashboard, Incidents, etc.), or `accountNavLinks` (Account, Settings).
- **Add reusable UI** — Put it in `src/components/` and import it where needed.
- **Change colors / fonts** — Edit `:root` and other rules in `src/index.css`.
- **Call a new API** — Add a client in `src/api/` (like `profile.js`) and use it from the page or component that needs it.

---

## “How to build this” boxes

Console pages (Dashboard, Incidents, Alerts, Assets, Reports, Settings, Incident detail) each have a **DevAdvice** section at the bottom with tips for the team (e.g. “use this table, this API”). The component is `src/components/DevAdvice.jsx`; each page passes an `items` array of strings. Edit those arrays in the page files to change the advice.
