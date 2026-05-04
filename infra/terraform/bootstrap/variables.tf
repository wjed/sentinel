variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "state_bucket_name" {
  type        = string
  description = "Globally-unique name for the Terraform state bucket."
  default     = "sentinelnet-terraform-state-639418629910"
}

variable "lock_table_name" {
  type    = string
  default = "sentinelnet-terraform-locks"
}
