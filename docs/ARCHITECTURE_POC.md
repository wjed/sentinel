# SentinelNet — POC Foundation Architecture

This document describes the "Proof of Concept" (POC) architecture for SentinelNet. The goal of this architecture is to provide a stable, functional foundation for security services (Wazuh, TheHive, Grafana) while minimizing AWS costs (~$46/mo).

## High-Level Overview

SentinelNet consists of four main layers:
1.  **Network Layer**: A simplified VPC with public subnets only (no NAT Gateway).
2.  **User Data & Auth Layer**: Shared Cognito User Pool and DynamoDB tables for user profiles.
3.  **Frontend Layer**: A React SPA hosted on S3 and served via CloudFront.
4.  **Backend SOC Layer**: A single EC2 instance running all security services via `docker-compose`, protected by an Application Load Balancer (ALB) with Cognito authentication and a TheHive auth proxy.

---

## Architecture Diagram (Logical)

```mermaid
graph TD
    %% External Layer
    subgraph "Public Internet"
        User((Analyst/User))
        Agent((Remote Wazuh Agent))
    end

    %% Edge Layer
    subgraph "AWS Edge Locations"
        CF[CloudFront Distribution]
        WAF[AWS WAF Proxy - Optional]
        CF --- WAF
    end

    %% VPC Layer
    subgraph "VPC: SentinelNet-Network (10.0.0.0/16)"
        subgraph "Public Subnets (us-east-1a / us-east-1b)"
            direction TB
            subgraph "Security Group: ALB-SG"
                ALB[Application Load Balancer / Cognito Auth]
            end

            subgraph "Security Group: Services-SG"
                direction LR
                SOC_EC2[SOC Manager: t3.large]
                FW[Wazuh Port: 1514]
                REG[Wazuh Reg: 1515]
                THP[TheHive Proxy: 9001]
                TH[TheHive: 9000]
                GR[Grafana: 3000]
                
                SOC_EC2 --- FW
                SOC_EC2 --- REG
                SOC_EC2 --- THP
                SOC_EC2 --- TH
                SOC_EC2 --- GR
            end
        end

        %% Internal Data Flow
        IGW[Internet Gateway]
    end

    %% Serverless / Managed Layer
    subgraph "AWS Managed Services (Public Endpoints)"
        S3_WEB[(S3: Website Assets & Code)]
        DDB_PROFILES[(DynamoDB: User Profiles)]
        S3_ALERTS[(S3: Alerts Data Lake)]
        COG[Cognito: Shared UserPool]
        APIGW[HTTP APIs: Profile, Admin, Telemetry]
        LAMBDA_INGEST[Lambda: Wazuh Ingest]
        LAMBDA_API[Lambdas: API Handlers]
        SQS[SQS: Alert Buffer]
    end

    %% Connections
    User -->|HTTPS:443| CF
    CF -->|Origin| S3_WEB
    User -->|HTTPS:443| ALB
    ALB -->|Forward:9001| THP
    THP -->|Forward:9000| TH
    ALB -->|Forward:3000| GR
    Agent -->|UDP/TCP:1514/1515| SOC_EC2
    
    %% Internal Log Pipeline
    SOC_EC2 -->|HTTPS via IGW| SQS
    SQS -->|Trigger| LAMBDA_INGEST
    LAMBDA_INGEST -->|Write JSON| S3_ALERTS
    
    %% API and Auth
    User -->|HTTPS: APIs| APIGW
    APIGW -->|Trigger| LAMBDA_API
    LAMBDA_API -->|Read| S3_ALERTS
    LAMBDA_API -->|Read/Write| DDB_PROFILES
    LAMBDA_API -->|Manage| COG
    
    User -.->|SSO Login| COG
    ALB -.->|Authenticate| COG

    %% Styling
    style SOC_EC2 fill:#fff4dd,stroke:#d4a017,stroke-width:2px
    style CF fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style S3_ALERTS fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style DDB_PROFILES fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style SQS fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style ALB fill:#fffde7,stroke:#fbc02d,stroke-width:2px
```

---

## Component Details

### 1. Network (SentinelNet-Network)
- **Cost Optimization**: We use `nat_gateways=0` to save ~$32/mo.
- **Subnets**: Public subnets only. All resources (EC2, ALB) are placed here.
- **Security**: Access is restricted via Security Groups. SSH is open for troubleshooting; prefer SSM for routine access.

### 2. User Data & Auth (SentinelNet-UserData)
- **Cognito**: A single User Pool shared by the Website and Backend services.
- **S3 Bucket**: Stores user profile pictures.
- **DynamoDB**: Stores user profile metadata.

### 3. Website (SentinelNet-Website)
- **Hosting**: S3 + CloudFront with an edge function for SPA routing.
- **Profile API**: A small Lambda + API Gateway (HttpApi) for the dashboard to manage user profiles.
- **Config**: Automatically generates `config.json` with the latest Telemetry and Profile API URLs.

### 4. Backend (SentinelNet-Backend)
- **Compute**: One **`t3.large`** EC2 instance (8GB RAM) with a **50GB GP3 SSD**. 
- **Memory Diet**: A **4GB Swap File** and strict JVM heap limits (512MB for Cassandra/ES, 768MB for TheHive) are applied to ensure multiple heavy services remain stable within the 4GB limits.
- **Ingestion**: A Python forwarder script monitors `alerts.json` and pushes rule hits to an SQS queue.
- **TheHive 5 Stack**: Includes **Cassandra** and **Elasticsearch** containers running in a "low-memory mode". The stack is automatically initialized during the first deployment via a bootstrap script that creates necessary proxy accounts.
- **Telemetry API**: A dedicated Lambda + HttpApi allows the dashboard to fetch the latest alerts from the **S3 Data Lake**.
- **Containerization**: Services run as Docker containers using `docker-compose`.
- **Auth**: The ALB enforces Cognito authentication. TheHive traffic is forwarded to a small auth proxy that uses credentials stored in `.thehive_proxy.env` to establish sessions.

---

## Cost Breakdown (Estimated)

| Service | Cost (Monthly) | Notes |
|---------|----------------|-------|
| **EC2 (t3.large)** | ~$60.00 | Reserved or Spot would be cheaper. |
| **ALB** | ~$16.00 | Base cost for one Load Balancer. |
| **CloudFront / S3** | < $1.00 | Free tier usually covers this. |
| **Cognito / DDB / Lambda** | ~$0.00 | Pay-per-request / Free tier. |
| **TOTAL** | **~$76.00** | vs ~$120.00 for the old setup. |

---

## Security Considerations
- **Internal Traffic**: The EC2 Security Group strictly allows traffic only from the ALB and the VPC CIDR.
- **SSM**: We use AWS Systems Manager (SSM) for instance management, eliminating the need for a Bastion host or open SSH ports.
- **Encryption**: KMS is used for SQS and DynamoDB encryption.
