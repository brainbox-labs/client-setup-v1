/**
 * BrainBox agent — Vertex AI (Gemini) + @brainbox-labs/sdk.
 *
 * Uses brain.recall.asTools() and brain.update.asTools() instead of a raw
 * MCP client — no MCP connection or schema conversion boilerplate needed.
 *
 * Usage:
 *   npx tsx index.ts "What are the main entities in this domain?"
 *   npx tsx index.ts   # interactive REPL
 *
 * Required env vars:
 *   BRAINBOX_API_KEY        — org-level API key (bb_...)
 *   BRAINBOX_ORG            — org slug
 *   BRAINBOX_PROJECT        — project (brain) slug
 *   GOOGLE_CLOUD_PROJECT    — GCP project ID
 *   GOOGLE_CLOUD_LOCATION   — GCP region (e.g. us-central1)
 */

import { BrainBox } from '@brainbox-labs/sdk';
import type { VerbTool } from '@brainbox-labs/sdk';
import { generateText, tool, jsonSchema, stepCountIs } from 'ai';
import { createVertex } from '@ai-sdk/google-vertex';
import * as readline from 'readline';

const MAX_STEPS = 20;

for (const v of ['BRAINBOX_API_KEY', 'BRAINBOX_ORG', 'BRAINBOX_PROJECT']) {
  if (!process.env[v]) {
    console.error(`Missing ${v}. Export it before running.`);
    process.exit(1);
  }
}

const brain = new BrainBox({
  apiKey: process.env.BRAINBOX_API_KEY!,
  org: process.env.BRAINBOX_ORG!,
  project: process.env.BRAINBOX_PROJECT!,
});

const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT ?? 'my-gcp-project',
  location: process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1',
});

// Adapt VerbTool[] to the AI SDK tool map format.
// - `inputSchema` key (not `parameters`) — required by AI SDK v6
// - `stopWhen` (not `maxSteps`) — required by AI SDK v6
function toAITools(verbTools: VerbTool[]) {
  return Object.fromEntries(
    verbTools.map(t => [
      t.name,
      tool({
        description: t.description,
        inputSchema: jsonSchema(t.inputSchema),
        execute: async (args) => JSON.stringify(await t.execute(args)),
      }),
    ]),
  );
}

// --- Agent ---

const SYSTEM_PROMPT = `You are a business intelligence assistant with access to the BrainBox brain — a domain model that captures entities, relationships, business rules, processes, and vocabulary for this organization's data.

Available tools:
- get_index: high-level overview of entities, vocabulary, and recent learnings — start here
- get_learnings: retrieve saved business rules and learnings
- get_recent_changes: what has changed in the domain model recently
- recall_domain: search entities, relationships, metrics, or vocabulary by query
- recall_traces: find workflow/process traces by entity or keyword
- recall_wiki: search wiki pages by query
- get_trace: fetch a specific trace by ID
- get_wiki_page: fetch a specific wiki page by ID
- research_task: pose a free-form question; the brain synthesizes an answer across all sources
- save_learning: save a new business rule or learning to the brain
- process_event: record a structured event (meeting, decision, etc.) into the brain

When asked a question:
1. Start with get_index to orient yourself (unless you already called it this session).
2. Use recall_domain, recall_traces, recall_wiki, or research_task to drill in.
3. Answer with specific references to what you found.

When asked to learn or record something, use save_learning or process_event.

Be concise. Cite tool outputs to support your answers.`;

async function runAgent(query: string) {
  const verbTools = [...brain.recall.asTools(), ...brain.update.asTools()];
  const aiTools = toAITools(verbTools);

  console.log(`\nUsing ${verbTools.length} brain tools: ${verbTools.map((t) => t.name).join(', ')}\n`);
  console.log('---');

  const result = await generateText({
    model: vertex('gemini-2.5-pro'),
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: query }],
    tools: aiTools,
    stopWhen: stepCountIs(MAX_STEPS),
    onStepFinish: (step) => {
      for (const item of step.content ?? []) {
        if (item.type === 'tool-call') {
          console.log(`[tool] ${item.toolName}(${JSON.stringify(item.input).slice(0, 120)})`);
        }
        if (item.type === 'tool-result') {
          const preview = String(item.output).slice(0, 200);
          console.log(`       → ${preview}${String(item.output).length > 200 ? '…' : ''}`);
        }
        if (item.type === 'text' && item.text) {
          console.log(`[step] ${item.text.slice(0, 120)}${item.text.length > 120 ? '…' : ''}`);
        }
      }
    },
  });

  console.log('\n=== Answer ===');
  console.log(result.text);
  console.log(`\n(${result.steps.length} step(s), ${result.usage.totalTokens} tokens)`);
}

// --- Entry point ---

async function main() {
  const queryFromArgs = process.argv.slice(2).join(' ').trim();

  if (queryFromArgs) {
    await runAgent(queryFromArgs);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('BrainBox agent ready. Type a question or "exit" to quit.\n');

  const ask = () =>
    rl.question('> ', async (input) => {
      const q = input.trim();
      if (!q || q === 'exit') {
        rl.close();
        return;
      }
      await runAgent(q);
      ask();
    });

  ask();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
