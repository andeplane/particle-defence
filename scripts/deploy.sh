#!/usr/bin/env bash
# Deploy the signaling server to Fly.io, then print the wss:// URL.
# Run from the repo root: ./scripts/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/.."

# ── 1. Check flyctl is installed ─────────────────────────────────────────────
if ! command -v flyctl &>/dev/null; then
  echo "flyctl not found. Install it:"
  echo "  brew install flyctl        (macOS)"
  echo "  curl -L https://fly.io/install.sh | sh  (Linux)"
  exit 1
fi

# ── 2. Deploy ─────────────────────────────────────────────────────────────────
echo "▶ Deploying signaling server..."
cd server
flyctl deploy --remote-only

# ── 3. Get the hostname ───────────────────────────────────────────────────────
APP=$(flyctl info --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['Name'])" 2>/dev/null || grep '^app' fly.toml | awk -F'"' '{print $2}')
HOST="${APP}.fly.dev"
WSS_URL="wss://${HOST}"

echo ""
echo "✅ Deployed! Signaling server is live at:"
echo "   ${WSS_URL}"
echo ""
echo "Now build the game client pointing at it:"
echo "   VITE_SIGNALING_URL=${WSS_URL} npm run build"
echo ""
echo "Or update your CI/hosting env var:"
echo "   VITE_SIGNALING_URL=${WSS_URL}"
