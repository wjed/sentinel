variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

# ── Cognito ───────────────────────────────────────────────────────────────────

variable "user_pool_id" {
  type = string
}

variable "user_pool_arn" {
  type = string
}

variable "user_pool_client_id" {
  type = string
}

variable "issuer_url" {
  type = string
}

variable "admin_group_name" {
  type = string
}

variable "analyst_group_name" {
  type = string
}

variable "viewer_group_name" {
  type = string
}

variable "allowed_groups" {
  type = list(string)
}

# ── Storage ───────────────────────────────────────────────────────────────────

variable "profiles_table_name" {
  type = string
}

variable "profiles_table_arn" {
  type = string
}

variable "profile_pictures_bucket_name" {
  type = string
}

variable "profile_pictures_bucket_arn" {
  type = string
}

variable "alerts_bucket_name" {
  type = string
}

variable "alerts_bucket_arn" {
  type = string
}

# ── Lambda source directories ─────────────────────────────────────────────────

variable "profile_lambda_dir" {
  description = "Path to the profile_api_py Lambda source directory."
  type        = string
}

variable "admin_access_lambda_dir" {
  description = "Path to the admin_access_api_py Lambda source directory."
  type        = string
}

variable "telemetry_lambda_dir" {
  description = "Path to the telemetry_api Lambda source directory."
  type        = string
}
