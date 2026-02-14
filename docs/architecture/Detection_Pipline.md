# Detection Pipeline (Mermaid)

```mermaid
flowchart LR

%% =========================
%% MAIN PIPELINE (left -> right)
%% =========================

START["START<br/>Telemetry + Findings"] --> SRC["Sources<br/>(Agents, Cowrie, OpenVAS, Cloud Logs)"]

SRC -->|"Raw telemetry<br/>(logs, sessions, scan findings)"| WAZ["Wazuh Manager<br/>(SIEM/EDR detection)"]

WAZ -->|"Alerts/events (JSON)<br/>(rule hits + severity)"| ING["Ingestion Entry<br/>(API Gateway)"]

ING -->|"Buffer raw alerts"| Q1["SQS<br/>alert_queue"]

Q1 -->|"Trigger processing"| NORM["Normalize + Enrich Orchestrator<br/>(Lambda)"]

NORM -->|"Archive raw payload + artifacts"| ARCH["Archive<br/>(S3)"]

NORM -->|"Enrichment request<br/>(IPs, URLs, hashes)"| CORTEX["Cortex<br/>(Analyzers)"]
CORTEX -->|"Intel context + risk score"| NORM

NORM -->|"Write enriched event record"| EV["Event Store<br/>(DynamoDB)"]

EV -->|"Trigger triage (stream) or poll"| TRI["Triage Rules<br/>(Lambda)"]

TRI -->|"HIGH_RISK: create/update case"| HIVE["TheHive<br/>(Cases)"]
TRI -->|"LOW: tag as noise + keep for trends"| EV

HIVE -->|"Case status + key fields"| EV

EV -->|"KPIs/incidents/notifications"| APIREAD["Backend API<br/>(API Gateway routes)"]

APIREAD -->|"Metrics + trends"| GRAF["Grafana<br/>(Executive dashboards)"]

APIREAD -->|"Portal views (incidents, alerts)"| END["END<br/>Client Portal Outcomes"]

GRAF -->|"Executive view"| END

%% =========================
%% PORTAL ACCESS (side lane)
%% =========================

subgraph ACCESS["Portal Access (side lane)"]
  USER["Analyst / Client User"] -->|"HTTPS: load UI"| CF["CloudFront"]
  CF -->|"Static site assets"| S3WEB["S3 (Portal Build)"]
  USER -->|"HTTPS: API calls"| APIREAD
end

%% =========================
%% OPS AND SECURITY (supporting)
%% =========================

subgraph SECOPS["Security + Operations (supporting)"]
  COG["Cognito<br/>(Auth + RBAC)"]
  IAM["IAM<br/>(least privilege)"]
  SM["Secrets Manager / SSM<br/>(keys + creds)"]
  CW["CloudWatch<br/>(logs + metrics + alarms)"]
end

ING -->|"JWT validation"| COG
NORM -. "Read keys/creds" .-> SM
TRI -. "Permissions scope" .-> IAM
ING -. "Logs/metrics" .-> CW
NORM -. "Logs/metrics" .-> CW
TRI -. "Logs/metrics" .-> CW
WAZ -. "Service logs" .-> CW
CORTEX -. "Service logs" .-> CW
HIVE -. "Service logs" .-> CW

%% =========================
%% Styling
%% =========================
classDef main fill:#BBDEFB,stroke:#000,color:#111;
classDef tools fill:#DCFCE7,stroke:#000,color:#111;
classDef data fill:#E9D5FF,stroke:#000,color:#111;
classDef access fill:#FFCDD2,stroke:#000,color:#111;
classDef support fill:#FFF9C4,stroke:#000,color:#111;

class START,END main;
class SRC,WAZ,ING,Q1,NORM,TRI,APIREAD,GRAF main;
class CORTEX,HIVE tools;
class EV,ARCH,S3WEB data;
class USER,CF access;
class COG,IAM,SM,CW support;