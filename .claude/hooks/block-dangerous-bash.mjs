#!/usr/bin/env node
// PreToolUse hook for Bash: blocks destructive commands.

import { readFileSync } from 'node:fs';

const DANGER_PATTERNS = [
  /\brm\s+-rf\s+\/(?!tmp|var\/tmp)/, // rm -rf / (allow /tmp)
  /\bgit\s+push\s+(--force|-f)\b.*(main|master|production)/,
  /\bcurl\s+.*\|\s*(bash|sh)\b/, // curl | sh
  /\becho\s+.*(AWS_SECRET|API_KEY|TOKEN)/,
  /\b(sudo\s+)?chmod\s+(-R\s+)?777\b/,
];

// Shell-level writes/deletes targeting the .claude control surface (hooks,
// agent/command/skill defs, settings, state). block-protected-paths.mjs already
// guards the Write/Edit tool; these close the Bash bypass — redirects, tee,
// cp/mv, sed -i, rm, PowerShell content cmdlets, and Node fs writes. Reads and
// execution (e.g. `cat .claude/...`, `node .claude/hooks/x.mjs`) stay allowed.
// Human override: ALLOW_PROTECTED=1 (same contract as block-protected-paths).
const CLAUDE_WRITE_PATTERNS = [
  />>?\s*[^|&;<>]*\.claude[\\/]/, // > / >> redirect into .claude/
  /\btee\b[^|;&]*\.claude[\\/]/, // tee into .claude/
  /\b(cp|mv|copy|move|rename)\b[^|;&]*\.claude[\\/]/, // copy/move into .claude/
  /\bsed\b[^|;&]*-i[^|;&]*\.claude[\\/]/, // sed -i on a .claude/ file
  /\brm\b[^|;&]*\.claude[\\/]/, // delete a .claude/ file
  /\b(Set-Content|Add-Content|Out-File|New-Item|Set-ItemProperty|Clear-Content|Remove-Item)\b[^|;&]*\.claude[\\/]/i, // PowerShell
  /\b(writeFileSync|writeFile|appendFileSync|appendFile|rmSync|unlinkSync)\b[^)]*\.claude[\\/]/, // node fs
];

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

const cmd = payload?.tool_input?.command || '';

for (const pat of DANGER_PATTERNS) {
  if (pat.test(cmd)) {
    console.error(
      JSON.stringify({
        decision: 'block',
        reason: `Command matches dangerous pattern ${pat}. Refusing.`,
      }),
    );
    process.exit(2);
  }
}

if (process.env.ALLOW_PROTECTED !== '1') {
  for (const pat of CLAUDE_WRITE_PATTERNS) {
    if (pat.test(cmd)) {
      console.error(
        JSON.stringify({
          decision: 'block',
          reason: `Command appears to write to the protected .claude/ control surface (matched ${pat}). Get explicit human approval, then re-run with ALLOW_PROTECTED=1.`,
        }),
      );
      process.exit(2);
    }
  }
}

process.exit(0);
