# SentinelNet — SOC Services & Backend Pipeline

This document describes the services running on the backend and how they interact to provide a functional Security Operations Center (SOC) stack for SentinelNet.

## Backend SOC Services (Single-Instance t3.medium)

The Backend SOC is consolidated into a single EC2 instance for cost-efficiency. It runs the following services via `docker-compose`:

| Service | Port | Description |
|---------|------|-------------|
| **Wazuh Manager** | 1515 | Centralized log ingestion, agent registration, and alerting. |
| **TheHive 5** | 9000 | Case management system for triaging alerts into incidents. |
| **Grafana** | 3000 | Visualization and dashboarding for security metrics. |
| **Elasticsearch** | 9200 | Search and analytics engine supporting TheHive internals. |

### Configuration (docker-compose)

All services are managed in `/opt/sentinel/docker-compose.yml` on the EC2 instance. Data is persisted in Docker volumes:
- `wazuh_data`
- `thehive_db`
- `grafana_data`

---

## The Alert Pipeline

The alert pipeline is designed to move alerts from the SOC manager (Wazuh) to a long-term, queryable storage layer (DynamoDB).

### 1. Ingestion (Forwarder + SQS)
Wazuh (on the EC2) is configured to push alerts to the **`sentinel-alerts` SQS queue**. 
- **Forwarder**: A Python script (`wazuh_to_sqs.py`) runs as a systemd service on the EC2. It tails `/var/ossec/logs/alerts/alerts.json` and pushes new events to SQS.
- **SQS Buffer**: Provides stability and retry logic if processing is delayed.

### 2. Processing (Ingest Lambda)
A Lambda function (`sentinel-wazuh-ingest`) is triggered by the SQS queue. It performs:
- **Normalization**: Formats JSON alerts for DynamoDB.
- **TTL Injection**: Adds a 30-day auto-cleanup.

### 3. Storage & Access (DynamoDB + Telemetry API)
- **DynamoDB**: The `TelemetryTable` holds your alert history.
- **Telemetry API**: A dedicated HTTP API Gateway + Lambda that provides the analyst dashboard with the latest alerts via `GET /alerts`.

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
- **Alert History**: All normalized alerts are stored in **DynamoDB** with a **30-day TTL** (auto-cleanup).
