#!/usr/bin/env bash
# Tear down the production SentinelNet environment completely.
#
# If force_destroy_buckets = true in prod.tfvars, terraform destroy handles S3.
# If force_destroy_buckets = false, this script empties the buckets first so
# destroy doesn't fail.
#
# After destroy: you pay $0 (Route 53 zone + domain registration are outside
# Terraform and not destroyed here — keep the zone so you don't have to
# re-point nameservers on the next deploy).
#
# Usage:
#   cd infra/terraform
#   ./scripts/destroy-prod.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$TF_DIR"

echo "=================================================================="
echo " SentinelNet — PRODUCTION TEARDOWN"
echo " All AWS resources will be destroyed. Route 53 zone is preserved."
echo "=================================================================="
echo ""

read -rp "Type 'destroy' to confirm: " CONFIRM
if [ "$CONFIRM" != "destroy" ]; then
  echo "Aborted."
  exit 0
fi

# ── Empty S3 buckets so destroy doesn't fail ────────────────────────────────
echo ""
echo "Emptying S3 buckets..."

empty_bucket() {
  local bucket="$1"
  if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
    echo "  Emptying s3://$bucket ..."
    aws s3 rm "s3://$bucket" --recursive --quiet 2>/dev/null || true
    # Remove any versioned objects
    aws s3api list-object-versions --bucket "$bucket" \
      --query 'Versions[].{Key:Key,VersionId:VersionId}' \
      --output json 2>/dev/null | \
      jq -r '.[] | "s3://'$bucket'/\(.Key)?versionId=\(.VersionId)"' 2>/dev/null | \
      while read -r obj; do
        aws s3 rm "$obj" --quiet 2>/dev/null || true
      done
    aws s3api list-object-versions --bucket "$bucket" \
      --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' \
      --output json 2>/dev/null | \
      jq -r '.[] | "\(.Key) \(.VersionId)"' 2>/dev/null | \
      while read -r key ver; do
        aws s3api delete-object --bucket "$bucket" --key "$key" --version-id "$ver" --quiet 2>/dev/null || true
      done
  fi
}

set +e
FRONTEND_BUCKET=$(terraform output -raw frontend_bucket_name 2>/dev/null)
ALERTS_BUCKET=$(terraform output -raw alerts_bucket_name 2>/dev/null)
set -e

[ -n "$FRONTEND_BUCKET" ] && empty_bucket "$FRONTEND_BUCKET"
[ -n "$ALERTS_BUCKET" ]   && empty_bucket "$ALERTS_BUCKET"

# ── Stop EC2 instance first (faster destroy) ─────────────────────────────────
set +e
INSTANCE_ID=$(terraform output -raw soc_instance_id 2>/dev/null)
set -e
if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "null" ]; then
  echo ""
  echo "Stopping EC2 instance $INSTANCE_ID ..."
  aws ec2 stop-instances --instance-ids "$INSTANCE_ID" --output text > /dev/null 2>&1 || true
fi

# ── Terraform destroy ─────────────────────────────────────────────────────────
echo ""
echo "Running terraform destroy..."
terraform destroy -auto-approve

echo ""
echo "=================================================================="
echo " Teardown complete. You are no longer being charged for:"
echo "   - EC2 instance (t3.medium)"
echo "   - ALB"
echo "   - CloudFront distribution"
echo "   - S3 buckets"
echo "   - Lambda functions"
echo "   - SQS queues"
echo "   - DynamoDB tables"
echo "   - Cognito user pool"
echo ""
echo " Still active (minimal cost):"
echo "   - Route 53 hosted zone: ~\$0.50/month (intentionally preserved)"
echo "     Keep it so you don't have to re-point nameservers next deploy."
echo ""
echo " To redeploy: ./scripts/deploy-prod-domain.sh"
echo "=================================================================="
