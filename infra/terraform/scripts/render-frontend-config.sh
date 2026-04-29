#!/usr/bin/env bash
# Render frontend/public/config.json from current Terraform outputs.
# Useful for local development against a deployed backend.
# Run from infra/terraform/ directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$TF_DIR/../.." && pwd)"
OUT_FILE="$REPO_ROOT/frontend/public/config.json"

echo "==> Reading Terraform outputs from $TF_DIR"
cd "$TF_DIR"

get_output() {
  terraform output -raw "$1" 2>/dev/null || echo ""
}

WEBSITE_URL=$(get_output website_url)
COGNITO_POOL_ID=$(get_output cognito_user_pool_id)
COGNITO_CLIENT_ID=$(get_output cognito_user_pool_client_id)
COGNITO_DOMAIN_URL=$(get_output cognito_domain_url)
PROFILE_API=$(get_output profile_api_url)
TELEMETRY_API=$(get_output telemetry_api_url)
ADMIN_API=$(get_output admin_access_api_url)
REGION=$(terraform output -raw -chdir="$TF_DIR" aws_region 2>/dev/null || echo "us-east-1")

if [ -z "$COGNITO_POOL_ID" ]; then
  echo "ERROR: No Terraform outputs found. Run 'terraform apply' first." >&2
  exit 1
fi

ISSUER_URL="https://cognito-idp.us-east-1.amazonaws.com/${COGNITO_POOL_ID}"

mkdir -p "$(dirname "$OUT_FILE")"

cat > "$OUT_FILE" << EOF
{
  "authority": "${ISSUER_URL}",
  "clientId": "${COGNITO_CLIENT_ID}",
  "redirectUri": "${WEBSITE_URL}/",
  "logoutUri": "${WEBSITE_URL}/",
  "cognitoDomain": "${COGNITO_DOMAIN_URL}",
  "scope": "openid email",
  "allowedGroups": ["SentinelNetAdmins", "SentinelNetAnalysts", "SentinelNetViewers"],
  "profileApiUrl": "${PROFILE_API}",
  "telemetryApiUrl": "${TELEMETRY_API}",
  "adminAccessApiUrl": "${ADMIN_API}"
}
EOF

echo "✓ Written: $OUT_FILE"
echo "  Restart your dev server (npm run dev) to pick up the new config."
