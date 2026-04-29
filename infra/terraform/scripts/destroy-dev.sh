#!/usr/bin/env bash
# Safely destroy the dev environment.
# Prompts for confirmation before proceeding.
#
# Usage:
#   cd infra/terraform
#   ./scripts/destroy-dev.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=================================================================="
echo " SentinelNet — Destroy dev environment"
echo " This will DELETE all resources in the dev environment."
echo "=================================================================="
echo ""

read -rp "Type 'destroy' to confirm: " CONFIRM
if [ "$CONFIRM" != "destroy" ]; then
  echo "Aborted."
  exit 0
fi

cd "$TF_DIR"

echo ""
echo "Destroying dev environment..."
terraform destroy -var-file=envs/dev.tfvars -auto-approve

echo ""
echo "✓ Dev environment destroyed."
echo "  S3 buckets and DynamoDB tables are removed (force_destroy = true in dev.tfvars)."
