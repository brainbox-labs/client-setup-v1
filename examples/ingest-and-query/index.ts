/**
 * Ingest a policy doc then immediately query it.
 *
 * Usage:
 *   npx tsx index.ts <path-to-doc>
 *   npx tsx index.ts ../../policies/refund-policy.md
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

const docPath = process.argv[2];
if (!docPath) {
  console.error('Usage: npx tsx index.ts <path-to-doc>');
  process.exit(1);
}

const brain = new BrainBox({
  apiKey: process.env.BRAINBOX_API_KEY!,
  org: process.env.BRAINBOX_ORG!,
  project: process.env.BRAINBOX_PROJECT!,
});

// --- Ingest ---

console.log(`Ingesting ${docPath}...`);

const ingestResult = await brain.ingest({
  docs: [docPath],
  message: `ingest ${docPath}`,
  force: true,
});

for (const stage of ingestResult.stages) {
  console.log(`  stage=${stage.kind}  version=${stage.version ?? '(pending review)'}`);
  if (stage.warnings?.length) {
    console.log(`  warnings: ${stage.warnings.join(', ')}`);
  }
}

console.log('Ingest complete.\n');

// --- Query ---

console.log('Querying: "What is the refund timeline for credit card payments?"\n');

const answer = await brain.recall.research_task({
  intent: 'What is the refund timeline for credit card payments?',
});

console.log(typeof answer === 'string' ? answer : JSON.stringify(answer, null, 2));
