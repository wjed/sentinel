# SentinelNet Terraform — Agent Handoff

> This document tracks implementation decisions, current state, and what's left.
> Update it every session. It is the source of truth for agent hand-offs.

---

## Current State

**Phase:** Backend fully implemented. `terraform validate` ✓ passing. `terraform fmt` ✓ clean.

**Date last updated:** 2026-04-28

---

## What Was Built

Complete Terraform implementation under `infra/terraform/`.

### Files Created

```
infra/terraform/
├── .gitignore
├── versions.tf          — provider version constraints
├── providers.tf         — aws + aws.us_east_1 (ACM must be in us-east-1)
├── variables.tf         — all input variables with defaults
├── locals.tf            — site_url logic, name_prefix, common_tags
├── main.tf              — root orchestration of all modules
├── outputs.tf           — all outputs + next_steps helper
├── terraform.tfvars.example
├── envs/
│   ├── dev.tfvars       — cloudfront_only, no SOC, force_destroy=true
│   └── prod.tfvars.example
├── scripts/
│   ├── build-frontend.sh
│   ├── deploy-dev-cloudfront.sh
│   ├── deploy-prod-domain.sh
│   ├── destroy-dev.sh
│   └── render-frontend-config.sh
└── modules/
    ├── network/         — VPC, subnets, IGW, EC2+ALB security groups
    ├── auth/            — Cognito user pool, domain, groups, web+soc clients
    ├── userdata/        — DynamoDB profiles table, S3 profile pictures
    ├── frontend/        — S3 bucket, CloudFront OAC distribution, ACM, Route53
    ├── backend_api/     — Profile/AdminAccess/Telemetry Lambda + HTTP APIs
    ├── soc_backend/     — EC2, ALB, docker-compose, Wazuh ingest Lambda
    ├── alert_pipeline/  — SQS queue + DLQ, S3 data lake
    └── monitoring/      — CloudWatch log groups, optional GuardDuty
```

---

## Alert Pipeline Architecture

```
Wazuh agents ──► port 1514 ──► Wazuh Manager (Docker)
                                      │
                         /var/ossec/logs/alerts/alerts.json
                                      │
                    ┌─────────────────┴─────────────────────┐
                    │                                         │
               Filebeat (Docker)                  wazuh_to_sqs.py (systemd)
                    │                                         │
          Elasticsearch (Docker)                        SQS Queue (AWS)
          wazuh-alerts-* index                               │
                    │                               Lambda: wazuh_ingest
               Grafana (Docker)                              │
            pre-built dashboard                        S3 data lake
                                                            │
                                                  Lambda: telemetry_api
                                                            │
                                                     React Dashboard
```

### Grafana Dashboard (pre-provisioned)

Grafana auto-loads `wazuh-alerts.json` from `/etc/grafana/dashboards/` via the file provisioner.
The dashboard connects to the `Wazuh-Elasticsearch` datasource (UID: `wazuh-es`) and displays:
- Stat panels: Total Alerts, Critical (≥12), High (7–11), Active Agents
- Time series: All alerts + High/Critical overlay over time
- Tables: Top 10 Rules, Top 10 Agents
- Pie chart: Alert level distribution
- Bar gauge: Severity bucket breakdown (Low/Medium/High/Critical)
- Logs panel: Recent 100 alert events

---

## Key Design Decisions

### 1. Wazuh → Grafana via Filebeat + Elasticsearch
Filebeat (version pinned to 7.17.13, matching Elasticsearch 7.17.13) reads the Wazuh
`alerts.json` file and ships events to `wazuh-alerts-YYYY.MM.DD` indices. Grafana's
Elasticsearch datasource queries these indices. This is the canonical Wazuh monitoring
integration — no custom plugins required.

### 2. Circular Dependency Resolution (unchanged)
- `custom_domain` mode: site_url = `"https://${var.domain_name}"` — known at plan time.
- `cloudfront_only` mode: site_url uses `var.site_url_override` set after first apply.

### 3. SQS ARN — no longer hardcoded
Previously the wazuh_ingest Lambda event source mapping constructed the SQS ARN from
naming convention. Now `sqs_queue_arn` is a proper variable passed from `module.alert_pipeline`.

### 4. Cognito App Clients
- `web` client: no secret, PKCE flow for React SPA.
- `soc` client: with secret, server-side OIDC for TheHive, Grafana, ALB Cognito auth.

### 5. ALB Listener Rules
`authenticate-cognito` + `forward` use `order = 1` and `order = 2` in the same
`aws_lb_listener_rule` resource. This is the correct Terraform HCL pattern for
ALB multi-action rules.

### 6. Grafana Provisioning
Config files written at bootstrap time by user_data.sh.tpl:
- `/opt/sentinel/conf/grafana/provisioning/datasources/elasticsearch.yaml`
- `/opt/sentinel/conf/grafana/provisioning/dashboards/default.yaml`
- `/opt/sentinel/conf/grafana/dashboards/wazuh-alerts.json`

Mounted read-only into the Grafana container via docker-compose volumes.

---

## Known Issues / TODOs

### Medium Priority
- [ ] **S3 bucket naming uniqueness** — if another account already uses `sentinelnet-dev-website`, deploy will fail. Add `resource "random_id" "bucket_suffix"`.
- [ ] **Cognito domain prefix uniqueness** — `sentinelnet-dev-jacknelson` in terraform.tfvars; change if already taken globally.
- [ ] **TheHive 5.4.0 image** — Using `strangebee/thehive:5.4.0`. Verify tag on Docker Hub; if it doesn't exist, use `latest` or the next available `5.4.x` tag.

### Low Priority
- [ ] Remote state backend (S3 + DynamoDB lock) setup script
- [ ] CloudWatch alarms: API 5xx rate, Lambda errors, SQS DLQ depth
- [ ] Grafana alert rules (notify when critical Wazuh alerts appear)
- [ ] TheHive → Wazuh active response integration

---

## Deployment Verification Checklist

After first successful `terraform apply`:

- [ ] `terraform output website_url` returns a valid CloudFront URL
- [ ] Browser loads the React app at `website_url`
- [ ] Cognito login redirect works (no mismatch error)
- [ ] `/config.json` accessible at `website_url/config.json`
- [ ] Profile API returns 401 without auth token
- [ ] (If SOC enabled) `terraform output grafana_url` → opens Grafana login
- [ ] (If SOC enabled) Grafana "Wazuh" folder contains "Wazuh Security Alerts" dashboard
- [ ] (If SOC enabled) Elasticsearch data source shows green in Grafana
- [ ] (If SOC enabled) TheHive accessible at `terraform output thehive_url`
- [ ] (If SOC enabled) Wazuh manager running: `docker-compose ps` shows wazuh=Up

---

## How to Resume This Work

1. Read this AGENT.md first.
2. Run `terraform validate` from `infra/terraform/` — must pass before any changes.
3. Run `terraform fmt -recursive` to normalize formatting.
4. For SOC backend changes, edit `modules/soc_backend/user_data.sh.tpl` (the EC2 bootstrap script).
5. Test with `create_soc_backend = false` first (cheapest/fastest).

```bash
cd infra/terraform
terraform init
terraform validate
terraform fmt -recursive
terraform plan -var-file=envs/dev.tfvars
```

## Connecting a Wazuh Agent

After SOC backend is running:

```bash
# Get the EC2 public IP
EC2_IP=$(terraform output -raw soc_public_ip)

# Install agent on a Linux endpoint:
curl -s https://packages.wazuh.com/4.x/apt/pool/main/w/wazuh-agent/wazuh-agent_4.9.2-1_amd64.deb \
  -o /tmp/wazuh-agent.deb
WAZUH_MANAGER="$EC2_IP" dpkg -i /tmp/wazuh-agent.deb
systemctl enable wazuh-agent && systemctl start wazuh-agent

# Alerts appear in Grafana within ~60 seconds of the agent generating events.
```
