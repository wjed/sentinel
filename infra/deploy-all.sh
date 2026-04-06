#!/usr/bin/env bash
# Deploy all SentinelNet stacks in the correct order.
# Run from infra/:  ./deploy-all.sh
# Requires: AWS credentials set, frontend already built (npm run build in frontend/)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Deploying SentinelNet stacks ==="
echo "Order: Network -> UserData -> Backend -> Website"
echo ""

# 1. Network (VPC — everything depends on this)
echo ">>> Deploying SentinelNet-Network..."
cdk deploy SentinelNet-Network --require-approval never --exclusively

# 2. UserData (DynamoDB + S3)
echo ">>> Deploying SentinelNet-UserData..."
cdk deploy SentinelNet-UserData --require-approval never --exclusively

# 3. Backend (EC2 + Alert Pipeline)
echo ">>> Deploying SentinelNet-Backend..."
cdk deploy SentinelNet-Backend --require-approval never --exclusively

# 4. Website (CloudFront + Cognito); --exclusively avoids export conflicts
echo ">>> Deploying SentinelNet-Website..."
cdk deploy SentinelNet-Website --require-approval never --exclusively

echo ""
echo "=== All stacks deployed ==="
