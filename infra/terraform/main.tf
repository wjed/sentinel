# ──────────────────────────────────────────────────────────────────────────────
# SentinelNet — root Terraform configuration
#
# Deployment modes:
#   cloudfront_only (default): No custom domain. Frontend at CloudFront URL.
#   custom_domain:             Route 53 + ACM + CloudFront aliases.
#
# Optional toggle:
#   create_soc_backend = false  → frontend + Lambda APIs only (cheap dev mode)
#   create_soc_backend = true   → adds EC2 + ALB + Wazuh/TheHive/Grafana
# ──────────────────────────────────────────────────────────────────────────────

# ── Networking ────────────────────────────────────────────────────────────────
module "network" {
  source = "./modules/network"

  project_name        = var.project_name
  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  allowed_admin_cidrs = var.allowed_admin_cidrs
  wazuh_agent_cidrs   = var.wazuh_agent_allowed_cidrs
}

# ── User data storage (DynamoDB + profile pictures S3) ───────────────────────
module "userdata" {
  source = "./modules/userdata"

  project_name  = var.project_name
  environment   = var.environment
  force_destroy = var.force_destroy_buckets
}

# ── Alert ingestion pipeline (SQS + S3 data lake + Lambda) ───────────────────
module "alert_pipeline" {
  source = "./modules/alert_pipeline"

  project_name          = var.project_name
  environment           = var.environment
  force_destroy_buckets = var.force_destroy_buckets
  alert_retention_days  = var.alert_retention_days
}

# ── Frontend (S3 + CloudFront + optional ACM/Route53) ────────────────────────
module "frontend" {
  source = "./modules/frontend"

  project_name           = var.project_name
  environment            = var.environment
  force_destroy          = var.force_destroy_buckets
  enable_custom_domain   = var.enable_custom_domain
  domain_name            = var.domain_name
  create_route53_records = var.create_route53_records
  hosted_zone_id         = var.hosted_zone_id

  # ALB origin for CloudFront — only wired in custom_domain + ALB mode.
  # When create_alb = false, CloudFront does not proxy /thehive/* or /grafana/*;
  # access those services directly via the EC2 public IP shown in outputs.
  soc_alb_dns = (
    var.enable_custom_domain && var.create_alb
    ? one(module.soc_backend[*].alb_dns_name)
    : null
  )

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

# ── Authentication (Cognito User Pool + groups + app clients) ─────────────────
# Depends on frontend to resolve the site URL for callback/logout URLs.
module "auth" {
  source = "./modules/auth"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  domain_prefix      = var.cognito_domain_prefix
  admin_group_name   = var.admin_group_name
  analyst_group_name = var.analyst_group_name
  viewer_group_name  = var.viewer_group_name

  # Web app client callback/logout URLs
  callback_urls = local.cognito_callback_urls
  logout_urls   = local.cognito_logout_urls

  # SOC services Cognito client (TheHive + Grafana OIDC)
  soc_callback_urls = local.soc_callback_urls
}

# ── Backend Lambda APIs (profile, admin-access, telemetry) ───────────────────
module "backend_api" {
  source = "./modules/backend_api"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  # Cognito
  user_pool_id        = module.auth.user_pool_id
  user_pool_arn       = module.auth.user_pool_arn
  user_pool_client_id = module.auth.user_pool_client_id
  issuer_url          = module.auth.issuer_url
  admin_group_name    = var.admin_group_name
  analyst_group_name  = var.analyst_group_name
  viewer_group_name   = var.viewer_group_name
  allowed_groups      = [var.admin_group_name, var.analyst_group_name, var.viewer_group_name]

  # Storage
  profiles_table_name          = module.userdata.profiles_table_name
  profiles_table_arn           = module.userdata.profiles_table_arn
  profile_pictures_bucket_name = module.userdata.profile_pictures_bucket_name
  profile_pictures_bucket_arn  = module.userdata.profile_pictures_bucket_arn

  # Alert data lake (for telemetry API)
  alerts_bucket_name = module.alert_pipeline.alerts_bucket_name
  alerts_bucket_arn  = module.alert_pipeline.alerts_bucket_arn

  # Lambda source paths
  profile_lambda_dir      = "${local.lambda_root}/profile_api_py"
  admin_access_lambda_dir = "${local.lambda_root}/admin_access_api_py"
  telemetry_lambda_dir    = "${local.backend_lambda_root}/telemetry_api"
}

# ── SOC Backend (EC2 + ALB + Wazuh/TheHive/Grafana) ──────────────────────────
module "soc_backend" {
  count  = var.create_soc_backend ? 1 : 0
  source = "./modules/soc_backend"

  project_name = var.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  # Network
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  ec2_sg_id         = module.network.ec2_sg_id
  alb_sg_id         = module.network.alb_sg_id

  # EC2 spec
  instance_type    = var.instance_type
  root_volume_size = var.root_volume_size
  key_pair_name    = var.key_pair_name
  create_alb       = var.create_alb

  # Cognito integration (for TheHive + Grafana OIDC and ALB auth)
  user_pool_id       = module.auth.user_pool_id
  user_pool_arn      = module.auth.user_pool_arn
  user_pool_domain   = module.auth.user_pool_domain
  cognito_domain_url = module.auth.cognito_domain_url
  soc_client_id      = module.auth.soc_client_id
  soc_client_secret  = module.auth.soc_client_secret

  # Web client + group names for the dashboard-api container (Wazuh + TheHive
  # KPI service).  The container validates the React app's Cognito JWT in-app.
  web_client_id      = module.auth.user_pool_client_id
  admin_group_name   = var.admin_group_name
  analyst_group_name = var.analyst_group_name
  viewer_group_name  = var.viewer_group_name
  dashboard_api_src_dir = "${path.root}/../../backend/dashboard_api"

  # Site URL for OIDC redirect URIs in docker-compose
  site_url = local.site_url

  # Alert ingestion
  sqs_queue_url = module.alert_pipeline.queue_url
  sqs_queue_arn = module.alert_pipeline.queue_arn

  # Custom domain mode only: create HTTPS listener + Cognito auth + Route53 A record
  enable_custom_domain = var.enable_custom_domain
  domain_name          = var.domain_name
  hosted_zone_id       = var.hosted_zone_id

  # Wazuh ingest Lambda source
  wazuh_ingest_lambda_dir = "${local.backend_lambda_root}/wazuh_ingest"

  # Alert data lake
  alerts_bucket_name = module.alert_pipeline.alerts_bucket_name
  alerts_bucket_arn  = module.alert_pipeline.alerts_bucket_arn

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

# ── Monitoring (CloudWatch log groups + alarms) ───────────────────────────────
module "monitoring" {
  source = "./modules/monitoring"

  project_name = var.project_name
  environment  = var.environment
}

# ── Runtime config.json uploaded to S3 frontend bucket ───────────────────────
# This file is fetched at runtime by the React app (see frontend/src/main.jsx).
locals {
  runtime_config = {
    authority         = module.auth.issuer_url
    clientId          = module.auth.user_pool_client_id
    redirectUri       = "${module.frontend.website_url}/"
    logoutUri         = "${module.frontend.website_url}/"
    cognitoDomain     = module.auth.cognito_domain_url
    scope             = "openid email profile"
    allowedGroups     = [var.admin_group_name, var.analyst_group_name, var.viewer_group_name]
    profileApiUrl     = module.backend_api.profile_api_url
    telemetryApiUrl   = module.backend_api.telemetry_api_url
    adminAccessApiUrl = module.backend_api.admin_access_api_url
  }
}

resource "aws_s3_object" "runtime_config" {
  bucket       = module.frontend.bucket_name
  key          = "config.json"
  content      = jsonencode(local.runtime_config)
  content_type = "application/json"

  # Bust CloudFront cache when config changes
  cache_control = "no-cache, no-store, must-revalidate"

  depends_on = [module.frontend, module.auth, module.backend_api]
}
