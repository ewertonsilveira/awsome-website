#!/usr/bin/env node
// PostToolUse hook: after Write/Edit on .ts/.vue, run tsc --noEmit on that file.
// If it fails, surface the error so the agent self-corrects on the next iteration.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { process.exit(0); }

let payload;
try { payload = JSON.parse(raw); } catch { process.exit(0); }

const filePath = payload?.tool_input?.file_path || '';
if (!/\.(ts|vue|mts|cts)$/.test(filePath)) process.exit(0);

try {
  execSync('pnpm exec vue-tsc --noEmit', { stdio: 'pipe' });
  process.exit(0);
} catch (err) {
  const out = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
  console.error(JSON.stringify({
    decision: 'continue',
    surface_to_agent: true,
    message: `Typecheck failed after write to ${filePath}:\n${out.slice(0, 4000)}`,
  }));
  // Exit 0 so the write isn't rolled back, but the agent sees the error in context.
  process.exit(0);
}
