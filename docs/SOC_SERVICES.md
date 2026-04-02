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

### 1. Ingestion (SQS)
Wazuh (on the EC2) is configured to push alerts to the **`sentinel-alerts` SQS queue**. This provides:
- **Buffering**: If the Lambda ingest or DynamoDB table is busy, alerts wait in the queue.
- **Retry Logic**: Failed ingestions go to a Dead Letter Queue (DLQ).

### 2. Processing (Lambda)
A Lambda function (`sentinel-wazuh-ingest`) is triggered by the SQS queue. It performs the following:
- **Batch Processing**: Processes up to 10 alerts at a time for efficiency.
- **Normalization**: Formats the JSON alert into a structure suitable for DynamoDB keys.
- **TTL Injection**: Adds a `ttl` attribute (default 30 days) for automatic cleanup.

### 3. Storage (DynamoDB)
The **`TelemetryTable`** is a DynamoDB table used for long-term alert storage.
- **PK**: `ALERT#[YYYY-MM-DD]` (Allows daily partitioning).
- **SK**: `[TIMESTAMP]#[ALERT_ID]` (Allows time-based sorting and uniqueness).

---

## Connectivity & Auth

### Agent-to-Manager
Wazuh agents (running on other machines) connect to the manager over ports **1514 (Events)** and **1515 (Registration)**. These ports are open to the VPC CIDR in the Security Group.

### Analyst-to-UI
Analysts access TheHive and Grafana through the **Application Load Balancer (ALB)**.
- **Auth**: For the POC, the ALB forwards direct HTTP traffic to the services. You will use the internal application logins (e.g., TheHive's `admin`/`secret` or your configured credentials).
- **Routing**: Currently, the ALB routes all root traffic (port 80) to TheHive (port 9000). Grafana (port 3000) is accessible directly on the EC2 or can be added to the ALB via path-based routing.

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
- **EC2 Instance Logs**: Available in CloudWatch via the CloudWatch Agent.
- **Ingest Lambda Logs**: Available in CloudWatch logs for the `sentinel-wazuh-ingest` function.
