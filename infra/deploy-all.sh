#!/usr/bin/env bash
# Deploy all SentinelNet stacks in the correct order.
# Run from repo root:  ./infra/deploy-all.sh
# Or from infra:       ./deploy-all.sh
# Requires: AWS credentials set, frontend already built (npm run build in frontend/)
#
# If Network fails with "Cannot delete export ... in use by SentinelNet-Backend",
# run ./fix-network-export-conflict.sh once, then run this script again.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Deploying SentinelNet stacks ==="
echo "Order: Network -> UserData -> Website (exclusive) -> Backend"
echo ""

# 1. Network first (VPC; Backend depends on it)
echo ">>> Deploying SentinelNet-Network..."
cdk deploy SentinelNet-Network --require-approval never --exclusively

# 2. UserData (DynamoDB; Website profile API uses it)
echo ">>> Deploying SentinelNet-UserData..."
cdk deploy SentinelNet-UserData --require-approval never

# 3. Website (CloudFront + Cognito + profile API); --exclusively avoids UserData export issues
echo ">>> Deploying SentinelNet-Website..."
cdk deploy SentinelNet-Website --require-approval never --exclusively

# 4. Backend (ECS/Fargate) after Network
echo ">>> Deploying SentinelNet-Backend..."
cdk deploy SentinelNet-Backend --require-approval never

echo ""
echo "=== All stacks deployed ==="
