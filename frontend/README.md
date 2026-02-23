# SentinelNet — Frontend

React + Vite app for the SOC executive dashboard. **Black/dark theme.** Scaffolding: main pages and layout only.

---

## What this folder is for

- **Dashboard UI** that clients see: KPIs, incidents, data views, settings, login.
- All **client-side** code: components, pages, routing, and (later) API calls to the backend.
- **Where to work:** Add or change pages in `src/pages/`, shared UI in `src/components/`, global styles in `src/index.css`.

---

## How it works

1. **Entry:** `index.html` loads `src/main.jsx`, which mounts the app and wraps it in React Router.
2. **Routing:** `src/App.jsx` defines routes: `/login` (standalone), then `/dashboard`, `/incidents`, `/data`, `/settings` inside a layout with a sidebar.
3. **Layout:** `src/components/Layout.jsx` renders the sidebar (SentinelNet + nav links) and an `<Outlet />` where the current page goes.
4. **Pages:** Each route points to a component in `src/pages/`. Those are placeholders; you’ll add real content and API calls here.
5. **Theme:** `src/index.css` sets CSS variables for the black colorway (`--bg`, `--surface`, `--text`, `--accent`, etc.). Use these in new components to stay consistent.

---

## Structure

| Path | Purpose |
|------|--------|
| `src/main.jsx` | App entry: React root + `BrowserRouter`. |
| `src/App.jsx` | Route definitions and which page loads where. |
| `src/index.css` | Global styles and dark theme variables. |
| `src/pages/` | One component per main screen (see [src/pages/README.md](src/pages/README.md)). |
| `src/components/` | Reusable UI (e.g. Layout); add buttons, cards, tables here (see [src/components/README.md](src/components/README.md)). |

---

## Authentication (Cognito)

Sign-in uses **AWS Cognito** (OIDC). Clicking **Sign in** redirects to your Cognito User Pool hosted UI; after login, users return to the app and can access **Dashboard**, **Incidents**, etc. Unauthenticated users who open those routes are redirected to Cognito to sign in.

- Config: `src/auth/config.js` (User Pool ID, Client ID, redirect/logout URLs).
- Optional env: copy `.env.example` to `.env` and set `VITE_REDIRECT_URI` and `VITE_COGNITO_DOMAIN` for production.
- In Cognito, add your app URL(s) to the app client **Allowed callback URLs** and **Allowed sign-out URLs**.

---

## Run locally

```bash
npm install
npm start
```

(or `npm run dev`). Opens at **http://localhost:3000**.

---

## Scripts

| Command | What it does |
|---------|----------------|
| `npm start` | Start dev server (Vite). |
| `npm run dev` | Same as `npm start`. |
| `npm run build` | Production build → `dist/`. |
| `npm run preview` | Serve the production build locally. |

---

## Where to do what

- **New page** → Add a file in `src/pages/` and a `<Route>` in `src/App.jsx`, plus a link in `Layout.jsx` if it should be in the sidebar.
- **New shared UI** → Add in `src/components/` and import where needed.
- **Change colors/fonts** → Edit `:root` in `src/index.css`.
- **Change nav items** → Edit the `nav` array in `src/components/Layout.jsx`.
