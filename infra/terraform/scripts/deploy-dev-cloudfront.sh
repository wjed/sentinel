#!/usr/bin/env bash
# One-step SentinelNet deploy in CloudFront-only mode.
#
# Phase 1 (skipped if CloudFront already exists): deploy frontend to get the
#   CloudFront URL — needed for Cognito callbacks and SOC OIDC config.
# Phase 2: full stack deploy with the discovered CloudFront URL injected via
#   -var="site_url_override=..." so Cognito and Docker containers are correct.
#
# Usage:
#   cd infra/terraform
#   ./scripts/deploy-dev-cloudfront.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$TF_DIR/../.." && pwd)"

echo "=================================================================="
echo " SentinelNet — Dev CloudFront deploy"
echo " Terraform dir : $TF_DIR"
echo " Repo root     : $REPO_ROOT"
echo "=================================================================="

cd "$TF_DIR"
terraform init -upgrade

# ── 1. Build frontend ─────────────────────────────────────────────────────────
echo ""
echo "[1/4] Building frontend..."
"$SCRIPT_DIR/build-frontend.sh"

# ── 2. Terraform — two-phase apply ───────────────────────────────────────────
echo ""

# Check if CloudFront URL is already known from existing state.
# If it is, skip phase 1 (avoid destroying a running SOC backend).
CLOUDFRONT_URL=""
set +e
EXISTING_URL=$(terraform output -raw website_url 2>/dev/null)
set -e

if [[ -n "$EXISTING_URL" && "$EXISTING_URL" != *"PENDING"* && "$EXISTING_URL" == *"cloudfront.net"* ]]; then
  CLOUDFRONT_URL="$EXISTING_URL"
  echo "[2/4] CloudFront already exists: $CLOUDFRONT_URL"
  echo "      Skipping phase 1, going straight to full deploy."
else
  echo "[2a/4] Phase 1: deploying frontend + APIs to get CloudFront URL..."
  terraform apply \
    -var-file=envs/dev.tfvars \
    -var="create_soc_backend=false" \
    -auto-approve

  CLOUDFRONT_URL=$(terraform output -raw website_url)
  echo "       CloudFront URL: $CLOUDFRONT_URL"
  echo ""
  echo "[2b/4] Phase 2: full stack with CloudFront URL injected..."
fi

terraform apply \
  -var-file=envs/dev.tfvars \
  -var="site_url_override=$CLOUDFRONT_URL" \
  -auto-approve

# ── 3. Sync frontend to S3 ────────────────────────────────────────────────────
echo ""
echo "[3/4] Syncing frontend/dist to S3..."
BUCKET=$(terraform output -raw frontend_bucket_name)
DIST_DIR="$REPO_ROOT/frontend/dist"

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: frontend/dist not found. Did the build succeed?" >&2
  exit 1
fi

aws s3 sync "$DIST_DIR/" "s3://$BUCKET/" \
  --delete \
  --cache-control "public,max-age=86400" \
  --exclude "config.json"

# config.json is managed by Terraform — no-cache header
aws s3 cp \
  --cache-control "no-cache,no-store,must-revalidate" \
  "s3://$BUCKET/config.json" "s3://$BUCKET/config.json" \
  --metadata-directive REPLACE \
  2>/dev/null || true

# ── 4. Invalidate CloudFront cache ────────────────────────────────────────────
echo ""
echo "[4/4] Invalidating CloudFront cache..."
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "=================================================================="
WEBSITE=$(terraform output -raw website_url)
echo " Deployment complete!"
echo ""
echo "   Website:      $WEBSITE"
echo "   Cognito Pool: $(terraform output -raw cognito_user_pool_id)"
echo "   Profile API:  $(terraform output -raw profile_api_url)"
echo "   $(terraform output -raw test_credentials)"

THEHIVE=$(terraform output -raw thehive_url 2>/dev/null || echo "")
GRAFANA=$(terraform output -raw grafana_url 2>/dev/null || echo "")
if [ -n "$THEHIVE" ] && [ "$THEHIVE" != "null" ]; then
  echo ""
  echo "   TheHive:  $THEHIVE"
  echo "   Grafana:  $GRAFANA"
  echo "   (SOC services take 5-10 minutes to start on first boot)"
fi
echo ""
echo " CloudFront propagation: ~1-2 minutes."
echo "=================================================================="
