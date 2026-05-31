#!/usr/bin/env node
/**
 * apply-models.mjs
 *
 * Reads .claude/agent-models.json and writes the correct `model:` field
 * into the YAML frontmatter of every agent file in .claude/agents/.
 *
 * Usage:
 *   node .claude/scripts/apply-models.mjs                  # use activePreset from config
 *   node .claude/scripts/apply-models.mjs --preset=quality # one-off override
 *   node .claude/scripts/apply-models.mjs --dry-run        # preview without writing
 *
 * After running, restart your Claude Code session so the new models take effect.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const CONFIG_PATH = join(ROOT, '.claude', 'agent-models.json')
const AGENTS_DIR = join(ROOT, '.claude', 'agents')

// ── Parse CLI args ──────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, v] = a.slice(2).split('=')
      return [k, v ?? true]
    })
)

const DRY_RUN = args['dry-run'] === true

// ── Load config ─────────────────────────────────────────────────────────────

let config
try {
  config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
} catch (err) {
  console.error(`❌  Could not read ${CONFIG_PATH}:\n   ${err.message}`)
  process.exit(1)
}

const presetName = args.preset ?? config.activePreset

if (!config.presets[presetName]) {
  const available = Object.keys(config.presets).join(', ')
  console.error(`❌  Unknown preset "${presetName}". Available: ${available}`)
  process.exit(1)
}

const preset = config.presets[presetName]
const overrides = config.overrides?.agents ?? {}

// Merge: preset values + any overrides on top
const resolvedModels = { ...preset.agents, ...overrides }

// ── Print selected config ────────────────────────────────────────────────────

console.log(`\n🤖  Applying preset: ${presetName}`)
console.log(`    ${preset.description}`)
console.log(`    Estimated cost: ${preset.costEstimate}`)
if (Object.keys(overrides).length > 0) {
  console.log(`    Overrides active: ${JSON.stringify(overrides)}`)
}
console.log()

// ── Process each agent file ──────────────────────────────────────────────────

const agentFiles = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'))

let changed = 0
let skipped = 0

for (const filename of agentFiles) {
  const agentName = filename.replace(/\.md$/, '')
  const targetModel = resolvedModels[agentName]

  if (!targetModel) {
    console.warn(`⚠️   No model configured for agent "${agentName}" — skipping`)
    skipped++
    continue
  }

  const filePath = join(AGENTS_DIR, filename)
  const original = readFileSync(filePath, 'utf8')

  // Match YAML frontmatter block (--- ... ---)
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/

  if (!frontmatterRegex.test(original)) {
    console.warn(`⚠️   Agent "${agentName}" has no YAML frontmatter — skipping`)
    skipped++
    continue
  }

  const updated = original.replace(frontmatterRegex, (_, fm) => {
    // Replace existing model: line, or insert after name: line
    let newFm
    if (/^model:/m.test(fm)) {
      newFm = fm.replace(/^model:.*$/m, `model: ${targetModel}`)
    } else {
      // Insert model: after the name: line
      newFm = fm.replace(/^(name:.*)$/m, `$1\nmodel: ${targetModel}`)
    }
    return `---\n${newFm}\n---`
  })

  if (updated === original) {
    console.log(`  ✓  ${agentName.padEnd(24)} already set to ${targetModel}`)
    skipped++
    continue
  }

  if (!DRY_RUN) {
    writeFileSync(filePath, updated, 'utf8')
  }

  const previousMatch = original.match(/^model:\s*(.+)$/m)
  const previous = previousMatch ? previousMatch[1].trim() : '(none)'
  const action = DRY_RUN ? '[dry-run] would set' : 'set'

  console.log(`  ✅  ${agentName.padEnd(24)} ${action}: ${previous} → ${targetModel}`)
  changed++
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log()
if (DRY_RUN) {
  console.log(`🔍  Dry run complete. ${changed} agent(s) would be updated, ${skipped} skipped.`)
  console.log(`    Run without --dry-run to apply changes.`)
} else {
  console.log(`✅  Done. ${changed} agent(s) updated, ${skipped} unchanged.`)
  console.log(`    Restart your Claude Code session for the new models to take effect.`)
}
console.log()
