# Infra stacks (`infra/stacks/`)

Each file here is a **CDK stack** — a class that will eventually define a set of AWS resources. Right now they’re empty on purpose.

---

## What each stack is for

| File | Stack | Purpose (when implemented) | Typical owner |
|------|--------|----------------------------|----------------|
| **`network_stack.py`** | **NetworkStack** | VPC, subnets, security groups, NAT, network connectivity. | Network team |
| **`identity_stack.py`** | **IdentityStack** | IAM roles, policies, identity providers, auth boundaries. | Identity team |
| **`data_stack.py`** | **DataStack** | Data ingestion and storage: S3, Kinesis, SQS, Glue, etc. | Data team |
| **`backend_stack.py`** | **BackendStack** | Compute and API: Lambda, API Gateway, ECS, etc. | Backend team |

---

## Where to do what

- **Add resources to a stack** → Open the corresponding `.py` file and add CDK constructs inside the stack’s `__init__`. Example: in `network_stack.py`, you might add a `ec2.Vpc(...)`.
- **Reference another stack** → Pass the other stack (or its outputs) as a prop when instantiating the stack in `app.py`, then use it inside the stack (e.g. Backend stack might need the VPC from Network stack).
- **New stack** → Add a new file (e.g. `monitoring_stack.py`), define a class that extends `Stack`, then in `app.py` add e.g. `MonitoringStack(app, "SentinelNet-Monitoring")`.

Stacks are **intentionally empty** in this scaffold; don’t add real resources until the project allows deployment.
