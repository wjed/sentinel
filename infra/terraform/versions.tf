terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Remote state — bucket + lock table are provisioned by ./bootstrap
  backend "s3" {
    bucket         = "sentinelnet-terraform-state-639418629910"
    key            = "sentinelnet/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "sentinelnet-terraform-locks"
    encrypt        = true
  }
}
