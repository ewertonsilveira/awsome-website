#!/usr/bin/env node
// SubagentStop hook: tracks failure attempts per subagent invocation.
// If the same subagent failed >=3 times on the same root cause, halt the orchestrator.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const STATE_DIR = join(process.cwd(), '.claude', 'state');
const STATE_FILE = join(STATE_DIR, 'strikes.json');

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { process.exit(0); }

let payload;
try { payload = JSON.parse(raw); } catch { process.exit(0); }

const agent = payload?.subagent_name || 'unknown';
const success = payload?.success === true;
const errorSig = (payload?.last_error || '').slice(0, 200);

if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
let state = {};
try {
  state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
} catch { /* fresh */ }

const key = `${agent}::${errorSig}`;
if (success) {
  delete state[key];
} else {
  state[key] = (state[key] || 0) + 1;
}
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

if (!success && state[key] >= 3) {
  console.error(JSON.stringify({
    decision: 'halt',
    reason: `Subagent "${agent}" hit 3 strikes on error: ${errorSig}\nEscalating to human.`,
  }));
  process.exit(2);
}

process.exit(0);
