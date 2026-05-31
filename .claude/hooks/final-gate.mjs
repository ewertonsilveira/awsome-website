#!/usr/bin/env node
// Stop hook: runs full gate before the session ends.
// Prints results to the user; does NOT block (the agent has already stopped).

import { execSync } from 'node:child_process';

const gates = [
  ['typecheck', 'pnpm typecheck'],
  ['lint', 'pnpm lint'],
  ['test', 'pnpm test --reporter=ai --run'],
];

const results = [];
for (const [name, cmd] of gates) {
  try {
    execSync(cmd, { stdio: 'pipe' });
    results.push(`✓ ${name}`);
  } catch (err) {
    const tail = ((err.stdout?.toString() || '') + (err.stderr?.toString() || '')).slice(-1500);
    results.push(`✗ ${name}\n${tail}`);
  }
}

console.log('\n--- Final Gate Report ---');
console.log(results.join('\n\n'));
console.log('-------------------------\n');
process.exit(0);
