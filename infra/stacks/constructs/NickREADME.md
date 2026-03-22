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
