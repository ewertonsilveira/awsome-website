# AI Agentic Development Workflow — Scaffold

> **Branch strategy**: `main` is a **language/stack-agnostic scaffold**. Branch off it for any specific language or architecture (e.g., `ts-vue-node`, `python-fastapi`, `go-grpc`). Each branch inherits the full agentic pipeline; you adapt the stack-specific conventions.

---

## What Is This?

A ready-to-clone scaffold for running a **fully agentic Software Development Lifecycle (SDLC)**. It wires together a hub-and-spoke team of AI subagents — requirements analyst, architect, coder, tester, reviewer, security auditor, SRE — with deterministic safety hooks, slash commands, and a spec-driven workflow.

Drop this into any repo and go from a vague ticket to a merged PR with AI agents handling ~70% of the typing. You handle 100% of the deciding.

---

## Why This Exists

Modern AI coding tools are powerful in isolation but chaotic without structure. This scaffold solves three problems:

**No guardrails** — agents write to files they shouldn't, ignore type errors, and loop forever. This scaffold adds hooks that block dangerous operations, enforce peer review at every task, and apply a three-strikes escalation rule.

**No workflow** — most teams use AI ad-hoc. This gives you a reproducible 7-phase pipeline (Spec → Plan → Implement → Review → PR → Merge → Observe) with creator/validator agent pairs at every phase and human gates at high-stakes decisions.

**Vendor lock-in** — specs, commands, and context files are portable. Swap the underlying model or agent runtime without rewriting your workflow.

The design follows 2026 industry patterns: spec-driven development as the source of truth, hub-and-spoke multi-agent architecture, per-agent model selection for cost efficiency, and deterministic hooks as the safety layer over non-deterministic LLMs.

---
## Deployment

[![Netlify Status](https://api.netlify.com/api/v1/badges/235abaf4-f4f6-4f37-b093-1ce27499d054/deploy-status)](https://app.netlify.com/projects/awsome-nz/deploys)
---

---

## The Pipeline

Each phase has a **creator agent** that does the work and a **validator agent** that independently verifies it. Work only advances when the validator approves or when a human gate is cleared. Failures loop back to the creator (max 3 strikes) before escalating.

```
╔══════════════════════════════════════════════════════════════════════╗
║  [ Vague ticket / idea ]                                             ║
╚══════════════════════╦═══════════════════════════════════════════════╝
                       ║
       ┌───────────────▼───────────────┐
       │  PHASE 1: SPEC                │
       │  Creator:   requirements-     │
       │             analyst           │
       │  Output:    SPEC-XXXX.md      │
       │  Validator: architect         │
       │             (feasibility +    │
       │              completeness)    │
       │  ┌─────────────────────────┐  │
       │  │ APPROVE → Human Gate ✓ │  │
       │  │ REVISE  → analyst redo  │  │
       │  │          (max 2 rounds) │  │
       │  └─────────────────────────┘  │
       └───────────────┬───────────────┘
                       │  ▸ HUMAN GATE: approve spec
                       ▼
       ┌───────────────────────────────┐
       │  PHASE 2: PLAN                │
       │  Creator:   architect         │
       │  Output:    SPEC-XXXX-        │
       │             design.md         │
       │             (ADRs, tasks,     │
       │              touched files)   │
       │  Validator: reviewer          │
       │             (design critique, │
       │              over-engineering,│
       │              missing gaps)    │
       │  ┌─────────────────────────┐  │
       │  │ APPROVE → Human Gate ✓ │  │
       │  │ REVISE  → architect redo│  │
       │  │          (max 2 rounds) │  │
       │  └─────────────────────────┘  │
       └───────────────┬───────────────┘
                       │  ▸ HUMAN GATE: approve design
                       ▼
       ┌───────────────────────────────┐
       │  PHASE 3: IMPLEMENT (per task)│  Repeats for T1, T2, T3 …
       │                               │
       │  ┌─── For each Task Ti ─────┐ │
       │  │                          │ │
       │  │  Creator: coder          │ │
       │  │    writes code           │ │
       │  │    ↓                     │ │
       │  │  Gate (build+format) +   │ │
       │  │    run-app smoke check   │ │
       │  │    must pass             │ │
       │  │    ↓ fail → coder retries│ │
       │  │    (3-strikes → ESCALATE)│ │
       │  │    ↓ pass                │ │
       │  │  Validator: tester       │ │
       │  │    hardens test suite,   │ │
       │  │    adds edge/error cases │ │
       │  │    re-runs coverage gate │ │
       │  │    ↓ fail → coder fixes  │ │
       │  │    ↓ pass                │ │
       │  │  Validator: reviewer     │ │
       │  │    adversarial diff      │ │
       │  │    review of Ti only     │ │
       │  │    ┌──────────────────┐  │ │
       │  │    │ APPROVE → commit │  │ │
       │  │    │   → T(i+1)       │  │ │
       │  │    │ REQUEST_CHANGES  │  │ │
       │  │    │  → coder fixes   │  │ │
       │  │    │  → reviewer re-  │  │ │
       │  │    │    reviews       │  │ │
       │  │    │ BLOCK → HUMAN    │  │ │
       │  │    │  GATE ✓         │  │ │
       │  │    └──────────────────┘  │ │
       │  └──────────────────────────┘ │
       └───────────────┬───────────────┘
                       │  All tasks complete
                       ▼
       ┌───────────────────────────────┐
       │  PHASE 4: FULL PR REVIEW      │
       │  Creator:   reviewer          │
       │             (full diff vs     │
       │              spec)            │
       │  Validator: security-auditor  │
       │             (threat model,    │
       │              CVE scan,        │
       │              secrets check)   │
       │  ┌─────────────────────────┐  │
       │  │ APPROVE → PR Prep      │  │
       │  │ REQUEST_CHANGES         │  │
       │  │   → fix → re-review    │  │
       │  │ BLOCK → HUMAN GATE ✓  │  │
       │  └─────────────────────────┘  │
       │  ▸ HUMAN GATE: address        │
       │    any Critical findings      │
       └───────────────┬───────────────┘
                       ▼
       ┌───────────────────────────────┐
       │  PHASE 5: PR PREP             │
       │  Creator:   orchestrator      │
       │             generates         │
       │             PR_DESCRIPTION.md │
       │  Validator: reviewer          │
       │             (sanity check     │
       │              description vs   │
       │              spec intent)     │
       └───────────────┬───────────────┘
                       │  push branch, open PR
                       ▼
       ┌───────────────────────────────┐
       │  PHASE 6: GITHUB PR REVIEW    │
       │  Copilot code review agent    │
       │  auto-comments + fix-PRs      │
       │  ▸ HUMAN GATE: merge approval │
       │    (review intent, not syntax)│
       └───────────────┬───────────────┘
                       ▼
       ┌───────────────────────────────┐
       │  PHASE 7: POST-MERGE          │
       │  sre-incident monitors        │
       │  On alert → triages,          │
       │  surfaces hypotheses,         │
       │  does NOT execute rollback    │
       └───────────────────────────────┘
```

### Creator / Validator Matrix

| Phase | Creator | Validator | Loop limit |
|---|---|---|---|
| 1. Spec | requirements-analyst | architect | 2 revision rounds |
| 2. Plan | architect | reviewer | 2 revision rounds |
| 3. Implement (per task) | coder | tester → reviewer | 3 strikes per gate |
| 4. Full PR Review | reviewer | security-auditor | fix → re-review |
| 5. PR Prep | orchestrator | reviewer | 1 sanity pass |
| 6. GitHub Review | Copilot | **Human** | merge decision |
| 7. Post-merge | sre-incident | **Human** | incident-driven |

> **Per-task close-out (Phase 3).** Every `/implement` task ends the same way: the gates run (`npm run build` + `npm run format:check`) **and the app is run/smoke-checked** so the change is proven to work — not just to compile; then the `reviewer` signs off on the task diff (the same creator/validator pattern used for the design in Phase 2); then the task is committed as a single Conventional Commit. The commit leaves a **clean working tree for the next task**, so each task is independently reviewable and revertable.

---

## Repository Layout

```
.
├── CLAUDE.md                            # Agent context: stack, conventions, operating rules
├── SDLC-PLAYBOOK.md                     # Full operational manual (step-by-step per phase)
├── ai-agentic-research.md               # Research foundations, 2026 industry patterns
├── claude-code-architecture.md          # Claude Code architecture reference
│
├── .claude/
│   ├── agents/                          # Subagent definitions (system prompts)
│   │   ├── requirements-analyst.md      # Turns vague tickets into structured specs
│   │   ├── architect.md                 # ADRs, system design, task breakdown
│   │   ├── coder.md                     # Implements one task against an approved spec
│   │   ├── tester.md                    # Hardens test suites, validates coverage
│   │   ├── reviewer.md                  # Adversarial critic at task and PR level
│   │   ├── security-auditor.md          # Threat model, secrets, CVE scan
│   │   └── sre-incident.md              # Production anomaly triage
│   │
│   ├── commands/                        # Slash commands (orchestration scripts)
│   │   ├── spec.md                      # /spec  — generate a structured specification
│   │   ├── plan.md                      # /plan  — break a spec into implementation tasks
│   │   ├── implement.md                 # /implement — run the coder→tester→reviewer loop
│   │   ├── test.md                      # /test  — generate or extend tests
│   │   ├── review.md                    # /review — adversarial review of current diff
│   │   └── pr-prep.md                   # /pr-prep — produce PR description + risk summary
│   │
│   ├── hooks/                           # Deterministic safety layer
│   │   ├── block-protected-paths.mjs    # Blocks writes to migrations/, infra/, .env*
│   │   ├── block-dangerous-bash.mjs     # Blocks rm -rf /, force-pushes, secret echoes
│   │   ├── run-typecheck-on-ts.mjs      # Fails tool call on type errors (adapt per stack)
│   │   ├── final-gate.mjs               # lint + typecheck + test before declaring done
│   │   └── three-strikes-check.mjs      # Halts agent on repeated same-root-cause failures
│   │
│   ├── skills/                          # Stack-specific deep knowledge for agents
│   │   ├── README.md                    # Format spec and how to add new skills
│   │   └── example-vue-ts-vite-storybook/
│   │       └── SKILL.md                 # Example: Vue 3 + TS + Vite + Storybook patterns
│   │
│   └── settings.json                    # Hook wiring + allowed/denied Bash permissions
│
├── .github/
│   └── copilot-instructions.md          # GitHub Copilot context (chat, completion, review)
│
└── specs/                               # (created per-repo) Version-controlled specifications
    └── SPEC-XXXX-<slug>.md
```

---

## Model Configuration

Model selection is controlled by a single config file — no need to edit individual agent files.

### The Config File

`.claude/agent-models.json` has three named presets and an optional per-agent override block:

| Preset | Who uses it | Cost estimate |
|---|---|---|
| `budget` | Haiku for high-volume agents, Sonnet for reasoning agents | ~$10–30/mo |
| `balanced` | **Default.** Sonnet for coder/tester/requirements, Opus for architect/reviewer/security | ~$80–200/mo |
| `quality` | Opus everywhere. Maximum depth. | ~$400–800/mo |

To switch presets, edit `activePreset` in the config:

```json
{
  "activePreset": "balanced"
}
```

To temporarily upgrade one agent without changing the preset, use `overrides.agents`:

```json
{
  "activePreset": "balanced",
  "overrides": {
    "agents": { "coder": "claude-opus-4-6" }
  }
}
```

Then run the apply script to propagate the config into the agent files.

### Applying the Config

```bash
# Apply the active preset (reads activePreset from the config)
node .claude/scripts/apply-models.mjs

# One-off: use a different preset for this session only (doesn't change the config file)
node .claude/scripts/apply-models.mjs --preset=quality

# Preview what would change without writing anything
node .claude/scripts/apply-models.mjs --dry-run
```

After running, restart your Claude Code session. Claude Code reads the `model:` frontmatter from each agent file at invocation time — the script is the only thing that writes to those files.

### How Enforcement Works

1. `agent-models.json` is the source of truth for model assignments.
2. `apply-models.mjs` reads the config and writes `model: <value>` into the YAML frontmatter of each `.claude/agents/*.md` file.
3. Claude Code reads that frontmatter when it invokes the subagent and routes the request to the correct model.
4. Hooks and settings.json do not touch model selection — that separation is intentional.

---

## Multi-Agent Architecture

```
                    [ Orchestrator ]
                          │
     ┌──────┬──────┬──────┼──────┬──────────┬──────┐
     ▼      ▼      ▼      ▼      ▼          ▼      ▼
   Req.  Arch.  Coder  Tester  Reviewer  Security  SRE
 (Sonnet)(Opus)(Sonnet)(Sonnet) (Opus)    (Opus)  (Opus)
```

Each subagent has a bounded role, its own context window, and a specific tool budget. High-stakes reasoning (architecture, review, security) routes to Opus. High-volume tasks (coding, testing, requirements) use Sonnet. Trivial file operations can downshift to Haiku. This cuts cost 60–80% without quality loss.

**Safety is enforced by hooks, not prompts.** Hooks fire on lifecycle events and cannot be bypassed by the LLM:

| Hook | Trigger | Enforces |
|---|---|---|
| `block-protected-paths` | Before Write/Edit | Blocks writes to `migrations/`, `infra/`, `.env*`, `.github/workflows/` |
| `block-dangerous-bash` | Before Bash | Blocks `rm -rf /`, force-pushes, secret echoes |
| `run-typecheck-on-ts` | After Write/Edit | Fails the tool call on type errors (adapt for your stack) |
| `final-gate` | On Stop | Full lint + typecheck + test must pass before declaring done |
| `three-strikes-check` | On SubagentStop | Halts coder/tester if same root cause repeats >3 times; surfaces escalation |

---

## Agent Skills

Skills are focused `SKILL.md` files that teach agents **deep, concrete knowledge about one specific pattern or toolchain** in your repo. They supplement `CLAUDE.md` (which holds general conventions) with templates, examples, and anti-patterns the agent can follow exactly.

### How Skills Work

```
.claude/skills/
├── README.md                             ← format spec
└── <skill-name>/
    └── SKILL.md                          ← the skill
```

Agents load a skill when a task falls within its domain. The skill tells them: where files go, what the canonical template looks like, what anti-patterns to avoid, and what the pre-handoff checklist is.

### When to Create a Skill

Create a skill when:
- You have a repeatable pattern agents get wrong without explicit guidance
- A file type or module type has non-obvious conventions (e.g., "Storybook stories must cover these 4 cases")
- A toolchain integration has footguns the agent keeps hitting

### Example: Vue 3 + TypeScript + Vite + Storybook

The included example skill lives at `.claude/skills/example-vue-ts-vite-storybook/SKILL.md`. It covers:

| Area | What the skill defines |
|---|---|
| **Component** | `src/components/<Name>.vue` — `<script setup lang="ts">`, typed props/emits, presentational only |
| **Storybook Story** | `<Name>.stories.ts` — `Meta`, `StoryObj`, `autodocs`, mandatory edge-case stories |
| **Composable** | `src/composables/use<Name>.ts` — returns `{ state: readonly, actions }`, validates at boundary |
| **Pinia Store** | `src/stores/<name>Store.ts` — setup syntax, state + actions only |
| **Zod Schema + Type** | `src/types/<domain>.ts` — schema first, `z.infer<>` type exported |
| **Service** | `src/services/<domain>Service.ts` — HTTP client, no validation, no store imports |
| **Vitest Test** | Behavior-focused, MSW for mocking, error paths required |

**Folder structure for this stack:**

```
src/
├── components/          # UserCard.vue, UserCard.stories.ts
├── composables/         # useUserProfile.ts
├── stores/              # authStore.ts
├── services/            # userService.ts
├── types/               # user.ts (Zod schemas + inferred types)
├── utils/               # pure functions, AppError
└── views/               # route-level pages
```

**How to use it in a branch:**

1. Copy `.claude/skills/example-vue-ts-vite-storybook/` → rename to match your project (e.g., `.claude/skills/ui-components/`)
2. Update the templates to match your exact project patterns
3. Reference it in `CLAUDE.md` → Skills section so agents know to load it

### Adding Your Own Skill

See `.claude/skills/README.md` for the full SKILL.md format template and step-by-step instructions.

---

## How to Use This Scaffold

### 1. Clone and branch

```bash
git clone https://github.com/ewertonsilveira/ai-agentic-workflow.git my-project
cd my-project

# Create a branch for your specific stack
git checkout -b ts-vue-node        # or python-fastapi, go-grpc, etc.
```

### 2. Adapt `CLAUDE.md` for your stack

Replace all `ACTION REQUIRED` placeholder sections with your real language, framework, file layout, and conventions. This is the first file every agent reads.

### 3. Adapt `.github/copilot-instructions.md`

Same — replace placeholders with real hard rules for your stack.

### 4. Adapt the hooks

Update `.claude/hooks/run-typecheck-on-ts.mjs` (or replace it) to run your stack's type checker. Update `.claude/hooks/block-protected-paths.mjs` for your sensitive directories.

### 5. Update subagent definitions

Each file in `.claude/agents/` has stack-neutral behavioral rules. Review and update any examples that reference TypeScript/Vue to match your stack. Keep the behavioral rules (three-strikes, handoff format, etc.) intact.

### 6. Add stack skills

Under `.claude/skills/`, create a `SKILL.md` for each major pattern in your stack (components, API routes, DB models, etc.). See the included Vue/TS example.

### 7. Run the pipeline

Open Claude Code in the repo root and start with a spec:

```
/spec <describe what you want to build>
```

Follow the 7-phase pipeline. Read `SDLC-PLAYBOOK.md` for the full step-by-step guide.

---

## Key Principles

**Spec first, code second.** The specification is the source of truth. Agents that skip the spec phase produce unreviewed, unstructured code that creates tech debt.

**Creator + validator at every step.** No phase produces output without an independent agent reviewing it. The reviewer agent is not a post-process — it's woven into the implementation loop at the task level.

**Human gates at leverage points.** You approve specs, designs, and merge decisions. Agents handle the implementation and review loops in between.

**Three-strikes rule.** If an agent loops on the same error more than 3 times, it must stop, summarize what it tried, state its hypothesis, and escalate.

**Deterministic gates, not agent promises.** Hooks enforce linting, typechecking, and test passage. The agent cannot declare success if the gates fail.

**Context engineering over prompt engineering.** Keep `CLAUDE.md` current. Use skills to give agents deep pattern knowledge. Use MCP servers to pull live context (tickets, DB schemas, error logs).

---

## Branching Convention

| Branch | Purpose |
|---|---|
| `main` | This scaffold — stack-agnostic, no runtime code |
| `ts-vue-node` | TypeScript + Vue 3 + Node.js + Storybook |
| `python-fastapi` | Python + FastAPI + pytest |
| `go-grpc` | Go + gRPC + protobuf |
| `<your-stack>` | Your implementation — branch from `main` |

When the core scaffold improves (new agents, updated hooks, new commands), `git merge main` into your stack branch to pick up improvements without losing stack-specific work.

---

## Further Reading

- `SDLC-PLAYBOOK.md` — operational manual, step-by-step guide for each pipeline phase
- `ai-agentic-research.md` — research foundations, 2026 industry patterns, metrics, anti-patterns
- `.claude/skills/README.md` — skill format and how to add new skills
- `.claude/skills/example-vue-ts-vite-storybook/SKILL.md` — Vue/TS/Vite/Storybook example skill
- [GitHub Spec-Kit](https://github.com/github/spec-kit) — spec-driven development tooling
- [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code) — subagents, hooks, MCP
- [Agentic SDLC Guide — CodeRabbit](https://www.coderabbit.ai/guides/agentic-sdlc)
