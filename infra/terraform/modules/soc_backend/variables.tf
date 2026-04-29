variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

# ── Network ───────────────────────────────────────────────────────────────────

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "ec2_sg_id" {
  type = string
}

variable "alb_sg_id" {
  type = string
}

# ── EC2 spec ──────────────────────────────────────────────────────────────────

variable "create_alb" {
  description = "Deploy an ALB in front of TheHive and Grafana. false saves ~$18/month; access services directly via EC2 public IP."
  type        = bool
  default     = false
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "root_volume_size" {
  type    = number
  default = 30
}

variable "key_pair_name" {
  type    = string
  default = null
}

# ── Cognito ───────────────────────────────────────────────────────────────────

variable "user_pool_id" {
  type = string
}

variable "user_pool_arn" {
  type = string
}

variable "user_pool_domain" {
  description = "Cognito domain prefix (not full URL)."
  type        = string
}

variable "cognito_domain_url" {
  description = "Full Cognito hosted-UI URL, e.g. https://prefix.auth.us-east-1.amazoncognito.com."
  type        = string
}

variable "soc_client_id" {
  type = string
}

variable "soc_client_secret" {
  type      = string
  sensitive = true
}

variable "site_url" {
  description = "Public site URL for OIDC redirect URIs (e.g. https://site.com or https://xxxx.cloudfront.net)."
  type        = string
}

# ── Alert ingestion ───────────────────────────────────────────────────────────

variable "sqs_queue_url" {
  type = string
}

variable "sqs_queue_arn" {
  description = "SQS queue ARN for the wazuh ingest Lambda event source mapping."
  type        = string
}

variable "alerts_bucket_name" {
  type = string
}

variable "alerts_bucket_arn" {
  type = string
}

# ── Custom domain mode ────────────────────────────────────────────────────────

variable "enable_custom_domain" {
  type    = bool
  default = false
}

variable "domain_name" {
  type    = string
  default = null
}

variable "hosted_zone_id" {
  type    = string
  default = null
}

# ── Lambda source ─────────────────────────────────────────────────────────────

variable "wazuh_ingest_lambda_dir" {
  type = string
}
