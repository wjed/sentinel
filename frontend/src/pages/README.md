# Pages (`src/pages/`)

Each file here is a **page** — a top-level screen that appears when the user hits a route.

---

## What each page is for

| File | Route | Purpose |
|------|--------|--------|
| **`Dashboard.jsx`** | `/dashboard` | Executive overview: key metrics, alerts, status at a glance. Add charts and KPIs here. |
| **`Incidents.jsx`** | `/incidents` | List, triage, and escalate security incidents. Add tables, filters, and workflow actions. |
| **`Data.jsx`** | `/data` | Security data ingestion, logs, pipeline status. Add data sources and log viewers. |
| **`Settings.jsx`** | `/settings` | Platform and account configuration. Add forms and preferences. |
| **`Login.jsx`** | `/login` | Sign-in (no sidebar). Add auth (e.g. OAuth / SSO) when ready. |

---

## Where to do what

- **Change what a page shows** → Edit the corresponding `.jsx` file.
- **Add a new page** → Create a new file (e.g. `Alerts.jsx`), export a default component, then in `App.jsx` add a route and in `Layout.jsx` add a nav link if it should be in the sidebar.
- **Keep the dark theme** → Use the `page` class and CSS variables from `index.css` (e.g. `var(--text)`, `var(--surface)`).

All of these are placeholders; replace the content with real UI and API calls as you build.
