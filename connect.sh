#!/usr/bin/env bash
# Connects your database to BrainBox using the brainbox CLI:
#   1. Init repo
#   2. Stage sources
#   3. Commit + push
#   4. Generate context layer (LLM, ~2-5 min) — run manually
#   5. Review + approve — run manually
#   6. Pull active layer — run manually
#
# Prerequisites: .env loaded with DATABASE_URL, BRAINBOX_ORG, BRAINBOX_PROJECT
#
# DATABASE_URL accepts:
#   postgres://user:pass@host:5432/dbname
#   trino://user[:password]@host[:port]/catalog[/schema]
#   athena://<region>/<database>?catalog=AwsDataCatalog&workgroup=primary&output=s3://my-athena-results-bucket/
#     (athena:// / awsathena:// also require AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env)
#
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
echo "    brainbox repo meta status        # poll until status: ready"
echo ""
echo " 5. Review the generated annotations at the review URL printed above,"
echo "    then approve once you're happy with them:"
echo "    brainbox repo meta approve"
echo ""
echo " 6. Pull the active layer:"
echo "    brainbox repo pull"
echo ""
echo " 7. Register the BrainBox MCP server with Claude Code:"
echo "    claude mcp add --transport http --scope project brain https://ctx.brainbox-ai.app/api/mcp --header \"Authorization: Bearer \$BRAINBOX_MCP_KEY\""
echo ""
echo " 8. Start the local MCP server:"
echo "    npm run serve"
echo "================================================================"
