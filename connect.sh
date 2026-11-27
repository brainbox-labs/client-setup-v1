#!/usr/bin/env bash
# Connects your database to BrainBox with a single `brainbox ingest` call
# (stage, generate the context layer, and publish a new brain version).
#
# Prerequisites: .env loaded with DATABASE_URL, BRAINBOX_ORG, BRAINBOX_PROJECT
#
# DATABASE_URL accepts:
#   postgres://user:pass@host:5432/dbname
#   trino://user[:password]@host:8080/catalog[/schema][?ssl=true]
#     e.g. trino://analyst:secret@trino.internal:8080/hive/analytics?ssl=true
#     (requires the optional "trino-client" npm package)
#   athena://<region>/<database>?catalog=AwsDataCatalog&workgroup=primary&output=s3://my-athena-results-bucket/
#     (athena:// / awsathena:// also require AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env)
#
# Usage: bash connect.sh

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

# ── Ingest ────────────────────────────────────────────────────────────────────
# Add --review to stop before publishing and approve later with:
#   brainbox repo meta approve
echo "Ingesting database (~2-5 min)…"
brainbox ingest "$DB_URL" --org "$ORG" --project "$PROJECT"

echo ""
echo "================================================================"
echo " Done! Next steps (run manually):"
echo ""
echo " 1. Register the BrainBox MCP server with Claude Code:"
echo "    claude mcp add --transport http --scope project brain https://ctx.brainbox-ai.app/api/mcp --header \"Authorization: Bearer \$BRAINBOX_MCP_KEY\""
echo ""
echo " 2. (Optional) Start the local MCP server for live SQL access:"
echo "    npx brainbox dev start --no-brain"
echo "================================================================"
