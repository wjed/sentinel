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

  # ─────────────────────────────────────────────────────────────────────────
  # Optional remote state backend.
  # Uncomment and fill in bucket/table names to use S3 + DynamoDB locking.
  # Create the bucket and table manually (or with a bootstrap config) first.
  # ─────────────────────────────────────────────────────────────────────────
  # backend "s3" {
  #   bucket         = "sentinelnet-terraform-state-<account-id>"
  #   key            = "sentinelnet/<environment>/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "sentinelnet-terraform-locks"
  #   encrypt        = true
  # }
}
