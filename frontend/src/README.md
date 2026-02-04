# Frontend source (`src/`)

This is the **source code** for the SentinelNet dashboard. Everything the browser runs lives here (or is built from here).

---

## What’s in here

| File / folder | Purpose |
|---------------|--------|
| **`main.jsx`** | Entry point. Renders the app into `#root`, wraps it in `BrowserRouter`. |
| **`App.jsx`** | Root component. Defines all routes (Dashboard, Incidents, Data, Settings, Login) and which component handles each. |
| **`index.css`** | Global styles and **black theme** CSS variables. All pages inherit this. |
| **`pages/`** | One React component per main screen. See [pages/README.md](pages/README.md). |
| **`components/`** | Reusable UI (Layout, etc.). See [components/README.md](components/README.md). |

---

## How routing works

- **`/`** → Redirects to `/dashboard`.
- **`/login`** → Renders `Login` (no sidebar).
- **`/dashboard`**, **`/incidents`**, **`/data`**, **`/settings`** → Rendered inside `Layout` (sidebar + content). Each path maps to a component in `pages/`.
- **Any other path** → Redirects to `/dashboard`.

To add a page: create a component in `pages/`, add `<Route path="your-path" element={<YourPage />} />` in `App.jsx`, and optionally add a link in `Layout.jsx`.
