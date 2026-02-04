# SentinelNet — Infrastructure (CDK)

AWS CDK app: stacks and shared constructs. **Scaffolding only** — no deployment. This folder defines (in code) how the SOC platform would run on AWS when you’re ready to deploy.

---

## What this folder is for

- **Stacks:** Logical groups of AWS resources (Network, Identity, Data, Backend). Each stack is a Python class; right now they’re empty.
- **Shared:** Constants and reusable constructs used by more than one stack.
- **Where to work:** Edit stack files in `stacks/`, shared code in `shared/`. Run any CDK commands **from this directory** (`infra/`).

---

## How it works

1. **`app.py`** — CDK app entry. It creates the four stacks (Network, Identity, Data, Backend) and calls `app.synth()`. No account/region is set, so this is not set up for real deployment.
2. **`cdk.json`** — Tells CDK to run `python app.py` when you run `cdk` from this folder.
3. **`stacks/`** — One file per stack. Each stack class inherits from `Stack` and, in a real project, would instantiate AWS constructs (VPC, roles, S3, Lambda, etc.). For now they’re empty.
4. **`shared/`** — `constants.py` (e.g. app name, stack IDs) and `constructs.py` (placeholder for reusable CDK constructs).

When you run `cdk synth` from `infra/`, CDK generates CloudFormation templates; it does **not** deploy them unless you explicitly run `cdk deploy` (and the project is not configured for that yet).

---

## Structure

| Path | Purpose |
|------|--------|
| **`app.py`** | App entry; instantiates all stacks. |
| **`cdk.json`** | CDK config; app command and context. |
| **`requirements.txt`** | Python deps for CDK (`aws-cdk-lib`, `constructs`). |
| **`stacks/`** | Network, Identity, Data, Backend stacks. See [stacks/README.md](stacks/README.md). |
| **`shared/`** | Constants and constructs. See [shared/README.md](shared/README.md). |

---

## Where to do what

- **Add a resource to a stack** (when allowed) → Open the right file in `stacks/`, add constructs in the stack’s `__init__`. Use `shared.constants` for naming.
- **Add a new stack** → Create a new file in `stacks/`, define a class that extends `Stack`, then instantiate it in `app.py`.
- **Shared naming or config** → Put it in `shared/constants.py`.
- **Reusable pattern** (e.g. “tagged S3 bucket”) → Implement in `shared/constructs.py` and use it from stacks.

**Do not** add account IDs, regions, or deployment context here until the project phase allows it.
