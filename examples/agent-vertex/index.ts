/**
 * BrainBox agent — Vertex AI (Gemini) + BrainBox brain MCP tools.
 *
 * Connects to the hosted BrainBox brain MCP server, pulls all available
 * tools, and runs an agentic loop that can answer questions and record
 * learnings.
 *
 * Usage:
 *   npx tsx index.ts "What are the main entities in this domain?"
 *   npx tsx index.ts   # interactive REPL
 *
 * Required env vars:
 *   BRAINBOX_MCP_KEY        — project-level key (bb_proj_...)
 *   GOOGLE_CLOUD_PROJECT    — GCP project ID
 *   GOOGLE_CLOUD_LOCATION   — GCP region (e.g. us-central1)
 */

import { generateText, tool, jsonSchema, stepCountIs } from 'ai';
import { createVertex } from '@ai-sdk/google-vertex';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as readline from 'readline';

const BRAIN_MCP_URL = 'https://ctx.brainbox-ai.app/api/mcp';
const BRAIN_MCP_KEY = process.env.BRAINBOX_MCP_KEY;
const MAX_STEPS = 20;

if (!BRAIN_MCP_KEY) {
  console.error('Missing BRAINBOX_MCP_KEY. Export it before running.');
  process.exit(1);
}

const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT ?? 'my-gcp-project',
  location: process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1',
});

// --- MCP client ---

async function buildMCPClient(): Promise<Client> {
  const client = new Client({ name: 'brainbox-agent', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(BRAIN_MCP_URL), {
    requestInit: {
      headers: { Authorization: `Bearer ${BRAIN_MCP_KEY}` },
    },
  });
  await client.connect(transport);
  return client;
}

// Convert MCP tool list → AI SDK tool map.
//
// Two non-obvious fixes required for Vertex AI + AI SDK v6:
//
// 1. Use `inputSchema` not `parameters` — tool() in v6 is an identity
//    function; prepareToolsAndToolChoice reads tool.inputSchema, not
//    tool.parameters, so schemas passed via `parameters` are silently dropped.
//
// 2. Set additionalProperties:true on empty-property schemas — @ai-sdk/google's
//    convertJSONSchemaToOpenAPISchema returns `undefined` for no-param tools
//    (isEmptyObjectSchema check), causing Vertex to reject with "parameters
//    schema should be of type OBJECT". additionalProperties:true bypasses that
//    check without affecting the wire payload (the field isn't forwarded).
function buildAITools(
  mcpClient: Client,
  toolList: Awaited<ReturnType<Client['listTools']>>['tools'],
) {
  const tools: Record<string, ReturnType<typeof tool>> = {};

  for (const t of toolList) {
    const inputSchema = t.inputSchema as Record<string, unknown>;
    const required = (inputSchema.required as string[] | undefined) ?? [];
    const schema: Record<string, unknown> = {
      type: 'object',
      additionalProperties: true,
      properties: (inputSchema.properties as Record<string, unknown>) ?? {},
    };
    if (required.length > 0) schema.required = required;

    tools[t.name] = tool({
      description: t.description ?? '',
      inputSchema: jsonSchema(schema),
      execute: async (args) => {
        try {
          const result = await mcpClient.callTool({
            name: t.name,
            arguments: args as Record<string, unknown>,
          });
          const text = result.content
            .filter((c) => c.type === 'text')
            .map((c) => (c as { type: 'text'; text: string }).text)
            .join('\n');
          return text || JSON.stringify(result.content);
        } catch (err) {
          console.error(`[tool error] ${t.name}:`, err);
          return `Error calling ${t.name}: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });
  }

  return tools;
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

async function runAgent(query: string, mcpClient: Client) {
  const { tools: mcpTools } = await mcpClient.listTools();
  const aiTools = buildAITools(mcpClient, mcpTools);

  console.log(`\nUsing ${mcpTools.length} brain tools: ${mcpTools.map((t) => t.name).join(', ')}\n`);
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
  const mcpClient = await buildMCPClient();
  const queryFromArgs = process.argv.slice(2).join(' ').trim();

  if (queryFromArgs) {
    await runAgent(queryFromArgs, mcpClient);
    await mcpClient.close();
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('BrainBox agent ready. Type a question or "exit" to quit.\n');

  const ask = () =>
    rl.question('> ', async (input) => {
      const q = input.trim();
      if (!q || q === 'exit') {
        await mcpClient.close();
        rl.close();
        return;
      }
      await runAgent(q, mcpClient);
      ask();
    });

  ask();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
