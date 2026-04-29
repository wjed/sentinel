variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "force_destroy" {
  type    = bool
  default = true
}

variable "enable_custom_domain" {
  type    = bool
  default = false
}

variable "domain_name" {
  type    = string
  default = null
}

variable "create_route53_records" {
  type    = bool
  default = false
}

variable "hosted_zone_id" {
  type    = string
  default = null
}

variable "soc_alb_dns" {
  description = "ALB DNS name for SOC backend CloudFront behaviors (/thehive/*, /grafana/*). null = skip those behaviors."
  type        = string
  default     = null
}
