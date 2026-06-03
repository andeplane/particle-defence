#!/usr/bin/env bash
# First-time Fly.io setup: creates the app and configures it.
# Run once before deploy.sh: ./scripts/setup-fly.sh
#
# Prerequisites:
#   brew install flyctl   (or curl -L https://fly.io/install.sh | sh)
#   flyctl auth login

set -euo pipefail

cd "$(dirname "$0")/../server"

if ! command -v flyctl &>/dev/null; then
  echo "flyctl not found. Install it:"
  echo "  brew install flyctl"
  exit 1
fi

if ! flyctl auth whoami &>/dev/null; then
  echo "Not logged in. Running: flyctl auth login"
  flyctl auth login
fi

echo "▶ Creating Fly.io app..."
# --no-deploy skips the first deploy so we can configure first
flyctl launch --no-deploy --copy-config

echo ""
echo "✅ App created. Run the following to deploy:"
echo "   ./scripts/deploy.sh"
