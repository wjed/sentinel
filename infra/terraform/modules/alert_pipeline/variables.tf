variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "force_destroy_buckets" {
  type    = bool
  default = true
}

variable "alert_retention_days" {
  description = "Days to keep alert objects (0 = no expiration)."
  type        = number
  default     = 1
}
