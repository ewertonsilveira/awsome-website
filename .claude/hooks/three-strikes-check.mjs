#!/usr/bin/env node
// SubagentStop hook: tracks failure attempts per subagent invocation.
// If the same subagent failed >=3 times on the same root cause, halt the orchestrator.
// Every event is also appended to an append-only audit log (.claude/state/strikes.log)
// so a tampered strikes.json can be cross-checked against an immutable trail.
//
// IMPORTANT (2026-06-01 fix): the real Claude Code SubagentStop payload does NOT carry
// `success`, `subagent_name`, or `last_error`. The earlier version treated an ABSENT
// `success` field as a failure, so every normal subagent stop incremented a single
// `"unknown::"` key — it ran away to 14 and `exit 2`-halted every subagent regardless of
// outcome. We now only count a strike on an EXPLICIT failure signal (`success === false`
// with an error string). When the payload carries no result signal (the normal case), we
// record an audit line and exit 0 without counting. The hard three-strikes rule is also
// enforced by the orchestrator at the skill level (CLAUDE.md Agent Operating Rule 2), so
// this hook is a backstop for payloads that DO carry an explicit failure.

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
// Only an explicit boolean tells us anything. `undefined` (the normal SubagentStop
// payload) is NOT a failure.
const explicitSuccess = payload?.success === true;
const explicitFailure = payload?.success === false;
const errorSig = (payload?.last_error || '').slice(0, 200);

if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
let state = {};
try {
  state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
} catch {
  /* fresh */
}

const key = `${agent}::${errorSig}`;

// Append-only audit trail helper: one JSON object per line, never rewritten.
// Best-effort — logging must never block a tool call.
function audit(extra) {
  try {
    appendFileSync(
      LOG_FILE,
      JSON.stringify({
        ts: new Date().toISOString(),
        agent,
        success: payload?.success ?? null,
        errorSig,
        ...extra,
      }) + '\n',
    );
  } catch {
    /* logging is best-effort */
  }
}

if (explicitSuccess) {
  // Clear any accumulated strikes for this key on a confirmed success.
  if (key in state) {
    delete state[key];
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }
  audit({ count: 0, note: 'explicit-success' });
  process.exit(0);
}

if (!explicitFailure) {
  // No result signal in the payload — the normal case. Record it, count nothing.
  audit({ count: state[key] ?? 0, note: 'no-result-signal' });
  process.exit(0);
}

// Explicit failure with an error signature: count a strike.
state[key] = (state[key] || 0) + 1;
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
audit({ count: state[key], note: 'explicit-failure' });

if (state[key] >= 3) {
  console.error(
    JSON.stringify({
      decision: 'halt',
      reason: `Subagent "${agent}" hit 3 strikes on error: ${errorSig}\nEscalating to human.`,
    }),
  );
  process.exit(2);
}

process.exit(0);
