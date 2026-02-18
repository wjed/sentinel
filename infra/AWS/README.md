# SentinelNet: AWS Infrastructure & Cloud Architecture

This directory contains the authoritative documentation, architecture diagrams, and Infrastructure as Code (IaC) definitions for the **SentinelNet** platform. SentinelNet is a unified cloud-native system integrating security monitoring, vulnerability management, and predictive threat intelligence.

## 1. Architecture Overview: The Multi-Tenant "Pool" Model
The platform follows a **three-tier architecture** consisting of frontend, backend, and center components. To support a B2B SaaS model efficiently, we utilize a **Hybrid Pool Model** for client isolation.

* **Network Isolation**: A single **Amazon VPC** is partitioned into public, private, and isolated data subnets to enforce least-privilege communication.
* **Identity-Based Partitioning**: We use **Amazon Cognito** for subscriber authentication. Every request processed by the backend is tagged with a `tenant_id` extracted from Cognito JWT claims to ensure logical data isolation.
* **Centralized Security Operations**: A central **Wazuh Manager** (SIEM/EDR) and **TheHive** (Incident Management) instance monitor disparate customer assets from a central location.



## 2. Component Breakdown

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Ingress** | API Gateway & CloudFront | Managed entry points for authenticated user traffic and global asset distribution. |
| **Logic** | AWS Lambda | Normalization and detection pipelines that process security telemetry into standardized JSON. |
| **SIEM** | Wazuh Manager | The primary SIEM and EDR; provides visibility for monitoring client assets. |
| **Management** | TheHive | The control room for the on-call team to track alerts through triage and resolution. |
| **Storage** | DynamoDB & RDS | Persistent storage for normalized alerts, vulnerability data, and case history, partitioned by `tenant_id`. |

## 3. Team Responsibilities
* **Center Team (Service Backbone)**: Responsible for VPC design, IP addressing, IAM role enforcement, and setting up GitHub Actions for automated deployment.
* **Backend Team (Operations Force)**: Responsible for the **AWS CDK** logic, defining OpenAPI specifications, and implementing escalation logic from Wazuh to TheHive.

## 4. Deployment & Security Standards
* **Infrastructure as Code**: All backend resources must be defined using the **AWS Cloud Development Kit (CDK)**.
* **Encryption**: All data in transit must use encrypted **HTTPS** connections.
* **Least Privilege**: Security groups and NACLs are configured manually to prevent direct internet access to private subnets.

---

**Next Steps**:
* **Center Team**: Ensure the **NAT Gateway** is correctly routed to allow **OpenVAS** signature updates.
* **Backend Team**: Finalize the **DynamoDB** schema to include `tenant_id` as the Partition Key for all telemetry data.
