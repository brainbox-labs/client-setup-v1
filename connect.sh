#!/usr/bin/env bash
# Connects the ecommerce demo to BrainBox using the brainbox repo CLI flow:
#   1. Init repo
#   2. Stage sources
#   3. Commit + push
#   4. Generate context layer (LLM, ~2 min)
#   5. Approve + pull
#
# Prerequisites: brainbox CLI in PATH, .env loaded
# Usage: npm run connect

set -euo pipefail
source .env

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="${BRAINBOX_API_URL:-http://localhost:3001}"
ORG="${BRAINBOX_ORG:?Set BRAINBOX_ORG in .env}"
PROJECT="${BRAINBOX_PROJECT:?Set BRAINBOX_PROJECT in .env}"
DB_URL="${DATABASE_URL:-${DB:-}}"

echo "================================================================"
echo " BrainBox E-Commerce Demo — Setup"
echo "================================================================"
echo " API:     $API_URL"
echo " Org:     $ORG"
echo " Project: $PROJECT"
echo ""

# Find brainbox CLI (assumes local install in node_modules)
# if globally installed, use that otherwise fallback to local node_modules
if command -v brainbox &> /dev/null; then
  echo "Using global brainbox CLI"
else
  if [ -f "./node_modules/.bin/brainbox" ]; then
    export PATH="$PATH:./node_modules/.bin"
    echo "Using local brainbox CLI from node_modules"
  else
    echo "Error: brainbox CLI not found. Please install it globally or locally in node_modules."
    exit 1
  fi
fi

# ── Step 1: Init repo ─────────────────────────────────────────────────────────
echo "[1/5] Initialising repo…"
brainbox repo init

# ── Step 2: Stage sources ─────────────────────────────────────────────────────
echo "[2/5] Staging sources…"
brainbox meta ingest db "${DB_URL:?Set DATABASE_URL (or DB) in .env}" --tables amazon_disbursment,amazon_fee_preview
# shellcheck disable=SC2086
# brainbox meta ingest doc "$SCRIPT_DIR"/policies/*.md

# ── Step 3: Commit + push ─────────────────────────────────────────────────────
echo "[3/5] Committing and pushing…"
brainbox repo commit -m "ecommerce schema + store policies"
brainbox repo push

exit

# ── Step 4: Generate context layer (LLM, ~2 min) ─────────────────────────────
echo "[4/5] Generating context layer (LLM, ~2 min)…"
brainbox repo meta create -m "ecommerce context layer"

# ── Step 5: Approve + pull ────────────────────────────────────────────────────
echo "[5/5] Approving and pulling active layer…"
# brainbox repo meta approve
# brainbox repo pull

echo ""
echo "================================================================"
echo " Done! Start the MCP server:  npm run serve"
echo " Then open Claude Desktop and ask questions from DEMO.md"
echo "================================================================"
