#!/usr/bin/env node
// PreToolUse hook for Bash: blocks destructive commands.

import { readFileSync } from 'node:fs';

const DANGER_PATTERNS = [
  /\brm\s+-rf\s+\/(?!tmp|var\/tmp)/, // rm -rf / (allow /tmp)
  /\bgit\s+push\s+(--force|-f)\b.*(main|master|production)/,
  /\bcurl\s+.*\|\s*(bash|sh)\b/,        // curl | sh
  /\becho\s+.*(AWS_SECRET|API_KEY|TOKEN)/,
  /\b(sudo\s+)?chmod\s+(-R\s+)?777\b/,
];

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { process.exit(0); }

let payload;
try { payload = JSON.parse(raw); } catch { process.exit(0); }

const cmd = payload?.tool_input?.command || '';

for (const pat of DANGER_PATTERNS) {
  if (pat.test(cmd)) {
    console.error(JSON.stringify({
      decision: 'block',
      reason: `Command matches dangerous pattern ${pat}. Refusing.`,
    }));
    process.exit(2);
  }
}

process.exit(0);
