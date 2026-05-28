#!/usr/bin/env bash
# Connects your database to BrainBox using the brainbox CLI:
#   1. Init repo
#   2. Stage sources
#   3. Commit + push
#   4. Generate context layer (LLM, ~2-5 min) — run manually
#   5. Pull active layer — run manually
#
# Prerequisites: .env loaded with DATABASE_URL, BRAINBOX_ORG, BRAINBOX_PROJECT
# Usage: npm run connect

set -euo pipefail
source .env

ORG="${BRAINBOX_ORG:?Set BRAINBOX_ORG in .env}"
PROJECT="${BRAINBOX_PROJECT:?Set BRAINBOX_PROJECT in .env}"
DB_URL="${DATABASE_URL:?Set DATABASE_URL in .env}"

echo "================================================================"
echo " BrainBox — Connect"
echo "================================================================"
echo " Org:     $ORG"
echo " Project: $PROJECT"
echo ""

if command -v brainbox &> /dev/null; then
  echo "Using global brainbox CLI"
elif [ -f "./node_modules/.bin/brainbox" ]; then
  export PATH="$PATH:./node_modules/.bin"
  echo "Using local brainbox CLI from node_modules"
else
  echo "Error: brainbox CLI not found. Run: npm install"
  exit 1
fi

# ── Step 1: Init repo ─────────────────────────────────────────────────────────
echo "[1/3] Initialising repo…"
brainbox repo init

# ── Step 2: Stage sources ─────────────────────────────────────────────────────
echo "[2/3] Staging database…"
brainbox meta ingest db "$DB_URL"

# ── Step 3: Commit + push ─────────────────────────────────────────────────────
echo "[3/3] Committing and pushing…"
brainbox repo commit -m "initial schema"
brainbox repo push

echo ""
echo "================================================================"
echo " Done! Next steps (run manually):"
echo ""
echo " 4. Generate context layer (~2-5 min):"
echo "    brainbox repo meta create -m \"initial context layer\""
echo ""
echo " 5. Pull the active layer once approved:"
echo "    brainbox repo pull"
echo ""
echo " 6. Register the BrainBox MCP server with Claude Code:"
echo "    claude mcp add --transport http --scope project brain https://ctx.brainbox-ai.app/api/mcp --header \"Authorization: Bearer \$BRAINBOX_MCP_KEY\""
echo ""
echo " 7. Start the local MCP server:"
echo "    npm run serve"
echo "================================================================"
