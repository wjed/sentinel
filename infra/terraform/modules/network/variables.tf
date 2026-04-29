variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "allowed_admin_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "wazuh_agent_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}
