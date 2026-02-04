# Backend API (`api/`)

**What this folder is for:** The HTTP surface of the backend — routes, handlers, and request/response shapes.

---

## Purpose

- Define **routes** (e.g. `/dashboard/kpis`, `/incidents`, `/data/sources`).
- **Handle** requests: parse body/query, validate, call into `services/`, return JSON (or error).
- Optionally: **auth** (check token/session before running handler).

---

## Where to do what

- **New route** → Add a handler function and register it on your app/router (Flask, FastAPI, Express, etc.). Keep handlers thin: validate input, call `services/`, format response.
- **Request/response models** → Define them here (or in a `models.py` / `schemas.js` in this folder) so the API contract is clear.
- **Auth** → Add middleware or a wrapper that checks credentials and attaches user/tenant to the request; use it on protected routes.

This folder should **not** contain core business logic; that lives in `services/`. The API layer only translates HTTP ↔ services.
