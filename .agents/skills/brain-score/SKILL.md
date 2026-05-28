---
name: brain-score
description: "Use this skill to run a repeatable quality evaluation of a BrainBox brain. Calls MCP tools to assess coverage, description quality, domain model depth, and data freshness. Produces a concise markdown report saved as a versioned file. Invoke for: score the brain, evaluate brain quality, audit BrainBox, how good is our brain?"
tools: Read, Write
---

# brain-score — Evaluate Brain Quality

Runs a fixed evaluation protocol against the active BrainBox brain and saves a versioned markdown report. The protocol is identical on every run so scores are comparable over time.

---

## Prerequisites

This skill calls the hosted BrainBox MCP (`mcp__brainbox__*`) directly. If those tools are not available, the hosted MCP is not connected to your AI client — follow the setup instructions in `brain-recall` first.

---

## Evaluation protocol

Run these steps in order. Collect evidence as you go — paste relevant excerpts into the report.

### Step 1 — Index the brain

```
mcp__brainbox__get_index
```

Record: total tool count, categories present, any obvious gaps (no data tools, no domain model tools, etc.).

### Step 2 — Test domain model depth

Call `recall_concepts` with 3 broad business terms inferred from the index:

```
mcp__brainbox__recall_concepts  →  <term 1>
mcp__brainbox__recall_concepts  →  <term 2>
mcp__brainbox__recall_concepts  →  <term 3>
```

Rate each: does it return specific, accurate facts — or vague generalities?

### Step 3 — Sample data tools

Pick 3 representative data tools from the index. Call each:

```
mcp__brainbox__<tool_1>
mcp__brainbox__<tool_2>
mcp__brainbox__<tool_3>
```

Record: did each return results? Were results non-empty and plausible?

### Step 4 — Trace a workflow

```
mcp__brainbox__explore_workflows
```

Pick one workflow from the result, then trace it:

```
mcp__brainbox__trace_workflow  →  <workflow name>
```

Rate: is the workflow complete? Are the steps specific?

### Step 5 — Check governing rules

```
mcp__brainbox__find_governing_rules
```

Record: did it return domain-specific rules, or nothing?

### Step 6 — Test connections

Pick two entities that should be related (inferred from the index or domain model responses), then:

```
mcp__brainbox__understand_connections  →  <entity 1>  <entity 2>
```

Rate: does the response surface concrete relationships and dependencies, or return nothing?

### Step 7 — Check learnings

```
mcp__brainbox__get_learnings
```

Record: are there any ad-hoc learnings saved? Are they relevant and accurate?

---

## Scoring (each dimension 0–10)

| Dimension | What a 10 looks like |
|---|---|
| **Coverage** | Tools span all major business processes; no obvious gaps |
| **Description quality** | Every tool has a specific, actionable description in domain language |
| **Schema completeness** | Tool inputs have typed fields with descriptions, not bare param names |
| **Domain model depth** | `recall_concepts` returns precise, specific facts — not generic definitions |
| **Data freshness** | Data tools return non-empty, plausible results |
| **Workflow traceability** | `trace_workflow` produces a coherent, complete process end-to-end |
| **Learnings** | `get_learnings` returns relevant, non-contradictory insights from past sessions |

---

## Risk flags

Detect and report any of the following:

- Fewer than 5 tools in the index → **under-populated brain**
- Any "get recent" / "get all" data tool returns 0 rows → **stale or disconnected data**
- Tool descriptions under 20 characters → **low-quality annotations**
- `find_governing_rules` returns nothing → **business rules not captured**
- No domain model tools in the index → **knowledge layer missing**
- No data tools in the index → **semantic layer missing or inactive**
- `understand_connections` returns nothing → **entity relationships not captured**
- `get_learnings` returns nothing and brain is not new → **learnings never saved; consider running `save_learning` after sessions**

---

## Save the report

Save as `brain-score-YYYY-MM-DD.md` in the current directory. If that file already exists, use `brain-score-YYYY-MM-DD-2.md`, then `-3`, and so on.

```markdown
# Brain Score Report — YYYY-MM-DD

## What This Brain Knows

<2–3 sentences inferring what the company does, based on tool names and domain model responses>

## Scores

| Dimension | Score | Evidence |
|---|---|---|
| Coverage | /10 | <one line> |
| Description quality | /10 | <one line> |
| Schema completeness | /10 | <one line> |
| Domain model depth | /10 | <one line> |
| Data freshness | /10 | <one line> |
| Workflow traceability | /10 | <one line> |
| Learnings | /10 | <one line> |

**Overall: X / 70**

## Risks

- <risk 1>
- <risk 2>

## Recommended Next Steps

- <action 1 — e.g. "Run brain-learn to ingest the orders SQL files">
- <action 2>
```

Tell the user the exact path where the report was saved.

---

## Repeatability

The protocol is fixed — same 5 steps every run. A score that drops between runs signals degradation: stale data, a removed tool, or deleted annotations. Run monthly or after any major ingestion change.
