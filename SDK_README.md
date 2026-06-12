# @brainbox-labs/sdk

BrainBox JavaScript/TypeScript SDK — ingest data into your brain, query it programmatically, and serve it as a local MCP server.

## Quick start

```bash
npm install @brainbox-labs/sdk
```

## The `BrainBox` root

Everything starts from a `BrainBox` handle:

```typescript
import { BrainBox } from '@brainbox-labs/sdk';

const brain = new BrainBox({
  apiKey: process.env.BRAINBOX_API_KEY!,
  org: 'my-org',
  project: 'my-project',   // slug or cuid2 ID
});
```

The handle exposes three verb namespaces — `brain.ingest`, `brain.recall`, `brain.update` — plus a server builder at `brain.serve`.

---

## `brain.ingest` — ingest sources

One call to ingest a Postgres schema, SQL files, docs, and free-form text. Blocks until each stage is activated and a new version is published.

```typescript
const result = await brain.ingest({
  postgres: { connectionString: process.env.DATABASE_URL! },
  sql: ['./sql/reports'],           // SQL files or directories
  docs: ['./docs/**/*.md'],         // glob patterns
  text: 'ARR excludes professional services fees.',
  message: 'Q2 reports + finance docs',
});

console.log(result.stages); // [{ kind: 'sql', version: 4 }, { kind: 'docs', version: 5 }]
```

### `IngestOptions`

| Option | Type | Description |
| --- | --- | --- |
| `postgres` | `{ connectionString, tables?, dialect? }` | Postgres schema to introspect. `tables` restricts to named tables; `dialect` overrides the SQL dialect tag sent to the server (default: `'postgres'`). |
| `sql` | `string[]` | SQL file paths / directories (requires `postgres`) |
| `docs` | `string[]` | Glob patterns matching `.md`, `.txt`, `.html` files. `.pdf` and `.docx` are auto-converted to markdown (requires `mammoth` and `pdf-parse` optional deps). |
| `text` | `string` | Inline text snippet attached as a document |
| `profile` | `{ mode, sampleRows?, skipColumns? }` | Profile column data from the database. `mode: 'cardinality'` collects distinctCount, nullRate, numeric/string stats. `mode: 'full'` also collects enum values and JSON key shapes. Supports Postgres, MySQL, SQLite, DuckDB. |
| `message` | `string` | Description of the ingest (reserved for future use) |
| `timeoutMs` | `number` | Per-stage poll timeout (default: 300 000 ms) |
| `reviewOnly` | `boolean` | Stop after context is ready — skip activation for curation |
| `force` | `boolean` | Re-process the last connector draft instead of uploading sources again |

### Partial failures

If a later stage fails after an earlier one has already activated, an `IngestPartialFailureError` is thrown carrying the completed stages:

```typescript
import { IngestPartialFailureError } from '@brainbox-labs/sdk';

try {
  await brain.ingest({ postgres: { connectionString }, docs: ['./docs'] });
} catch (err) {
  if (err instanceof IngestPartialFailureError) {
    console.log('completed:', err.completed); // stages that already shipped
    console.log('failed stage:', err.failedKind);
  }
}
```

---

## `brain.recall` — read the brain

Nine read verbs that map 1:1 to the hosted BrainBox MCP tools:

```typescript
const index   = await brain.recall.get_index();
const recent  = await brain.recall.get_recent_changes();
const learn   = await brain.recall.get_learnings();

const domain  = await brain.recall.recall_domain({ query: 'orders' });
const traces  = await brain.recall.recall_traces({ entity: 'order', limit: 5 });
const wiki    = await brain.recall.recall_wiki({ query: 'returns policy' });

const trace   = await brain.recall.get_trace({ id: 'trc_abc' });
const page    = await brain.recall.get_wiki_page({ id: 'wiki_xyz' });

const brief   = await brain.recall.research_task({
  question: 'Why did returns spike last week?',
});
```

### Agent loop

`.asTools()` returns an array of `VerbTool` objects — each has a standard MCP-format `inputSchema` plus a bound `execute` method — so the array drops straight into any agent framework:

```typescript
const tools = [...brain.recall.asTools(), ...brain.update.asTools()];

// With the Anthropic SDK:
const response = await anthropic.messages.create({ tools, ... });
for (const block of response.content) {
  if (block.type === 'tool_use') {
    const tool = tools.find(t => t.name === block.name)!;
    const result = await tool.execute(block.input);
  }
}
```

---

## `brain.update` — write to the brain

Two write verbs for saving learnings and processing events:

```typescript
await brain.update.save_learning({
  rule: 'Returns over 30 days are written off, not refunded.',
});

await brain.update.process_event({
  kind: 'meeting',
  source: 'granola:abc123',
  body: '...',
});
```

---

## `brain.serve` — MCP server builder

Build and start a local MCP server (Streamable HTTP) serving your approved tools:

```typescript
const mcp = brain.serve.mcp({
  connectors: { sql: { url: process.env.DATABASE_URL! } },
});

// Middleware: runs before every tool call
mcp.use(async (ctx, next) => {
  const user = await verifyToken(ctx.headers['authorization']);
  ctx.tenantId = user.tenantId;
  await next();
});

// Enhanced tier: wrap the approved SQL with a tenant filter
mcp.tool('get_overdue_invoices', async (params, ctx) => {
  return ctx.sql.query(
    `${ctx.defaultQuery} AND tenant_id = $1`,
    [...Object.values(params), ctx.tenantId],
  );
});

// Custom tier: full implementation (tool shape defined in BrainBox UI)
mcp.tool('create_reconciliation_exception', async (params, ctx) => {
  const [row] = await ctx.sql.query(
    'INSERT INTO recon_exceptions (amount, tenant_id) VALUES ($1, $2) RETURNING id',
    [params.amount, ctx.tenantId],
  );
  return row;
});

await mcp.start({ port: 3100 });
// → MCP server ready at http://localhost:3100/mcp
```

### Tool execution tiers

| Tier | Developer effort | Behavior |
| --- | --- | --- |
| **Auto** | Nothing | SDK runs the approved SQL via the `sql` connector |
| **Enhanced** | `mcp.tool('name', fn)` on an auto tool | `ctx.defaultQuery` holds the approved SQL; developer wraps it |
| **Custom** | `mcp.tool('name', fn)` on a custom tool | Full implementation — tool shape is defined in BrainBox UI |
| **Disabled** | `mcp.disable('name')` | Tool excluded from MCP server entirely |

Custom tools without an override are silently excluded by default. Set `serveUnimplementedTools: true` to register them with a clear error on call.

### `ToolContext`

Every middleware and tool handler receives a `ToolContext`:

```typescript
interface ToolContext {
  sql: SqlClient;          // ctx.sql.query(sql, params)
  defaultQuery?: string;   // Approved SQL — available on auto-tier tools
  toolName: string;
  headers: Record<string, string | string[] | undefined>;
  [key: string]: unknown;  // Middleware can attach arbitrary fields (ctx.user, ctx.tenantId, …)
}
```

### Zero-code MCP server

No custom logic? Run the binary directly:

```bash
BRAINBOX_API_KEY=bb_xxx \
BRAINBOX_PROJECT=my-project \
DATABASE_URL=postgres://localhost:5432/mydb \
npx brainbox-mcp
# → MCP server ready at http://localhost:3100/mcp
```

### Claude Desktop config

```json
{
  "mcpServers": {
    "my-project": {
      "command": "npx",
      "args": ["brainbox-mcp"],
      "env": {
        "BRAINBOX_API_KEY": "bb_xxx",
        "BRAINBOX_PROJECT": "my-project",
        "DATABASE_URL": "postgres://localhost:5432/mydb"
      }
    }
  }
}
```

---

## `BrainBox` options

```typescript
new BrainBox({
  apiKey: string;     // BrainBox API key (bb_...)
  org: string;        // Organisation slug
  project?: string;   // Project (brain) slug or cuid2 ID — required for ingest/recall/update/serve
  apiUrl?: string;    // Defaults to https://ctx.brainbox-ai.app
})
```

---

## Architecture

```text
src/
  brain.ts         — BrainBox root: ingest, recall, update, serve namespaces
  verb-namespace.ts — buildVerbNamespace(): VerbHandler + asTools()
  client.ts        — BrainBoxClient (REST API access)
  index.ts         — public exports
  ingest/
    index.ts          — performIngest(): stages pipeline
    schema-reader.ts  — Postgres introspection (pg)
    sql-parser.ts     — SQL file parsing (pgsql-ast-parser)
    docs-loader.ts    — glob + inline text expansion; routes pdf/docx through doc-converter
    column-profiler.ts — column statistics engine (Postgres, MySQL, SQLite, DuckDB)
    doc-converter.ts  — PDF/DOCX/HTML → markdown (mammoth, pdf-parse, turndown — optional deps)
    public.ts         — @brainbox-labs/sdk/ingest subpath re-exports
  serve/
    mcp.ts         — MCP public class (use(), tool(), disable(), start())
    sync.ts        — SyncEngine: fetches tool definitions from BrainBox API
    server.ts      — MCP Server builder (@modelcontextprotocol/sdk)
    dispatch.ts    — Tool dispatcher: override > auto-sql > error
    middleware.ts  — runMiddlewareChain() (Koa-style next())
    connectors/
      sql.ts       — SqlExecutor (pg.Pool) + NoopSqlClient
      brain.ts     — BrainExecutor (dispatch endpoint)
    types.ts       — ContextTool, SqlClient, ToolContext, MiddlewareFn, ToolHandlerFn
  bin.ts           — CLI entrypoint (brainbox-mcp binary)
```

The MCP server runs entirely in the developer's infrastructure. BrainBox never receives database credentials or query results.
