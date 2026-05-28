---
name: brain-learn
description: "Use this skill when the user wants to ingest a Postgres database or documents into BrainBox using the modern connector workflow. Invoke for: connect my database to BrainBox, add documents to the brain, push my schema, set up a BrainBox project, train BrainBox on my data."
tools: Bash, Read, Glob, Grep
---

# brain-learn — Ingest Data into BrainBox

Use this skill to teach BrainBox about your data. It ingests Postgres schemas and documents through the connector pipeline, then generates an annotated context layer your agents can query.

The modern workflow: **stage → commit → push → generate → approve**

---

## Before you start

**Check the CLI is installed:**
```bash
brainbox --version
```
If that fails: `npm install -g @brainbox-labs/cli`

**Resolve credentials and project:** Look for `.brainbox/config.json` in the project root first. If absent, check `.env` for `BRAINBOX_API_KEY`, `BRAINBOX_ORG`, and `BRAINBOX_PROJECT`. If nothing is found, see [Credential setup](#credential-setup).

---

## Step 1 — Initialize the project

If `.brainbox/` does not exist in the project root:

```bash
# Fresh project — creates .brainbox/config.json
brainbox repo init --org <name> --project <name>

# Project already exists on BrainBox server — fetches config
brainbox repo clone <project-name>
```

---

## Step 2 — Stage your data sources

### Postgres database

Gather the database URL (`DATABASE_URL` in `.env`, README, or ask the user), then:

```bash
brainbox meta ingest db <postgres-url> \
  [--sql <directory-with-sql-files>] \
  [--sql-file <single.sql>] \
  [--tables <table1,table2>]
```

The CLI prints a payload summary (`N tables, M columns, K queries`). If you see `0 tables`, the connection succeeded but the schema wasn't found — rerun with `--verbose` to diagnose.

### Documents

Use Glob to find relevant files (`**/*.sql`, `**/*.md`, `**/*.eml`, `**/*.txt`), then:

```bash
brainbox meta ingest doc path/to/doc1.md path/to/email.eml path/to/notes.txt
```

File type is inferred from extension. Stage all relevant files in one command.

### MCP server (optional)

To bring in tools from another MCP server as a connector:

```bash
brainbox meta ingest mcp <mcp-server-url>
```

---

## Step 3 — Commit locally

```bash
brainbox repo commit -m "add <source> schema and queries"
```

Snapshots the staged sources into `.brainbox/commits/`. Nothing is sent to the server yet.

---

## Step 4 — Push to BrainBox

```bash
brainbox repo push
```

Uploads the latest commit. No LLM fires yet — this is data sync only.

---

## Step 5 — Generate context

```bash
brainbox repo meta create
```

Triggers LLM annotation. Returns a context ID immediately — generation runs asynchronously.

Poll until ready:

```bash
brainbox repo meta status [<contextId>]
```

Wait for `status: ready` (typically 1–3 minutes for a standard schema).

---

## Step 6 — Approve

```bash
brainbox repo meta approve [<contextId>]
```

Publishes the annotated context as a new layer version. Share the **layer version** and **review URL** from the output with the user so they can inspect and edit annotations in the UI.

---

## Credential setup

Set in `.env` (the CLI loads it automatically):

```
BRAINBOX_API_KEY=bb_xxxxxxxxxxxxxxxxxxxx
BRAINBOX_ORG=acme
BRAINBOX_PROJECT=analytics
```

Sign up at https://ctx.brainbox-ai.app to get an API key. Make sure `.env` is in `.gitignore`.

---

## Debugging

Rerun any command with `--verbose` to print full HTTP request/response logs (`Authorization` header is always redacted).

| Symptom | Likely cause | Fix |
|---|---|---|
| `ECONNREFUSED` on Postgres | DB not running or wrong host/port | Check the connection string |
| `password authentication failed` | Wrong credentials | Check username/password in the URL |
| `API error 401` | Missing or invalid API key | Check `BRAINBOX_API_KEY` |
| `API error 403` | Key doesn't match org | Verify org name matches the key's org |
| `0 tables` in payload | Wrong DB or schema | Use `--verbose` to inspect introspection |
| `0 queries` in payload | Wrong path or no `.sql` files | Check `--sql` / `--sql-file` path |
| `meta create` stays `processing` | LLM generation in progress | Poll with `repo meta status` for up to 5 min |
