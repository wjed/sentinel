# Infra stacks (`infra/stacks/`)

Each file here is a **CDK stack** — a class that will eventually define a set of AWS resources. Right now they’re empty on purpose.

---

## What each stack is for

| File | Stack | Purpose (when implemented) | Typical owner |
|------|--------|----------------------------|----------------|
| **`network_stack.py`** | **NetworkStack** | VPC, public/private subnets, NAT. Deploy: `cdk deploy SentinelNet-Network`. Outputs: VpcId, PrivateSubnetIds, PublicSubnetIds (exported for other stacks). | Center team |
| **`identity_stack.py`** | **IdentityStack** | IAM roles, policies, identity providers, auth boundaries. | Identity team |
| **`data_stack.py`** | **DataStack** | Data ingestion and storage: S3, Kinesis, SQS, Glue, etc. | Data team |
| **`backend_stack.py`** | **BackendStack** | Compute and API: Lambda, API Gateway, ECS, etc. | Backend team |

---

## Where to do what

- **Add resources to a stack** → Open the corresponding `.py` file and add CDK constructs inside the stack’s `__init__`. Example: in `network_stack.py`, you might add a `ec2.Vpc(...)`.
- **Reference another stack** → Pass the other stack (or its outputs) as a prop when instantiating the stack in `app.py`, then use it inside the stack (e.g. Backend stack might need the VPC from Network stack).
- **New stack** → Add a new file (e.g. `monitoring_stack.py`), define a class that extends `Stack`, then in `app.py` add e.g. `MonitoringStack(app, "SentinelNet-Monitoring")`.

**Implemented:** `website_stack.py`, `user_data_stack.py`, `network_stack.py`. Others are placeholders.

---

## Constructs (`infra/stacks/constructs/`)

Constructs are reusable infrastructure components that are instantiated within our main stacks (like `BackendStack`).

### HiveConstruct (`hive_construct.py`)
Deploys **TheHive** SOC case management platform on ECS Fargate.

- **Architecture:** Runs `strangebee/thehive` with an Elasticsearch sidecar within the same Fargate task.
- **Networking:** Deployed entirely in private subnets behind an internal Application Load Balancer (ALB). Not accessible from the public internet.
- **Ports:** Port `9000` (TheHive UI / API) is exposed via the internal ALB. Port `9200` (Elasticsearch) remains strictly internal to the Fargate task.
- **Integrations:** Optionally accepts a Wazuh SQS alert queue to grant TheHive read permissions, allowing it to correlate Wazuh alerts.
- **Exposes:** The Fargate `service` and the internal ALB's DNS name (`lb_dns`).
