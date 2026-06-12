/**
 * Ingest a doc, query it, correct the brain, query again.
 *
 * Shows the full loop:
 *   brain.ingest  → get a baseline answer
 *   brain.update.save_learning  → add a correction or nuance
 *   brain.recall.research_task  → verify the brain now knows the corrected fact
 *
 * Usage:
 *   npx tsx index.ts
 *
 * Required env vars:
 *   BRAINBOX_API_KEY   — org-level API key (bb_...)
 *   BRAINBOX_ORG       — org slug
 *   BRAINBOX_PROJECT   — project (brain) slug
 */

import { BrainBox } from '@brainbox-labs/sdk';

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

// --- Step 1: ingest the refund policy ---

console.log('── Step 1: ingest ──────────────────────────────');
const ingestResult = await brain.ingest({
  text: `
    Refund policy:
    - Credit card refunds take 5-10 business days after approval.
    - Debit card refunds take 3-5 business days after approval.
    - Store credit refunds are applied immediately.
  `,
  message: 'baseline refund policy',
  // force:true reprocesses the last connector draft instead of uploading a new one.
  // Without this, re-running the script creates a new version on every run.
  force: true,
});
console.log(`  stage=${ingestResult.stages[0].kind}  version=${ingestResult.stages[0].version}`);

// --- Step 2: query baseline ---

console.log('\n── Step 2: query (baseline) ────────────────────');
const question = 'How long do credit card refunds take?';
console.log(`  Q: ${question}`);

const before = await brain.recall.research_task({ intent: question }) as { summary: string };
console.log(`  A: ${typeof before === 'object' ? before.summary : before}`);

// --- Step 3: correct the brain ---

console.log('\n── Step 3: correct ─────────────────────────────');
const correction = 'Credit card refunds take 5-10 business days for domestic cards, but 10-15 business days for international cards.';
console.log(`  Learning: "${correction}"`);

await brain.update.save_learning({
  queryContext: question,
  priorAnswer: '5-10 business days',
  correctAnswer: '5-10 business days for domestic cards; 10-15 business days for international cards',
  learningContext: correction,
  categoryHint: 'rule',
  entityHint: 'OrderPayment',
});
console.log('  Saved.');

// --- Step 4: confirm learning is visible ---

console.log('\n── Step 4: confirm learning saved ──────────────');
const learnings = await brain.recall.get_learnings() as { rules?: unknown[]; corrections?: { insight?: string; context?: string; entity?: string }[] };
const saved = learnings?.corrections?.find(l => l.insight?.includes('international'));
console.log(saved ? `  ✓ learning visible: "${saved.insight}"` : '  ✗ learning not yet visible');
console.log(`  (${learnings?.rules?.length ?? 0} rules, ${learnings?.corrections?.length ?? 0} corrections)`);

// --- Step 5: query again ---

console.log('\n── Step 5: query (after correction) ────────────');
console.log(`  Q: ${question}`);

const after = await brain.recall.research_task({ intent: question }) as { summary: string };
console.log(`  A: ${typeof after === 'object' ? after.summary : after}`);
