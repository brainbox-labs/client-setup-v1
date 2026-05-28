# BrainBox Client Setup

This repository provides everything you need to explore the BrainBox intelligence layer built for your proof of concept — including the local development server, MCP integrations, and guided workflows for querying your data.

---

## Prerequisites

Before getting started, obtain the following from the BrainBox team:

| Credential | Purpose |
|---|---|
| `NPM_TOKEN` | Installs the BrainBox CLI and skills |
| Org & project name | Identifies your BrainBox project |
| API key (`bb_proj_...`) | Authenticates against the BrainBox MCP server |

---

## Installation

1. **Copy and configure the environment file:**

   ```bash
   cp .env.example .env
   # Open .env and fill in your credentials
   ```

2. **Load environment variables and install dependencies:**

   ```bash
   source .env
   npm install
   ```

---

## MCP Server Configuration

### BrainBox MCP (cloud — brain knowledge layer)

Add the following to your Claude MCP configuration (e.g., `.mcp.json`):

```json
{
  "mcpServers": {
    "brain": {
      "url": "https://ctx.brainbox-ai.app/api/mcp",
      "headers": {
        "Authorization": "Bearer <bb_proj_TOKEN>"
      },
      "type": "http"
    }
  }
}
```

### Local MCP (live SQL data access)

First, start the local development server:

```bash
./node_modules/.bin/brainbox dev start --no-brain
```

Then register it with Claude Code:

```bash
claude mcp add --transport http brainbox-local http://localhost:3100/mcp
```

---

## Querying the Brain

The BrainBox brain describes **what** your data means — entities, relationships, business rules, and workflows. For live data, use the local MCP tools or direct database access.

### Recommended tool call sequence

Always follow this order to orient before drilling in:

1. `get_index` — retrieve an orientation snapshot of the brain
2. `get_learnings` — **required** if `get_index` returns a non-empty `learnings` array
3. `explain_concept`, `trace_workflow`, `find_governing_rules`, etc. — targeted exploration

### Direct database access

If the local MCP tools do not cover a query, connect directly:

```bash
psql $DATABASE_URL
```

The `DATABASE_URL` credential is defined in your `.env` file.
