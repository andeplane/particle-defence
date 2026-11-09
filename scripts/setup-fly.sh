#!/usr/bin/env bash
# First-time Fly.io setup: creates the app (run once before deploy.sh).
#
# Prerequisites:
#   brew install flyctl   (or curl -L https://fly.io/install.sh | sh)
#   flyctl auth login

set -euo pipefail

APP_NAME="particle-defence-signaling"

if ! command -v flyctl &>/dev/null; then
  echo "flyctl not found. Install it:"
  echo "  brew install flyctl"
  exit 1
fi

if ! flyctl auth whoami &>/dev/null; then
  echo "Not logged in. Running: flyctl auth login"
  flyctl auth login
fi

echo "▶ Creating Fly.io app: ${APP_NAME}"
flyctl apps create "${APP_NAME}" || true   # 'true' so re-running doesn't fail if app exists

echo ""
echo "✅ Done. Now run:  ./scripts/deploy.sh"
