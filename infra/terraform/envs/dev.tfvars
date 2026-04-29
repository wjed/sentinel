# ── Dev environment — CloudFront-only, SOC backend off ────────────────────────
# Cheapest possible deployment for development and demos.
# No custom domain, no EC2, no ALB.

project_name = "sentinelnet"
environment  = "dev"
aws_region   = "us-east-1"

enable_custom_domain   = false
create_route53_records = false

create_soc_backend    = false
create_alb            = false
force_destroy_buckets = true
alert_retention_days  = 1

cognito_domain_prefix = "sentinelnet-dev"

admin_group_name   = "SentinelNetAdmins"
analyst_group_name = "SentinelNetAnalysts"
viewer_group_name  = "SentinelNetViewers"

instance_type    = "t3.medium"
root_volume_size = 30

tags = {
  Owner      = "SentinelNet"
  CostCenter = "dev"
}
