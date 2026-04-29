variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "domain_prefix" {
  description = "Cognito hosted-UI domain prefix (must be globally unique)."
  type        = string
}

variable "admin_group_name" {
  type    = string
  default = "SentinelNetAdmins"
}

variable "analyst_group_name" {
  type    = string
  default = "SentinelNetAnalysts"
}

variable "viewer_group_name" {
  type    = string
  default = "SentinelNetViewers"
}

variable "callback_urls" {
  description = "Allowed callback URLs for the web app client."
  type        = list(string)
}

variable "logout_urls" {
  description = "Allowed logout URLs for the web app client."
  type        = list(string)
}

variable "soc_callback_urls" {
  description = "Allowed callback URLs for the SOC services client (TheHive + Grafana + ALB)."
  type        = list(string)
  default     = []
}

variable "default_admin_username" {
  description = "Default admin username created at deploy time for immediate testing."
  type        = string
  default     = "jack"
}

variable "default_admin_password" {
  description = "Default admin password (must meet pool policy: 8+ chars, upper, lower, number)."
  type        = string
  sensitive   = true
  default     = "Teamcarry1!"
}

variable "default_admin_email" {
  description = "Email for the default admin user."
  type        = string
  default     = "jacknelson2351@gmail.com"
}
