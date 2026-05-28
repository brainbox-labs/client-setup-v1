---
name: brain-workflow
description: "Use this skill when the user wants to run a real business workflow end-to-end against their local data. Starts the local MCP dev server (brainbox-mcp) which serves both SQL data tools and domain model tools entirely on the developer's machine. Invoke for: run a workflow, investigate this issue, analyze overdue orders, do a full reconciliation check."
tools: Bash, Read, Glob, Grep
---

# brain-workflow — Run Real Workflows Locally

Use this skill to orchestrate multi-step business workflows with data staying on the developer's machine. Database credentials and query results never leave the local environment. The BrainBox API is always contacted at startup — to resolve the project and sync tool definitions — so `BRAINBOX_API_KEY` is required regardless of other flags.

The local dev server serves two things in one:

- **Domain model tools** — brain knowledge (definitions, workflows, rules) synced from BrainBox at startup, then served locally
- **SQL data tools** — live queries against the connected Postgres database; results stay on-machine

Use `brain-recall` instead if you only want to ask questions of the brain without touching live data.

---

## Before you start

Resolve credentials and project from `.brainbox/config.json` or `.env`:
- `BRAINBOX_API_KEY`, `BRAINBOX_ORG`, `BRAINBOX_PROJECT`
- `DATABASE_URL` — Postgres connection string

Check if the dev server is already running:

```bash
cat .brainbox/dev.pid 2>/dev/null && echo "server running" || echo "not running"
```

---

## Start the local dev server

```bash
brainbox dev start [--db <postgres-url>] [--port 3100]
```

The CLI reads `DATABASE_URL` from env if `--db` is not passed. On success:

```
MCP server ready at http://localhost:3100/mcp
```

Use `--no-brain` to skip serving domain model tools (brain knowledge won't appear in the tool list). The BrainBox API is still contacted at startup for project resolution and SQL tool sync.

---

## Orchestration pattern

For each step in the workflow:

1. **Orient** — list available tools from the local server to see what's exposed
2. **Get context** — call domain model tools (e.g. `trace_workflow`, `find_governing_rules`, `recall_concepts`) to understand the business rules for this step
3. **Get data** — call the relevant SQL data tool
4. **Reason** — combine context + data to make a decision or produce an output
5. **Continue** — repeat for the next step

---

## Tool routing

| Need | Use |
|---|---|
| Business rules, definitions, processes | Domain model tools from the local server |
| Live query covered by an approved tool | SQL data tools from the local server |
| Query not covered by any approved tool | Direct SQL via Bash (see below) |

---

## Direct SQL fallback

If no approved tool covers a needed query:

```bash
psql "$DATABASE_URL" -c "SELECT ..."
```

This bypasses the semantic layer. Use it for one-off investigation only. If you find yourself doing this repeatedly, suggest running `brain-learn` to add the missing query to the brain.

---

## Stop the server when done

```bash
brainbox dev stop
```

---

## Debugging

| Symptom | Fix |
|---|---|
| `dev start` fails with `ECONNREFUSED` | Check `DATABASE_URL` is correct and DB is reachable |
| Data tool returns 0 rows | Data may be empty or filtered — check query params |
| Port already in use | Run `brainbox dev stop` first, or use `--port` |
| Domain tool returns vague answer | Brain may not cover this area — suggest `brain-learn` |
| `dev start` says no active layer | Approve a context first using `brain-learn` |
