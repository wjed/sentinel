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
---
---
---
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
