#!/usr/bin/env node
// PostToolUse hook: after Write/Edit on .ts/.tsx, run tsc --noEmit from web-app/.
// Surfaces errors so the agent self-corrects; does not block the write.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { process.exit(0); }

let payload;
try { payload = JSON.parse(raw); } catch { process.exit(0); }

const filePath = payload?.tool_input?.file_path || '';
if (!/\.(ts|tsx|mts|cts)$/.test(filePath)) process.exit(0);

const webAppDir = join(process.cwd(), 'web-app');

try {
  execSync('npx tsc --noEmit', { cwd: webAppDir, stdio: 'pipe' });
  process.exit(0);
} catch (err) {
  const out = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
  console.error(JSON.stringify({
    decision: 'continue',
    surface_to_agent: true,
    message: `Typecheck failed after write to ${filePath}:\n${out.slice(0, 4000)}`,
  }));
  process.exit(0);
}
