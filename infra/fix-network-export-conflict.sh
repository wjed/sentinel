#!/usr/bin/env bash
# ONE-TIME FIX when: "Cannot delete export ... as it is in use by SentinelNet-Backend"
# (Network deploy fails because an old Backend stack in AWS still imports Network's exports.)
#
# This script: 1) Destroys Backend in AWS  2) Updates Network  3) Recreates Backend
# Run from repo root:  ./infra/fix-network-export-conflict.sh
# Or from infra:       ./fix-network-export-conflict.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Fixing Network/Backend export conflict ==="
echo "This will: 1) Destroy SentinelNet-Backend  2) Deploy Network  3) Deploy Backend"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo ">>> Destroying SentinelNet-Backend (releases Network exports)..."
cdk destroy SentinelNet-Backend --force

echo ">>> Deploying SentinelNet-Network (exclusive)..."
cdk deploy SentinelNet-Network --require-approval never --exclusively

echo ">>> Deploying SentinelNet-Backend..."
cdk deploy SentinelNet-Backend --require-approval never

echo ""
echo "=== Done. Network and Backend are in sync; you can deploy other stacks as needed. ==="
