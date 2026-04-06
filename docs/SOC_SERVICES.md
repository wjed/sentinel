# SentinelNet — SOC Services & Backend Pipeline

This document describes the services running on the backend and how they interact to provide a functional Security Operations Center (SOC) stack for SentinelNet.

## Backend SOC Services (Single-Instance t3.medium)

The Backend SOC is consolidated into a single **t3.medium** EC2 instance (4GB RAM) for extreme cost-efficiency. To fit all services, a **"Memory Diet"** is applied to the Java-based components:

| Service | Memory Limit | Description |
|---------|--------------|-------------|
| **Wazuh Manager** | ~1.2 GB | Centralized log ingestion and alerting. |
| **TheHive 5** | 768 MB Heap | Case management system. |
| **Elasticsearch** | 512 MB Heap | Search engine supporting TheHive. |
| **Cassandra** | 512 MB Heap | Database supporting TheHive. |
| **Grafana** | 256 MB | Visualization dashboard. |

### Configuration (docker-compose)

All services are managed in `/opt/sentinel/docker-compose.yml`. Data is persisted in Docker volumes. A **4GB Swap File** is configured on the host to handle memory spikes.

---

## The Alert Pipeline

The alert pipeline is designed to move alerts from the SOC manager (Wazuh) to a long-term, cost-effective storage layer (**S3 Data Lake**).

### 1. Ingestion (Forwarder + SQS)
Wazuh (on the EC2) is configured to push alerts to the **`sentinel-alerts` SQS queue**. 
- **Forwarder**: A Python script (`wazuh_to_sqs.py`) runs as a systemd service on the EC2. It tails `/var/ossec/logs/alerts/alerts.json` and pushes new events to SQS.

### 2. Processing (Ingest Lambda)
A Lambda function (`sentinel-wazuh-ingest`) is triggered by the SQS queue. It performs:
- **Normalization**: Formats JSON alerts for storage.
- **S3 Upload**: Saves each alert as an individual JSON file in the **Alerts Data Lake**.

### 3. Storage & Access (S3 + Telemetry API)
- **S3 Data Lake**: The `AlertsDataLake` bucket holds your alert history with a **1-day lifecycle rule** (automatic deletion).
- **Telemetry API**: A dedicated HTTP API Gateway + Lambda that fetches the latest 50 alerts from S3 for the analyst dashboard.

---

## Connectivity & Auth

### Agent-to-Manager
Wazuh agents connect to the manager over ports **1514 (Events)** and **1515 (Registration)**. These are open to the VPC CIDR in the Security Group.

### Analyst-to-UI
Analysts access the platform in two ways:
1.  **Management Console**: Direct HTTP access to TheHive/Grafana via the **ALB**.
2.  **SentinelNet Dashboard**: The React frontend (on CloudFront) which pulls live data from the **Telemetry API**.

---

## Maintenance & Management

### Managing Services
To manage the SOC services, log in to the EC2 via **AWS SSM Session Manager**:
```bash
# SSM shell access
aws ssm start-session --target <instance-id>

# Manage containers
docker ps
cd /opt/sentinel
sudo docker-compose restart thehive
```

### Logs & Monitoring
- **EC2 Instance Logs**: Available in CloudWatch via the CloudWatch Agent. High-priority errors and critical events are filtered and forwarded to the `/sentinelnet/soc/errors` log group with a **1-day retention policy**.
- **Lambda Logs**: Ingest and API Lambda functions log to CloudWatch with a **1-day retention policy** to minimize storage costs.
- **Alert History**: Alerts are stored as JSON in **S3** with a **1-day expiration** rule.
