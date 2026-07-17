# BrainBox Client Setup

This repository provides everything you need to explore the BrainBox context layer for your agents — including creating and querying your knowledge base and MCP integrations.

- **Product / app:** https://ctx.brainbox-ai.app/
- **Website:** https://brainbox-ai.app/

---

## Prerequisites

Before getting started, obtain the following (your org admin can generate these from the BrainBox app at [ctx.brainbox-ai.app/orgs](https://ctx.brainbox-ai.app/orgs) — open your org's API keys page for org/tenant keys, or a project's page for its project key):

| Credential | Purpose |
|---|---|
| `NODE_AUTH_TOKEN` | GitHub token — installs the BrainBox CLI and skills from `npm.pkg.github.com` |
| Org & project name | Identifies your BrainBox project |
| `BRAINBOX_API_KEY` | Org-level key for CLI operations (starts with `bb_`) |
| `BRAINBOX_MCP_KEY` | Project-level key for the BrainBox MCP server (starts with `bb_proj_`) |
| `BRAINBOX_TENANT_KEY` | Tenant-level key for the BrainBox MCP server (starts with `bb_tenant_`) |

### Knowledge scopes

BrainBox knowledge can be shared or isolated at three levels — pick whichever key/URL pair fits how you want to query:

| Scope | Covers | Access | Key prefix | MCP path |
|---|---|---|---|---|
| **Project** | One project's knowledge only | Read / write | `bb_proj_` | `/api/mcp` |
| **Tenant** | One or more projects grouped together | Read-only (learnings save to the tenant scope; an admin can later promote them into a project) | `bb_tenant_` | `/api/tenant-mcp` |
| **Org** | Every project in the org | Confirm access level on the [orgs page](https://ctx.brainbox-ai.app/orgs) | `bb_` (same as `BRAINBOX_API_KEY`) | `/api/org-mcp` |

Only set up the MCP server for the scope(s) you actually need — the configs for all three are below.

---

## Installation

1. **Copy and configure the environment file:**

   ```bash
   cp env.example .env
   # Open .env and fill in your credentials
   ```

2. **Load environment variables and install dependencies:**

   ```bash
   source .env
   npm install
   ```

   `npm install` triggers the package's `prepare` script (`skills-npm`), which interactively asks which agent you use (Claude Code, Codex, etc.) and installs the matching BrainBox slash commands (`/brain-setup`, `/brain-ingest`, `/brain-recall`, `/brain-workflow`, etc.) to `~/.claude/skills/`.

   Run `npm update` later to pick up new CLI/skill versions as needed.

---

## MCP Server Configuration

### BrainBox MCP (cloud — brain knowledge layer)

Add the following to your Claude MCP configuration (e.g., `.mcp.json`). Use whichever scope matches the key you generated from the [orgs page](https://ctx.brainbox-ai.app/orgs):

**Project-level** (scoped to a single BrainBox project, key starts with `bb_proj_`):

```json
{
  "mcpServers": {
    "brain": {
      "url": "https://ctx.brainbox-ai.app/api/mcp",
      "headers": {
        "Authorization": "Bearer <BRAINBOX_MCP_KEY>"
      },
      "type": "http"
    }
  }
}
```

**Tenant-level** (key starts with `bb_tenant_`):

```json
{
  "mcpServers": {
    "brainTenant": {
      "url": "https://ctx.brainbox-ai.app/api/tenant-mcp",
      "headers": {
        "Authorization": "Bearer <BRAINBOX_TENANT_KEY>"
      },
      "type": "http"
    }
  }
}
```

**Org-level** (org-wide across all projects, key starts with `bb_` — same key as `BRAINBOX_API_KEY`):

```json
{
  "mcpServers": {
    "brainOrg": {
      "url": "https://ctx.brainbox-ai.app/api/org-mcp",
      "headers": {
        "Authorization": "Bearer <BRAINBOX_API_KEY>"
      },
      "type": "http"
    }
  }
}
```

---

## Ingesting Data into the Brain

Use the `/brain-ingest` skill to teach BrainBox about your data — Postgres schemas / documents are staged through the connector pipeline (`stage → commit → push → generate → approve`).

To start, simply run `/brain-ingest` in Claude Code and follow the guided steps.

> **Athena / other warehouses:** connect via a Trino connection string (`brainbox ingest db trino://...`) with `--dialect athena`. Requires `@brainbox-labs/cli` >= 0.9.0 — run `npm update` if `brainbox --version` reports older.

---

## Querying the Brain

The BrainBox brain describes **what** your data means — entities, relationships, business rules, and workflows. For live data, use the local MCP tools or direct database access.

### Recommended tool call sequence

Always follow this order to orient before drilling in:

1. `get_index` — retrieve an orientation snapshot of the brain
2. `get_learnings` / `save_learning` — **required** if `get_index` returns a non-empty `learnings` array; save new learnings back as you go
3. `recall_domain`, `recall_wiki`, `research_task` — targeted exploration

---

### Local MCP (live SQL data access)

Advanced, experimental use case: BrainBox can generate MCP tools tailored to your SQL queries. To use those generated tools, run the MCP server locally against your own database.

First, start the local development server:

```bash
./node_modules/.bin/brainbox dev start --no-brain
```

Then register it with Claude Code:

```bash
claude mcp add --transport http brainbox-local http://localhost:3100/mcp
```

#### Direct database access

If the local MCP tools do not cover a query, connect directly:

```bash
psql $DATABASE_URL
```

The `DATABASE_URL` credential is defined in your `.env` file.

