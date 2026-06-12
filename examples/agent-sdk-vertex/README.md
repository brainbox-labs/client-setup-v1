# agent-sdk-vertex

Agentic loop using Gemini (Vertex AI) + `@brainbox-labs/sdk`.

Uses `brain.recall.asTools()` and `brain.update.asTools()` — no MCP client setup needed.

## Setup

```bash
npm install
```

```bash
export BRAINBOX_API_KEY=bb_...
export BRAINBOX_ORG=my-org
export BRAINBOX_PROJECT=my-project
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

## vs agent-vertex

| | agent-vertex | agent-sdk-vertex |
|---|---|---|
| Brain access | Raw MCP client | `@brainbox-labs/sdk` |
| Auth | Project-level MCP key | Org API key |
| Tool setup | Manual schema conversion | `brain.recall.asTools()` |
