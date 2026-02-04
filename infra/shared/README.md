# Infra shared (`infra/shared/`)

**What this folder is for:** Code used by more than one stack — constants and reusable CDK constructs. No AWS resources are created here in the scaffold.

---

## What’s in here

| File | Purpose |
|------|--------|
| **`constants.py`** | App name, stack prefix, stack IDs. Use these for consistent naming across stacks. No account/region/env values. |
| **`constructs.py`** | Placeholder for **reusable constructs** (e.g. a “tagged S3 bucket” or “standard security group”). When you add one, define a class that extends `Construct` and takes `scope` and `id`; then use it from any stack. |

---

## Where to do what

- **New shared constant** (e.g. tag keys, naming patterns) → Add to `constants.py` and import in stacks.
- **New reusable construct** → Add a class in `constructs.py` (or a new file under `shared/`), then instantiate it inside the stacks that need it.

This keeps stacks consistent and avoids duplicating the same resource pattern in every stack.
