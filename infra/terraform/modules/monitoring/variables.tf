variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty threat detection."
  type        = bool
  default     = false
}
