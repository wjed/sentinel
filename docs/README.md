# SentinelNet — Documentation

**What this folder is for:** Design docs, architecture notes, and any written explanation of how the system works and how teams work together.

---

## What to put here

- **Architecture overview** — How frontend, backend, and infra connect; data flow and security boundaries.
- **SOC workflows** — How incidents move from ingestion → correlation → escalation → dashboard.
- **API contracts** — Endpoints, request/response shapes (or links to OpenAPI/specs if you keep them elsewhere).
- **Team handoffs** — Who owns what, interfaces between frontend/backend/infra, and how to run things locally or in a shared env.

---

## Where to do what

- **Explain the system** → Add a markdown file (e.g. `architecture.md`, `workflows.md`) and link to it from the root README or from team READMEs.
- **Diagrams** → Add images or Mermaid snippets in markdown so they live in the repo and stay next to the docs.

Keeping everything here makes it easy for new team members and graders to find “how it works” in one place.
