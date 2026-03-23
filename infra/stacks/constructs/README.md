# Sentinel Constructs

This directory contains CDK constructs used to build the Sentinel infrastructure.

## Wazuh Construct

Sets up **Wazuh alert ingestion and manager infrastructure** using SQS queues, a Lambda ingest function, and an EC2 instance running the Wazuh Manager.

**Constructor args required:**

| Argument | Type | Description |
|---|---|---|
| `vpc` | `ec2.Vpc` | The VPC to place resources in |
| `private_subnets` | `list[ec2.ISubnet]` | Private subnets for the EC2 instance |
| `table` | `dynamodb.Table` | Destination table for ingested alerts (from `TelemetryConstruct`) |
| `kms_key` | `kms.Key` | KMS key used to grant encrypt/decrypt to the ingest Lambda |

**Creates:**

| Resource | Purpose |
|---|---|
| `self.alert_dlq` (SQS) | Dead-letter queue holding failed messages for 14 days |
| `self.alert_queue` (SQS) | Main alert queue; failed messages route to DLQ after 5 attempts |
| `self.ingest_fn` (Lambda) | Reads from `alert_queue` and writes alerts to DynamoDB |
| `wazuh_sg` (EC2 SG) | Security group allowing agent/registration traffic from within the VPC only |
| `wazuh_role` (IAM) | Instance role granting SSM access and `sqs:SendMessage` to the alert queue |
| `self.instance` (EC2) | `t3.medium` Wazuh Manager in the private subnet |

**SQS configuration:**

| Setting | What it does |
|---|---|
| `visibility_timeout=120s` | Hides a message for 2 minutes while Lambda processes it |
| `max_receive_count=5` | Message moves to DLQ after 5 failed processing attempts |
| DLQ retention 14 days | Keeps failed messages long enough for manual inspection/replay |
| `enforce_ssl=True` (both) | Rejects unencrypted connections to both queues |

**Security group inbound rules:**

| Port | Protocol | Source | Purpose |
|---|---|---|---|
| `1514` | TCP | VPC CIDR | Wazuh agent communication |
| `1514` | UDP | VPC CIDR | Wazuh agent communication |
| `1515` | TCP | VPC CIDR | Wazuh agent registration |

**Usage:**
```python
wazuh = WazuhConstruct(
    self, "Wazuh",
    vpc=network.vpc,
    private_subnets=network.private_subnets,
    table=telemetry.table,
    kms_key=telemetry.kms_key,
)

# Allow another resource to send alerts to the queue
wazuh.alert_queue.grant_send_messages(my_resource)
```

> **Note:** `allow_all_outbound=False` on the security group means outbound rules must be added explicitly if the Wazuh Manager needs to reach external services (e.g. package repos, threat intel feeds).

---

## Telemetry Construct

Sets up **encrypted storage for Wazuh security alerts** using a KMS key and DynamoDB table.

**Creates:**

| Resource | Purpose |
|---|---|
| `self.kms_key` (AWS KMS) | Customer-managed key that encrypts all stored data |
| `self.table` (AWS DynamoDB) | `sentinel-telemetry` table storing normalized alerts |

**DynamoDB table structure:**

| Key | Field | Why |
|---|---|---|
| Partition Key | `agentId` | Groups alerts by the machine they came from |
| Sort Key | `timestamp` | Orders alerts chronologically per machine |

**Key settings:**

| Setting | What it does |
|---|---|
| Key rotation (KMS) | Auto-rotates cryptographic material yearly |
| `PAY_PER_REQUEST` | Pay per read/write — no upfront capacity needed |
| Point-in-Time Recovery | Restore the table to any second in the last 35 days |
| TTL (`expiresAt`) | Old alerts auto-delete when their timestamp expires |
| `DESTROY` (both) | Resources deleted with the stack — use `RETAIN` in production |

**Usage:**
```python
telemetry = TelemetryConstruct(self, "Telemetry")

telemetry.table.grant_write_data(my_lambda)
my_lambda.add_environment("TABLE_NAME", telemetry.table.table_name)
telemetry.kms_key.grant_encrypt_decrypt(my_lambda)
```

> **Note:** Always grant `kms_key` access alongside table access — missing KMS permissions cause silent access denied errors at runtime.

---

## RDS Construct

Sets up a **MySQL 8.0 relational database** locked inside Sentinel's private network for structured SOC data.

**Constructor args required:**

| Argument | Type | Description |
|---|---|---|
| `vpc` | `ec2.Vpc` | The VPC to place the database in |
| `internal_subnets` | `list[ec2.ISubnet]` | Isolated subnets with no internet route |

**Creates:**

| Resource | Purpose |
|---|---|
| `self.security_group` (EC2 SG) | Firewall with zero inbound rules by default |
| Subnet Group | Pins the DB to isolated internal subnets |
| `self.instance` (RDS MySQL) | `t3.micro` MySQL 8.0 instance, 20 GB storage |

**Key settings:**

| Setting | What it does |
|---|---|
| No inbound/outbound by default | Nothing can reach the DB unless explicitly allowed |
| `storage_encrypted=True` | All disk data encrypted at rest |
| `multi_az=False` | No failover — set to `True` for production |
| `deletion_protection=False` | Enable in production to prevent accidental deletes |
| `DESTROY` | Resources deleted with the stack — use `RETAIN` in production |

**Usage:**
```python
rds = RdsConstruct(self, "Rds", vpc=network.vpc, internal_subnets=network.internal_subnets)

# Open MySQL port to a specific security group
rds.security_group.add_ingress_rule(
    peer=my_lambda_sg,
    connection=ec2.Port.tcp(3306),
    description="Allow Lambda to connect to RDS MySQL",
)
```

> **Note:** The security group blocks all traffic by default. You must explicitly open port `3306` for every service that needs DB access.
