## Required Lambda functions

- **Alert Parser Lambda (MVP)** – Receives alerts from Wazuh webhook and normalizes alert structure.
- **Severity Scoring & Enrichment Lambda (MVP)** – Calculates final severity based on rule level, asset value, and enrichment confidence, sends indicators (IP, hash, domain) to Cortex and appends results.
- **Deduplication Lambda (MVP)** – Prevents duplicate incident creation using alert hashes stored in DynamoDB.
- **Case Creation Lambda (MVP)** – Creates incidents automatically in TheHive via API.
- **Escalation Router Lambda (MVP)** – Routes incidents based on severity and client SLA.
- **Client Notification Lambda (MVP)** – Sends email/SNS/Slack notifications.
- **Report Generator Lambda (Scale-Up)** – Generates periodic executive reports and stores them in S3.
- **Log Archival Lambda (Scale-Up)** – Moves older logs to S3 Glacier based on retention policy.

## Queues (SQS)

- **Wazuh Alert Queue (MVP)** – Buffers incoming alerts from Wazuh.
- **Enrichment Queue (MVP)** – Holds alerts pending Cortex enrichment.
- **Case Creation Queue (MVP)** – Stores validated alerts before TheHive case creation.
- **Notification Queue (MVP)** – Handles outbound client and analyst notifications.
- **Critical Escalation Queue (Scale-Up/ Optional)** – Dedicated queue for high-severity incidents.
- **Reporting Queue (Scale-Up)** – Triggers scheduled reporting tasks.
- **Archival Queue (Scale-Up)** – Manages log retention workflows.

## Databases (DynamoDB / RDS)

- **RDS (PostgreSQL - TheHive)**
  - TheHive case management database
  - User accounts and role permissions
  - Incident notes and attachments metadata
  - Multi-tenant client data separation

- **DynamoDB**
  - Alert metadata storage
  - Deduplication hash tracking
  - Escalation state management
  - Client-specific severity thresholds
  - SLA timers and workflow status flags

## IAM considerations

- **Least Privilege Enforcement (MVP)** – Each Lambda has its own execution role.
- **Service Role Separation (MVP)** – Separate IAM roles for:
  - Wazuh EC2 (no direct access to client data stores)
  - TheHive EC2 (no direct access to DynamoDB policy tables)
  - Automation services (Lambdas, Shuffle, etc.)
- **Scoped Permissions (MVP):**
  - Lambdas restricted to specific SQS queues.
  - DynamoDB tables limited by role.
  - RDS access restricted via security groups.
- **Secrets Management (MVP)** – API keys and DB credentials stored in AWS Secrets Manager.
- **Encryption (MVP)** – KMS enabled for S3, RDS, and DynamoDB.
- **Audit Logging (MVP)** – CloudTrail enabled; IAM role assumption logging enforced.
- **Network Isolation (MVP)** – Private subnets for databases and backend services.
