# Escalation Logic (Mermaid)

```mermaid
flowchart TD

START["START<br/>Enriched Event"] --> DEDUPE["Deduplication Check<br/>(fingerprint + time window)"]

DEDUPE -->|"Duplicate"| DROP["Suppress Event<br/>(increment counter)"]
DROP --> END1["END<br/>No Escalation"]

DEDUPE -->|"New / Unique"| SCORE["Risk Scoring<br/>(severity + intel + asset criticality)"]

SCORE --> RULE1{"Severity >= Critical Threshold?"}

RULE1 -->|"Yes"| CASE["Create / Update Case<br/>(TheHive)"]

RULE1 -->|"No"| RULE2{"Medium Severity<br/>AND Critical Asset?"}

RULE2 -->|"Yes"| CASE
RULE2 -->|"No"| STORE["Store as Low Priority<br/>(Event Store)"]

CASE --> NOTIFY{"Notification Required?"}

NOTIFY -->|"Yes"| SEND["Send Client Notification<br/>(Email / Webhook / Portal)"]
NOTIFY -->|"No"| SILENT["No Immediate Notification"]

SEND --> METRICS["Update Metrics<br/>(MTTA, MTTR, Counts)"]
SILENT --> METRICS

METRICS --> END2["END<br/>SOC Outcome Recorded"]
STORE --> END3["END<br/>Event Retained for Trends"]

%% =========================
%% Styling
%% =========================
classDef start fill:#BBDEFB,stroke:#000,color:#111;
classDef decision fill:#FFF9C4,stroke:#000,color:#111;
classDef action fill:#DCFCE7,stroke:#000,color:#111;
classDef endNode fill:#FFCDD2,stroke:#000,color:#111;

class START start;
class DEDUPE,SCORE,RULE1,RULE2,NOTIFY decision;
class CASE,SEND,STORE,SILENT,METRICS action;
class END1,END2,END3 endNode;