# Data Storage Design (Mermaid)

```mermaid
flowchart LR

%% =========================
%% PRODUCERS (LEFT COLUMN)
%% =========================
subgraph Producers["SOC Data Producers"]
direction TB

START["START<br/>SOC Data Produced"]

PROD["Detection + Processing Tools<br/>(Wazuh, Cortex, TheHive,<br/>Lambdas, OpenVAS, Cowrie)"]

START --> PROD
end

%% =========================
%% STORAGE (CENTER COLUMN)
%% =========================
subgraph Storage["Data Storage Layer"]
direction TB

S3RAW["S3 Raw Archive<br/>(logs, evidence, reports)"]

DDBEV["DynamoDB Event Store<br/>(normalized + enriched events)"]

RDSCASE["RDS Case / Config DB<br/>(TheHive + tenant config)"]

OS["OpenSearch<br/>(investigative search)"]

end

%% =========================
%% DATA ACCESS (buffer layer)
%% =========================
subgraph Access["Data Access Layer"]
direction TB

API["Backend API<br/>(read/write broker)"]

REPORT["Reporting Jobs<br/>(scheduled Lambda)"]

end

%% =========================
%% CONSUMERS (RIGHT COLUMN)
%% =========================
subgraph Consumers["Consumers"]
direction TB

PORTAL["Client Portal<br/>(incidents, alerts, notifications)"]

GRAF["Grafana<br/>(executive dashboards)"]

ANALYST["SOC Analysts<br/>(TheHive + investigations)"]

END["END<br/>Data powers SOC operations"]

end

%% =========================
%% WRITE PATHS
%% =========================
PROD -->|"Raw logs + artifacts"| S3RAW
PROD -->|"Enriched events"| DDBEV
PROD -->|"Case + workflow data"| RDSCASE
PROD -->|"Indexed log copies"| OS

%% =========================
%% ACCESS LAYER FLOWS
%% =========================
DDBEV --> API
RDSCASE --> API
OS --> API

REPORT -->|"Batch analytics"| DDBEV
REPORT -->|"Generate reports"| S3RAW
REPORT -->|"Store metadata"| RDSCASE

%% =========================
%% CONSUMER READS
%% =========================
API --> PORTAL
API --> GRAF
API --> ANALYST

%% =========================
%% FINAL OUTCOME
%% =========================
PORTAL --> END
GRAF --> END
ANALYST --> END

%% =========================
%% STYLING
%% =========================
classDef prod fill:#BBDEFB,stroke:#000,color:#111;
classDef store fill:#E9D5FF,stroke:#000,color:#111;
classDef access fill:#FFF9C4,stroke:#000,color:#111;
classDef consumer fill:#FFCDD2,stroke:#000,color:#111;

class START,PROD prod;
class S3RAW,DDBEV,RDSCASE,OS store;
class API,REPORT access;
class PORTAL,GRAF,ANALYST,END consumer;