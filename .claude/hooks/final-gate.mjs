#!/usr/bin/env node
// Stop hook: runs the v1 lean gate before the session ends.
// Gates: npm run build (Vite build + tsc --noEmit) + npm run format:check (Prettier).
// Prints results; does NOT block (the agent has already stopped).

import { execSync } from 'node:child_process';
import { join } from 'node:path';

const webAppDir = join(process.cwd(), 'web-app');

const gates = [
  ['build (vite + tsc)', 'npm run build'],
  ['format:check (prettier)', 'npm run format:check'],
];

const results = [];
for (const [name, cmd] of gates) {
  try {
    execSync(cmd, { cwd: webAppDir, stdio: 'pipe' });
    results.push(`✓ ${name}`);
  } catch (err) {
    const tail = ((err.stdout?.toString() || '') + (err.stderr?.toString() || '')).slice(-1500);
    results.push(`✗ ${name}\n${tail}`);
  }
}

console.log('\n--- Final Gate Report (web-app/) ---');
console.log(results.join('\n\n'));
console.log('-------------------------------------\n');
process.exit(0);
