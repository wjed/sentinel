# ──────────────────────────────────────────────────────────────────────────────
# Global
# ──────────────────────────────────────────────────────────────────────────────

variable "project_name" {
  description = "Short project identifier used as prefix in all resource names."
  type        = string
  default     = "sentinelnet"
}

variable "environment" {
  description = "Deployment environment label (dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "Primary AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "tags" {
  description = "Additional tags applied to every resource."
  type        = map(string)
  default     = {}
}

# ──────────────────────────────────────────────────────────────────────────────
# Deployment mode — custom domain vs CloudFront-only
# ──────────────────────────────────────────────────────────────────────────────

variable "enable_custom_domain" {
  description = <<-EOF
    false (default): No Route 53, no ACM cert, no aliases. Frontend accessible at the
    generated CloudFront URL — ideal for a fresh AWS account or student demo.

    true: Attach a custom domain via Route 53 + ACM + CloudFront aliases. Requires
    domain_name (and hosted_zone_id if create_route53_records = true).
  EOF
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Custom domain (e.g. sentinelnetsolutions.com). Required when enable_custom_domain = true."
  type        = string
  default     = null
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for domain_name. Required when create_route53_records = true."
  type        = string
  default     = null
}

variable "create_route53_records" {
  description = "Create Route 53 A/AAAA alias records pointing to CloudFront. Requires hosted_zone_id."
  type        = bool
  default     = false
}

variable "site_url_override" {
  description = <<-EOF
    Explicit site URL used for Cognito callback/logout URIs and SOC OIDC config.

    In custom_domain mode this is set automatically from var.domain_name.
    In cloudfront_only mode with create_soc_backend = true you MUST set this
    to the CloudFront URL output from a prior apply
    (e.g. "https://d1234abcd.cloudfront.net").
    Leave null for frontend-only or custom_domain deploys.
  EOF
  type        = string
  default     = null
}

# ──────────────────────────────────────────────────────────────────────────────
# Network
# ──────────────────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets — one per AZ. Two AZs required for ALB."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "allowed_admin_cidrs" {
  description = <<-EOF
    CIDRs allowed SSH access to the SOC backend EC2 instance.
    WARNING: default allows all IPs. Restrict to your IP range in production.
  EOF
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "wazuh_agent_allowed_cidrs" {
  description = "CIDRs allowed to connect Wazuh agents (ports 1514, 1515, 55000)."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ──────────────────────────────────────────────────────────────────────────────
# Cognito
# ──────────────────────────────────────────────────────────────────────────────

variable "cognito_domain_prefix" {
  description = "Prefix for the Cognito hosted-UI domain (must be globally unique in AWS)."
  type        = string
  default     = "sentinelnet"
}

variable "admin_group_name" {
  description = "Cognito group name for administrators."
  type        = string
  default     = "SentinelNetAdmins"
}

variable "analyst_group_name" {
  description = "Cognito group name for security analysts."
  type        = string
  default     = "SentinelNetAnalysts"
}

variable "viewer_group_name" {
  description = "Cognito group name for read-only viewers."
  type        = string
  default     = "SentinelNetViewers"
}

# ──────────────────────────────────────────────────────────────────────────────
# SOC Backend (EC2)
# ──────────────────────────────────────────────────────────────────────────────

variable "create_soc_backend" {
  description = <<-EOF
    true  (default): Deploy EC2 + Wazuh + TheHive + Grafana. Costs ~$40-60/month.
    false: Skip all EC2 resources — frontend + Lambda APIs only. Much cheaper (~$5-10/month).
  EOF
  type        = bool
  default     = true
}

variable "create_alb" {
  description = "Deploy an ALB in front of TheHive and Grafana. false (default) saves ~$18/month; services accessed directly via EC2 public IP."
  type        = bool
  default     = false
}

variable "instance_type" {
  description = "EC2 instance type for the SOC backend."
  type        = string
  default     = "t3.medium"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB."
  type        = number
  default     = 30
}

variable "key_pair_name" {
  description = "EC2 key pair name for SSH. Leave null to rely on SSM Session Manager."
  type        = string
  default     = null
}

# ──────────────────────────────────────────────────────────────────────────────
# Storage
# ──────────────────────────────────────────────────────────────────────────────

variable "force_destroy_buckets" {
  description = "Allow Terraform to destroy non-empty S3 buckets. true for dev, false for prod."
  type        = bool
  default     = true
}

variable "alert_retention_days" {
  description = "Days to retain alert objects in the data-lake S3 bucket (0 = no lifecycle rule)."
  type        = number
  default     = 1
}
