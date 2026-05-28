---
name: brain-recall
description: "Use this skill when the user wants to query their BrainBox brain — ask business questions, look up domain knowledge, trace workflows, explore data, or understand entity relationships. The brain MCP is already connected; no CLI or server setup needed. Invoke for: ask the brain, what does BrainBox know about X, query the domain model, look up business rules."
tools: Read
---

# brain-recall — Query the BrainBox Brain

Use this skill to ask questions of your BrainBox brain. The brain exposes two families of tools:

- **Domain model tools** — answer conceptual questions: definitions, workflows, business rules, entity relationships
- **Data tools** — return live query results from your database via approved SQL

Domain model tools work via the hosted MCP alone — no local server needed. Data tools also come through the hosted MCP but execute SQL on the BrainBox backend; if your project routes data tools through the local dev server instead, use `brain-workflow`.

---

## BrainBox MCP connection

The BrainBox MCP server at `https://ctx.brainbox-ai.app/api/mcp` must be registered with the user's AI client before this skill will work. If `mcp__brainbox__*` tools are not available, ask the user which client they are using and follow the matching instructions below.

The MCP config block is the same in every case — only the file location differs:

```json
{
  "mcpServers": {
    "brainbox": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://ctx.brainbox-ai.app/api/mcp"],
      "env": {
        "BRAINBOX_API_KEY": "bb_xxx",
        "BRAINBOX_PROJECT": "your-project-name"
      }
    }
  }
}
```

Replace `bb_xxx` with your API key and `your-project-name` with the project slug — the same value you set as `BRAINBOX_PROJECT` in `.env` for the CLI. Both the CLI and the hosted MCP accept the human-readable project name; you do not need a raw project ID.

### Where to add it

| Client | Config file |
|---|---|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| **Claude Code** | `.claude/settings.json` in the project root (project-scoped) or `~/.claude/settings.json` (global) |
| **Cursor** | `.cursor/mcp.json` in the project root, or **Settings → MCP → Add server** in the UI |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` |
| **VS Code (Copilot / Continue)** | `.vscode/mcp.json` in the project root |
| **Zed** | `~/.config/zed/settings.json` under `"context_servers"` |

After adding, restart the client for the tools to appear.

---

## Start here: get the index

Always call `get_index` first. It returns the complete tool manifest — use it to route the user's question to the right tool.

```
mcp__brainbox__get_index
```

---

## Domain model tools

Use these to answer conceptual questions about the business.

| Tool | When to use |
|---|---|
| `recall_concepts` | Retrieve facts and definitions the brain has learned |
| `define_terms` | Explain a specific business term precisely |
| `explain_concept` | Deeper explanation with surrounding context |
| `explore_workflows` | Surface business processes and their steps |
| `trace_workflow` | Follow one specific process end-to-end |
| `find_governing_rules` | Constraints, validation rules, business logic |
| `understand_connections` | Relationships and dependencies between entities |
| `get_learnings` | Retrieve ad-hoc learnings saved during past sessions |
| `save_learning` | Persist a new insight or correction for future recall |

Start with `recall_concepts` for open questions. Use the more specific tools once you know what you're looking for. Use `get_learnings` to surface insights captured outside the formal ingestion pipeline, and `save_learning` to record anything worth preserving mid-conversation.

---

## Data tools

Data tools are project-specific — their names come from the index. They run approved SQL against the live database and return structured results.

Call them by name after discovering them via `get_index`. If a data tool returns a connection error, the local MCP dev server may need to be running — use the `brain-workflow` skill to start it.

---

## Composing grounded answers

For the best answers, combine both families:

1. Call a domain model tool to understand the business context ("what does 'overdue' mean here?")
2. Call a data tool to get live evidence ("which orders are actually overdue right now?")
3. Compose the answer with context + data together

This prevents hallucination — every claim is backed by either a domain model fact or a live query result.

---

## If a tool returns nothing useful

- Try `recall_concepts` with a broader or different term
- Try `explore_workflows` to see if the process exists under a different name
- If the index shows no relevant tools, the brain may not cover that area — suggest using `brain-learn` to ingest the missing data source
