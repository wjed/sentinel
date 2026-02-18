# SentinelNet: AWS Infrastructure & Cloud Architecture

[cite_start]This directory contains the authoritative documentation, architecture diagrams, and Infrastructure as Code (IaC) definitions for the **SentinelNet** platform[cite: 35, 56]. [cite_start]SentinelNet is a unified cloud-native system integrating security monitoring, vulnerability management, and predictive threat intelligence[cite: 8, 107].

## 1. Architecture Overview: The Multi-Tenant "Pool" Model
[cite_start]The platform follows a **three-tier architecture** consisting of frontend, backend, and center components[cite: 30, 31]. [cite_start]To support a B2B SaaS model efficiently, we utilize a **Hybrid Pool Model** for client isolation[cite: 139].

* [cite_start]**Network Isolation**: A single **Amazon VPC** is partitioned into public, private, and isolated data subnets to enforce least-privilege communication[cite: 74, 76, 77].
* [cite_start]**Identity-Based Partitioning**: We use **Amazon Cognito** for subscriber authentication[cite: 81]. [cite_start]Every request processed by the backend is tagged with a `tenant_id` extracted from Cognito JWT claims to ensure logical data isolation[cite: 139, 149].
* [cite_start]**Centralized Security Operations**: A central **Wazuh Manager** (SIEM/EDR) and **TheHive** (Incident Management) instance monitor disparate customer assets from a central location[cite: 114, 117, 141].



## 2. Component Breakdown

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Ingress** | API Gateway & CloudFront | [cite_start]Managed entry points for authenticated user traffic and global asset distribution[cite: 43, 59, 60]. |
| **Logic** | AWS Lambda | [cite_start]Normalization and detection pipelines that process security telemetry into standardized JSON[cite: 59, 60]. |
| **SIEM** | Wazuh Manager | [cite_start]The primary SIEM and EDR; provides visibility for monitoring client assets[cite: 113, 114]. |
| **Management** | TheHive | [cite_start]The control room for the on-call team to track alerts through triage and resolution[cite: 116, 117]. |
| **Storage** | DynamoDB & RDS | [cite_start]Persistent storage for normalized alerts, vulnerability data, and case history, partitioned by `tenant_id`[cite: 69, 139, 149]. |

## 3. Team Responsibilities
* [cite_start]**Center Team (Service Backbone)**: Responsible for VPC design, IP addressing, IAM role enforcement, and setting up GitHub Actions for automated deployment[cite: 72, 74, 78, 84].
* [cite_start]**Backend Team (Operations Force)**: Responsible for the **AWS CDK** logic, defining OpenAPI specifications, and implementing escalation logic from Wazuh to TheHive[cite: 56, 58, 91, 135].

## 4. Deployment & Security Standards
* [cite_start]**Infrastructure as Code**: All backend resources must be defined using the **AWS Cloud Development Kit (CDK)**[cite: 58].
* [cite_start]**Encryption**: All data in transit must use encrypted **HTTPS** connections[cite: 44].
* [cite_start]**Least Privilege**: Security groups and NACLs are configured manually to prevent direct internet access to private subnets[cite: 77, 149].

---

**Next Steps**:
* [cite_start]**Center Team**: Ensure the **NAT Gateway** is correctly routed to allow **OpenVAS** signature updates[cite: 149].
* [cite_start]**Backend Team**: Finalize the **DynamoDB** schema to include `tenant_id` as the Partition Key for all telemetry data[cite: 139, 149].
