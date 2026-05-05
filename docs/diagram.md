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
        WAF[AWS WAF Proxy]
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
                SOC_EC2[SOC Manager: t3.medium]  %% ← Updated from t3.large
                FW[Wazuh Port: 1514]
                REG[Wazuh Reg: 1515]
                TH[TheHive: 9000]
                GR[Grafana: 3000]

                SOC_EC2 --- FW
                SOC_EC2 --- REG
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
    ALB -->|Forward:9000| TH
    ALB -->|Forward:3000| GR
    Agent -->|UDP/TCP:1514/1515| SOC_EC2

    %% Internal Log Pipeline
    SOC_EC2 -->|HTTPS via IGW| SQS
    SQS -->|Trigger| LAMBDA_INGEST
    LAMBDA_INGEST -->|Write JSON| S3_ALERTS

    %% API and Auth
    User -->|HTTPS:443| APIGW
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
