#!/usr/bin/env node
// SubagentStop hook: tracks failure attempts per subagent invocation.
// If the same subagent failed >=3 times on the same root cause, halt the orchestrator.
// Every event is also appended to an append-only audit log (.claude/state/strikes.log)
// so a tampered strikes.json can be cross-checked against an immutable trail.

import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { join } from 'node:path';

const STATE_DIR = join(process.cwd(), '.claude', 'state');
const STATE_FILE = join(STATE_DIR, 'strikes.json');
const LOG_FILE = join(STATE_DIR, 'strikes.log');

let raw = '';
try {
  raw = readFileSync(0, 'utf8');
} catch {
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0);
}

const agent = payload?.subagent_name || 'unknown';
const success = payload?.success === true;
const errorSig = (payload?.last_error || '').slice(0, 200);

if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
let state = {};
try {
  state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
} catch {
  /* fresh */
}

const key = `${agent}::${errorSig}`;
if (success) {
  delete state[key];
} else {
  state[key] = (state[key] || 0) + 1;
}
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

// Append-only audit trail: one JSON object per line, never rewritten. Best-effort —
// logging must never block a tool call, so swallow any write error here.
try {
  appendFileSync(
    LOG_FILE,
    JSON.stringify({
      ts: new Date().toISOString(),
      agent,
      success,
      errorSig,
      count: state[key] ?? 0,
    }) + '\n',
  );
} catch {
  /* logging is best-effort */
}

if (!success && state[key] >= 3) {
  console.error(
    JSON.stringify({
      decision: 'halt',
      reason: `Subagent "${agent}" hit 3 strikes on error: ${errorSig}\nEscalating to human.`,
    }),
  );
  process.exit(2);
}

process.exit(0);
