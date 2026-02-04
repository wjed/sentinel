# SentinelNet

**Cloud-native, B2B-style Security Operations Center (SOC) platform** — university project for simulating real-world SOC workflows: ingesting security data, processing and correlating it, escalating incidents, and exposing an executive dashboard to clients.

---

## This repository does not deploy anything yet

- **This is scaffolding only.** No AWS resources are created or deployed.
- There is **no runnable `cdk deploy` configuration**; the app is not set up for deployment.
- The project is **safe to open and use without AWS credentials**.
- Stacks are **intentionally empty** placeholder classes for structure and collaboration.

---

## Project structure

```
sentinel-net/
├── app.py                 # CDK app entry; instantiates placeholder stacks only
├── cdk.json               # CDK project config (no deployment context)
├── requirements.txt       # Python dependencies for CDK
├── stacks/                # Stack definitions by responsibility
│   ├── network_stack.py   # Network team
│   ├── identity_stack.py  # Identity team
│   ├── data_stack.py      # Data team
│   └── backend_stack.py   # Backend team
├── shared/                # Shared module for all teams
│   ├── constants.py       # Common constants and naming
│   └── constructs.py      # Placeholder for reusable constructs
├── docs/                  # Documentation and design notes
└── README.md              # This file
```

---

## Where each team will work

| Team      | Directory / stack           | Future focus (conceptual)                    |
|-----------|-----------------------------|----------------------------------------------|
| **Network**  | `stacks/network_stack.py`   | VPC, subnets, security groups, connectivity  |
| **Identity** | `stacks/identity_stack.py`  | IAM roles, policies, authentication         |
| **Data**     | `stacks/data_stack.py`      | Data ingestion, storage, pipelines          |
| **Backend**  | `stacks/backend_stack.py`   | Compute, APIs, orchestration                 |

All teams can use and extend **`shared/`** (constants and common constructs) and add design docs under **`docs/`**.

---

## Getting started (read-only / no deploy)

1. **Clone and open** the repo — no AWS account or credentials required.
2. **Optional:** Create a virtual environment and install dependencies for IDE support:
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. **Read the code:** Start with `app.py`, then the stack files in `stacks/` and `shared/`.
4. **Do not run** `cdk deploy` — stacks are empty and the project is not configured for deployment.

---

## For students new to CDK and AWS

- Each stack is a **class** that inherits from `Stack`; later, resources will be added inside `__init__`.
- **Stacks** group related AWS resources; **constructs** are reusable building blocks.
- This repo focuses on **layout and ownership** so multiple teams can work in parallel without conflicts.
- When the course allows, deployment will be introduced separately; until then, treat this as structure-only.

---

## License and course

Used for the SentinelNet university project. See your course materials for licensing and submission details.
