# ──────────────────────────────────────────────────────────────────────────────
# Root outputs — everything a deployer needs to configure clients / verify infra
# ──────────────────────────────────────────────────────────────────────────────

# ── Website ───────────────────────────────────────────────────────────────────

output "website_url" {
  description = "Public URL of the React frontend (CloudFront or custom domain)."
  value       = module.frontend.website_url
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain (always available; use as site_url_override in cloudfront_only + SOC mode)."
  value       = module.frontend.cloudfront_domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (needed for manual cache invalidation)."
  value       = module.frontend.distribution_id
}

output "frontend_bucket_name" {
  description = "S3 bucket holding the built React app."
  value       = module.frontend.bucket_name
}

# ── Cognito ───────────────────────────────────────────────────────────────────

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID."
  value       = module.auth.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito App Client ID used by the React frontend."
  value       = module.auth.user_pool_client_id
}

output "cognito_domain_url" {
  description = "Cognito hosted-UI base URL (e.g. https://sentinelnet.auth.us-east-1.amazoncognito.com)."
  value       = module.auth.cognito_domain_url
}

output "cognito_issuer_url" {
  description = "Cognito JWT issuer URL (used for OIDC discovery)."
  value       = module.auth.issuer_url
}

# ── APIs ──────────────────────────────────────────────────────────────────────

output "profile_api_url" {
  description = "HTTP API endpoint for the profile Lambda (GET/PATCH /profile)."
  value       = module.backend_api.profile_api_url
}

output "admin_access_api_url" {
  description = "HTTP API endpoint for the admin-access Lambda (/admin/access/*)."
  value       = module.backend_api.admin_access_api_url
}

output "telemetry_api_url" {
  description = "HTTP API endpoint for the telemetry Lambda (GET /alerts)."
  value       = module.backend_api.telemetry_api_url
}

# ── Alert pipeline ────────────────────────────────────────────────────────────

output "alert_queue_url" {
  description = "SQS queue URL for Wazuh alert ingestion."
  value       = module.alert_pipeline.queue_url
}

output "alert_queue_arn" {
  description = "SQS queue ARN."
  value       = module.alert_pipeline.queue_arn
}

output "alerts_bucket_name" {
  description = "S3 data lake bucket for processed Wazuh alerts."
  value       = module.alert_pipeline.alerts_bucket_name
}

# ── SOC Backend ───────────────────────────────────────────────────────────────

output "soc_instance_id" {
  description = "EC2 instance ID of the SOC backend (null when create_soc_backend = false)."
  value       = one(module.soc_backend[*].instance_id)
}

output "soc_public_ip" {
  description = "Public IP of the SOC backend EC2 instance."
  value       = one(module.soc_backend[*].public_ip)
}

output "soc_alb_dns_name" {
  description = "ALB DNS name (null when create_alb = false)."
  value       = one(module.soc_backend[*].alb_dns_name)
}

output "thehive_url" {
  description = "TheHive URL — via CloudFront (custom_domain+ALB), direct EC2 IP (no ALB), or null (SOC disabled)."
  value = (
    var.create_soc_backend
    ? (
      var.enable_custom_domain && var.create_alb
      ? "${module.frontend.website_url}/thehive/"
      : one(module.soc_backend[*].thehive_direct_url)
    )
    : null
  )
}

output "grafana_url" {
  description = "Grafana URL — via CloudFront (custom_domain+ALB), direct EC2 IP (no ALB), or null (SOC disabled)."
  value = (
    var.create_soc_backend
    ? (
      var.enable_custom_domain && var.create_alb
      ? "${module.frontend.website_url}/grafana/"
      : one(module.soc_backend[*].grafana_direct_url)
    )
    : null
  )
}

output "test_credentials" {
  description = "Default admin user provisioned by Terraform (dev only — change password after first login)."
  value       = "Username: jack  |  Password: Teamcarry1!"
}

# ── Convenience deploy instructions ──────────────────────────────────────────

output "next_steps" {
  description = "Quick-start instructions after apply."
  value       = <<-EOF

    ┌─────────────────────────────────────────────────────────────────┐
    │  SentinelNet deployed successfully                              │
    ├─────────────────────────────────────────────────────────────────┤
    │  Website:   ${module.frontend.website_url}
    │  TheHive:   ${module.frontend.website_url}/thehive/
    │  Grafana:   ${module.frontend.website_url}/grafana/
    │
    │  Login:  jack / Teamcarry1!  (change after first login)
    │
    │  Connect Wazuh agents → EC2 public IP, port 1514/1515
    │    terraform output soc_public_ip
    │
    │  Teardown:  ./scripts/destroy-prod.sh
    └─────────────────────────────────────────────────────────────────┘
  EOF
}
