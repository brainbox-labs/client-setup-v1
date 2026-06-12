# agent-vertex

Agentic loop using Gemini (Vertex AI) + the BrainBox brain MCP server.

## Setup

```bash
npm install
```

```bash
export BRAINBOX_MCP_KEY=bb_proj_...
export GOOGLE_CLOUD_PROJECT=my-gcp-project
export GOOGLE_CLOUD_LOCATION=us-central1
```

Vertex auth uses [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials) — run `gcloud auth application-default login` if needed.

## Run

```bash
# One-shot
npx tsx index.ts "What are the main entities in this domain?"

# Interactive REPL
npx tsx index.ts
```

## Notes

Two AI SDK v6 + Vertex quirks worked around in `buildAITools`:

- **`inputSchema` not `parameters`** — `tool()` is an identity function in v6; the framework reads `tool.inputSchema`.
- **`stopWhen: stepCountIs(N)`** — `maxSteps` was removed in v6.
