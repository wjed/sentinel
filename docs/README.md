# SentinelNet — Documentation

**What this folder is for:** Design docs, architecture notes, and any written explanation of how the system works and how teams work together.

---

## 🏗 High-Level Architecture
- **[Architecture Overview (POC)](ARCHITECTURE_POC.md)** — VPC, costs, components, and logical data flow.
- **[SOC Services & Pipeline](SOC_SERVICES.md)** — Wazuh, TheHive, Grafana, and the SQS/Lambda ingest pipeline.
- **[Cognito Setup](COGNITO-SETUP.md)** — Authentication and user pool deployment details.

---

## 🛠 Features & Workflows
- **[Escalation Logic](architecture/Escalation_Logic.md)** — How alerts are promoted to cases.

---

## ⚙️ Developer Documentation
- **[Root README](../README.md)** — Main project overview and deploy steps.
- **[Infra: Deploy Guide](../infra/README.md)** — Terraform modules, deployment modes, and how to deploy.

Keeping everything here makes it easy for new team members and graders to find “how it works” in one place.
