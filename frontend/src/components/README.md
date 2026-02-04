# Components (`src/components/`)

Reusable UI pieces used across the app. **Layout** is the only one so far.

---

## What’s here

| Component | Purpose |
|-----------|--------|
| **`Layout.jsx`** | App shell: sidebar (SentinelNet + nav links) and main area where the current page renders via `<Outlet />`. Used for all routes except `/login`. |

---

## Where to do what

- **Change sidebar links or styling** → Edit `Layout.jsx`. Nav items are in the `nav` array.
- **Add a shared component** (e.g. `Button`, `Card`, `DataTable`) → Create a new file here and import it in the pages that need it.
- **Keep the black theme** → Use inline `style={{ ... }}` with `var(--surface)`, `var(--border)`, `var(--accent)`, etc., or add a CSS class that uses those variables from `index.css`.

Components here should stay presentational where possible; put data fetching and business logic in pages or hooks.
