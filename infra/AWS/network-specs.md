# Network Specification: SentinelNet Pool Model

This document outlines the VPC configuration and security boundaries required to support multi-tenant isolation and secure telemetry ingestion.

## 1. VPC & Subnet Architecture
* **VPC CIDR:** `10.0.0.0/16`
* **Public Subnets:** `10.0.1.0/24` (Ingress & Logic: ALB, API Gateway, EC2 SOC Instance)

## 2. Security Group Requirements

| ID | Name | Source | Protocol/Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SG-01** | Web-Ingress | 0.0.0.0/0 | TCP 443 | Public HTTPS access for React Dashboard and ALB |
| **SG-02** | Agent-Ingress | 0.0.0.0/0 | TCP 1514, 1515 | Wazuh Agent telemetry ingestion and registration |
| **SG-03** | App-Logic | SG-01 | TCP 3000, 9000 | ALB traffic to Grafana/TheHive |

## 3. Traffic Flow & Isolation
1. **Subscriber Traffic:** User -> CloudFront -> API Gateway -> Lambda.
2. **Telemetry Traffic:** External Wazuh Agent -> Wazuh Manager (Public Subnet).
3. **Outbound Traffic:** SOC instance communicates directly to the internet via IGW.
4. **Data Privacy:** Security groups restrict access to SOC interfaces strictly via ALB or designated ports.

## 4. Multi-Tenant Enforcement
* **Network Level:** Security Groups prevent cross-service talk except where explicitly defined.
* **Logic Level:** The API Gateway Authorizer validates the Cognito JWT. 
* **Database Level:** All queries must include the `tenant_id` as the primary lookup key.
