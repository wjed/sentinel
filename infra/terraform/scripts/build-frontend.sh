#!/usr/bin/env bash
# Build the React frontend and output to frontend/dist/
# Run from the repo root or any directory — uses absolute paths.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"

echo "==> Building SentinelNet frontend"
echo "    Source: $FRONTEND_DIR"

cd "$FRONTEND_DIR"

if [ ! -f package.json ]; then
  echo "ERROR: frontend/package.json not found. Are you in the right repo?" >&2
  exit 1
fi

echo "==> npm install"
npm install

echo "==> npm run build"
npm run build

DIST_DIR="$FRONTEND_DIR/dist"
if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: Build failed — dist/ not found." >&2
  exit 1
fi

echo ""
echo "✓ Frontend built successfully: $DIST_DIR"
echo "  Run terraform apply, then sync with deploy script."
