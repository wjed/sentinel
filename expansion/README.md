# Expansion

**What this folder is for:** Extra modules or experiments that don’t clearly belong in `frontend/`, `backend/`, or `infra/` yet.

---

## When to use it

- **New top-level area** — e.g. CLI tools, migration scripts, or a separate microservice that you’re not ready to put under `backend/` or `infra/`.
- **Experiments** — Proof-of-concept code that might later move into frontend/backend/infra.
- **Shared tooling** — Scripts or config that multiple teams use (e.g. codegen, local dev helpers).

---

## Where to do what

- **Add a new subfolder** (e.g. `expansion/scripts/` or `expansion/cli/`) with its own README explaining what it is and how to run it.
- **Move code out** — When something stabilizes, move it into the right place (frontend, backend, or infra) and delete or trim the copy here.

This keeps the main tree clean while you grow the project.
