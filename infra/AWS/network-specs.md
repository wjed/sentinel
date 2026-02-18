# Network Specification: SentinelNet Pool Model

This document outlines the VPC configuration and security boundaries required to support multi-tenant isolation and secure telemetry ingestion.

## 1. VPC & Subnet Architecture
* **VPC CIDR:** `10.0.0.0/16`
* **Public Subnets:** `10.0.1.0/24` (Ingress: ALB, API Gateway, NAT Gateway)
* **Private App Subnets:** `10.0.2.0/24` (Logic: Lambda, Wazuh, TheHive)
* **Isolated Data Subnets:** `10.0.10.0/24` (Storage: RDS, DynamoDB)

## 2. Security Group Requirements

| ID | Name | Source | Protocol/Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SG-01** | Web-Ingress | 0.0.0.0/0 | TCP 443 | Public HTTPS access for React Dashboard |
| **SG-02** | Agent-Ingress | Client IP Ranges | UDP 1514 | Wazuh Agent telemetry ingestion |
| **SG-03** | App-Logic | SG-01, SG-02 | TCP 8000, 9000 | API traffic to Wazuh/TheHive |
| **SG-04** | Data-Storage | SG-03 | TCP 3306 | RDS MySQL access for TheHive |

## 3. Traffic Flow & Isolation
1. **Subscriber Traffic:** User -> CloudFront -> API Gateway -> Lambda (Private Subnet).
2. **Telemetry Traffic:** External Wazuh Agent -> IGW -> Wazuh Manager (Private Subnet).
3. **Outbound Traffic:** Internal tools (OpenVAS) must route through the **NAT Gateway** for signature updates to maintain private subnet integrity.
4. **Data Privacy:** Direct internet access to the **Isolated Data Subnet** is strictly prohibited.

## 4. Multi-Tenant Enforcement
* **Network Level:** Security Groups prevent cross-service talk except where explicitly defined.
* **Logic Level:** The API Gateway Authorizer validates the Cognito JWT. 
* **Database Level:** All queries must include the `tenant_id` as the primary lookup key.
