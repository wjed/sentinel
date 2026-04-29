#!/usr/bin/env bash
# Deploy SentinelNet in production mode — custom domain, full Cognito SSO.
#
# Single-phase deploy (no two-phase needed — custom domain URL is known at plan time).
# ACM cert validation happens automatically via Route 53; Terraform waits for it.
# First deploy takes ~10-20 minutes (ACM + CloudFront creation). Re-deploys are fast.
#
# Prerequisites:
#   - Route 53 hosted zone created and nameservers pointed at it (one-time)
#   - envs/prod.tfvars filled in (domain_name, hosted_zone_id)
#   - AWS CLI configured
#   - Terraform >= 1.5, Node.js + npm
#
# Usage:
#   cd infra/terraform
#   cp envs/prod.tfvars.example envs/prod.tfvars   # first time only
#   # Edit prod.tfvars with your domain_name and hosted_zone_id
#   ./scripts/deploy-prod-domain.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$TF_DIR/../.." && pwd)"

echo "=================================================================="
echo " SentinelNet — Production deploy (sentinelnetsolutions.com)"
echo " Config: terraform.tfvars"
echo " Note: first deploy takes ~15-20 min (ACM cert + CloudFront)."
echo "       Re-deploys are fast (~3-5 min)."
echo "=================================================================="

cd "$TF_DIR"

# Sanity check — make sure hosted_zone_id is filled in
if grep -q "FILL_IN_AFTER" terraform.tfvars 2>/dev/null; then
  echo "ERROR: terraform.tfvars still has a placeholder value."
  echo "  Fill in hosted_zone_id with your Route 53 zone ID (Z...)."
  exit 1
fi

terraform init -upgrade

# ── 1. Build frontend ─────────────────────────────────────────────────────────
echo ""
echo "[1/4] Building frontend..."
"$SCRIPT_DIR/build-frontend.sh"

# ── 2. Terraform apply (single phase — URL known from domain_name) ─────────────
echo ""
echo "[2/4] Terraform apply..."
terraform apply -auto-approve

# ── 3. Sync frontend to S3 ────────────────────────────────────────────────────
echo ""
echo "[3/4] Syncing frontend to S3..."
BUCKET=$(terraform output -raw frontend_bucket_name)
DIST_DIR="$REPO_ROOT/frontend/dist"

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: frontend/dist not found." >&2
  exit 1
fi

aws s3 sync "$DIST_DIR/" "s3://$BUCKET/" \
  --delete \
  --cache-control "public,max-age=86400" \
  --exclude "config.json"

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
THEHIVE=$(terraform output -raw thehive_url 2>/dev/null || echo "")
GRAFANA=$(terraform output -raw grafana_url 2>/dev/null || echo "")
SOC_IP=$(terraform output -raw soc_public_ip 2>/dev/null || echo "")

echo " Deployment complete!"
echo ""
echo "   Website:      $WEBSITE"
echo "   TheHive:      $THEHIVE"
echo "   Grafana:      $GRAFANA"
echo "   Cognito Pool: $(terraform output -raw cognito_user_pool_id)"
echo ""
echo "   $(terraform output -raw test_credentials)"
echo ""
echo " SOC services take 5-10 min to start on first boot."
echo " Check status: aws ssm start-session --target $(terraform output -raw soc_instance_id 2>/dev/null || echo '<instance-id>')"
echo ""
if [ -n "$SOC_IP" ] && [ "$SOC_IP" != "null" ]; then
  echo " Connect Wazuh agents to: $SOC_IP"
  echo "   Port 1514 — agent events"
  echo "   Port 1515 — agent registration"
  echo "   Install agent:"
  echo "     WAZUH_MANAGER=\"$SOC_IP\" dpkg -i wazuh-agent_4.9.2-1_amd64.deb"
fi
echo ""
echo " Teardown: ./scripts/destroy-prod.sh"
echo "=================================================================="
