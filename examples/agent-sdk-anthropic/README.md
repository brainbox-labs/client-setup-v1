# agent-sdk-anthropic

Agentic loop using Claude (Anthropic API) + `@brainbox-labs/sdk`.

Uses `brain.recall.asEnabledTools()` and `brain.update.asEnabledTools()` with the Vercel AI SDK — no MCP client setup, and no cloud account beyond an Anthropic API key.

## Setup

Uses the `ai` v6 line (Node >=20 per `engines`). Install and typecheck were verified on Node v24.12.0.

```bash
cd examples/agent-sdk-anthropic
npm install
```

```bash
export BRAINBOX_API_KEY=bb_...
export BRAINBOX_ORG=my-org
export BRAINBOX_PROJECT=my-project
export ANTHROPIC_API_KEY=sk-ant-...
# optional, defaults to claude-sonnet-5-5
export ANTHROPIC_MODEL=claude-sonnet-5-5
```

`@brainbox-labs/sdk` is pinned to `0.26.1` and installs from public npm — no GitHub token or `.npmrc` needed.

## Run

`tsx` does not load `.env` on its own. Either export the variables, or put them in a `.env` file (see `.env.example`) and add `--env-file=.env` to each command below, e.g. `npx tsx --env-file=.env index.ts "..."`.

```bash
# 1. Recall
npx tsx index.ts "What are the main entities in this domain?"

# 2. Write back (uses create_learning; verify with list_learnings)
npx tsx index.ts "Remember this: <a business rule or fact>"

# 3. Verify the write-back
npx tsx index.ts "List the saved learnings and show the one about <that fact>"

# Interactive REPL
npx tsx index.ts
```

## Alternatives

- [`agent-sdk-vertex`](../agent-sdk-vertex) — same loop on Gemini via Vertex AI
- [`agent-vertex`](../agent-vertex) — same loop over the raw MCP server

## Example output

Real output from a run on `@brainbox-labs/sdk` 0.26.1, `ai` 6.0.338, `@ai-sdk/anthropic` 3.0.145, model `claude-sonnet-5-5`, Node v24.12.0, against a nearly empty test Brain (one rule, "Refund Policy"). Long lines are trimmed by the example itself.

**1. Recall**

```
$ npx tsx --env-file=.env index.ts "What are the main entities in this domain?"

Using 18 brain tools: get_index, list_skills, get_skill, list_learnings, get_recent_changes, list_traces, recall_traces, get_trace, list_wiki_pages, recall_wiki, get_wiki_page, list_personal_pages, recall_domain, research_task, check_context_draft, grep_wiki, create_learning, save_wiki_page

---
[tool] get_index({})
       → {"entities":[],"vocabulary":[],"rules":[{"name":"Refund Policy"}],"processes":[],"relationships":[],"learnings":[],"version":1,"wiki":{"pagesCount":0,…
[tool] recall_domain({"kind":"concept"})
       → {"kind":"concept","items":[]}

=== Answer ===
This domain doesn't have any entities yet. `get_index` returned an empty entity list, and `recall_domain` with `kind=concept` returned no items.
…
(3 step(s), 9425 tokens)
```

**2. Write back**

```
$ npx tsx --env-file=.env index.ts "Save a learning: when asked how long credit card refunds take, an earlier answer said 'about two weeks' but the correct answer is 5-10 business days after approval. Context: refund policy FAQ."

[tool] create_learning({"queryContext":"How long do credit card refunds take?","priorAnswer":"Credit card refunds take about two weeks.","corre…)
       → {"learning_id":"me6ujq3xs3a7n86fuxmynjkb","status":"saved","message":"Saved. Every future agent querying this project will see this before answering."}

=== Answer ===
I saved the learning (ID `me6ujq3xs3a7n86fuxmynjkb`). Future agents will now see that credit card refunds take **5-10 business days after approval**, not "about two weeks."
…
(2 step(s), 9445 tokens)
```

**3. Verify the write-back**

```
$ npx tsx --env-file=.env index.ts "List the saved learnings and show the one about credit card refund timing."

[tool] list_learnings({})
       → {"instruction":"Apply these before answering. …

=== Answer ===
There is one saved learning. It's a correction, and it's the one about credit card refund timing.

**Learning `me6ujq3xs3a7n86fuxmynjkb`**
- **Insight:** Credit card refunds take 5-10 business days after approval.
…
(2 step(s), 9369 tokens)
```

Verify write-backs with `list_learnings`. `research_task` may not report a new learning in `appliedLearnings` right away, so it is not a reliable check.
