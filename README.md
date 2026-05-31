# AI Agentic Workflow — Scaffold

> **Branch strategy**: `main` is a **language/stack-agnostic scaffold**. Branch off it for any specific language or architecture (e.g., `python-fastapi`, `ts-vue`, `go-grpc`). Each branch inherits the agentic workflow; you adapt the stack-specific conventions.

---

## What Is This?

A ready-to-clone scaffold for running a **fully agentic Software Development Lifecycle (SDLC)**. It wires together a hub-and-spoke team of AI subagents — requirements analyst, architect, coder, tester, reviewer, security auditor, SRE — with deterministic safety hooks, slash commands, and a spec-driven workflow.

Drop this into any repo and go from a vague ticket to a merged PR with AI agents handling ~70% of the typing. You handle 100% of the deciding.

---

## Why This Exists

Modern AI coding tools are powerful in isolation but chaotic without structure. This scaffold solves three problems:

1. **No guardrails** — agents write to files they shouldn't, ignore type errors, loop forever. This scaffold adds hooks that block dangerous operations and enforce a three-strikes escalation rule.
2. **No workflow** — most teams use AI ad-hoc. This gives you a reproducible 7-phase pipeline (Spec → Plan → Implement → Review → PR → Merge → Observe) with human checkpoints at every high-stakes decision.
3. **Vendor lock-in** — specs, commands, and context files are portable. Swap the underlying model or agent runtime without rewriting your workflow.

The design follows 2026 industry patterns: spec-driven development as the source of truth, hub-and-spoke multi-agent architecture, per-agent model selection for cost efficiency, and deterministic hooks as the safety layer over non-deterministic LLMs.

---

## The Pipeline

```
[ Vague ticket / idea ]
         │
         ▼
┌──────────────────────┐
│ 1. /spec             │  ◄── requirements-analyst agent
│    SPEC-XXXX.md      │      ▸ HUMAN GATE: approve spec
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 2. /plan             │  ◄── architect agent
│    SPEC-XXXX-design  │      ▸ HUMAN GATE: approve design
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 3. /implement T1..Tn │  ◄── coder → tester agents
│    code + tests      │      ▸ HOOK GATE: typecheck/lint/test
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 4. /review           │  ◄── reviewer + security-auditor agents
│    verdict           │      ▸ HUMAN GATE: address criticals
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 5. /pr-prep          │  ◄── orchestrator
│    PR_DESCRIPTION.md │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 6. GitHub PR review  │  ◄── GitHub Copilot code review agent
│    auto-fix loop     │      ▸ HUMAN GATE: merge approval
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 7. Post-merge        │  ◄── sre-incident agent (on alert)
│    observability     │
└──────────────────────┘
```

---

## Repository Layout

```
.
├── CLAUDE.md                        # Agent context: stack, conventions, do-not-touch rules
├── SDLC-PLAYBOOK.md                 # Full operational manual for the pipeline
├── ai-agentic-research.md           # Research, theory, and 2026 industry patterns
├── claude-code-architecture.md      # Claude Code architecture reference
│
├── .claude/
│   ├── agents/                      # Subagent definitions (system prompts)
│   │   ├── requirements-analyst.md  # Turns vague tickets into structured specs
│   │   ├── architect.md             # ADRs, system design, dependency mapping
│   │   ├── coder.md                 # Implements against an approved spec
│   │   ├── tester.md                # Generates and hardens test suites
│   │   ├── reviewer.md              # Critic pass on diffs before PR
│   │   ├── security-auditor.md      # Threat model + secret/dependency audit
│   │   └── sre-incident.md          # Triage production anomalies
│   │
│   ├── commands/                    # Slash commands (orchestration scripts)
│   │   ├── spec.md                  # /spec  — generate a structured specification
│   │   ├── plan.md                  # /plan  — break a spec into implementation tasks
│   │   ├── implement.md             # /implement — execute a task with the coder agent
│   │   ├── test.md                  # /test  — generate or extend tests
│   │   ├── review.md                # /review — self-review a diff before pushing
│   │   └── pr-prep.md               # /pr-prep — produce PR description + risk summary
│   │
│   ├── hooks/                       # Deterministic safety layer (run on lifecycle events)
│   │   ├── block-protected-paths.mjs   # Blocks writes to migrations/, infra/, .env*, .github/workflows/
│   │   ├── block-dangerous-bash.mjs    # Blocks rm -rf /, force-pushes to main, secret echoes
│   │   ├── run-typecheck-on-ts.mjs     # Runs tsc --noEmit after every TS/Vue file write
│   │   ├── final-gate.mjs              # Runs lint + typecheck + test before declaring done
│   │   └── three-strikes-check.mjs     # Halts agent if same error loops >3 times
│   │
│   └── settings.json                # Hook wiring + allowed/denied Bash permissions
│
├── .github/
│   └── copilot-instructions.md      # GitHub Copilot context (chat, completion, code review)
│
└── specs/                           # (created per-repo) Version-controlled specifications
    └── SPEC-XXXX-<slug>.md          # Spec files live here
```

---

## Multi-Agent Architecture

```
                [ Orchestrator ]
                      │
   ┌──────┬──────┬────┴────┬──────┬──────┐
   ▼      ▼      ▼         ▼      ▼      ▼
 Req.  Arch.  Coder    Tester  Reviewer  SRE
(Sonnet)(Opus)(Sonnet) (Sonnet) (Opus)  (Opus)
```

Each subagent has a bounded role, its own context window, and a specific tool budget. High-stakes reasoning (architecture, review, security) routes to Opus; high-volume tasks (coding, testing) use Sonnet; trivial file operations can downshift to Haiku. This cuts cost 60–80% without quality loss.

**Safety is enforced by hooks, not prompts.** Hooks fire on lifecycle events (`PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`) and cannot be talked out of by the LLM:

| Hook | Trigger | What it enforces |
|---|---|---|
| `block-protected-paths` | Before Write/Edit | Blocks writes to `migrations/`, `infra/`, `.env*`, `.github/workflows/` |
| `block-dangerous-bash` | Before Bash | Blocks `rm -rf /`, force-pushes, secret echoes |
| `run-typecheck-on-ts` | After Write/Edit | Fails the tool call on TS/Vue type errors |
| `final-gate` | On Stop | Full lint + typecheck + test must pass before declaring done |
| `three-strikes-check` | On SubagentStop | Halts coder/tester if same error loops >3 times and surfaces escalation |

---

## How to Use This Scaffold

### 1. Clone and branch

```bash
# Clone the scaffold
git clone https://github.com/ewertonsilveira/ai-agentic-workflow.git my-project
cd my-project

# Create a branch for your specific stack
git checkout -b ts-vue-node        # or python-fastapi, go-grpc, etc.
```

### 2. Adapt `CLAUDE.md` for your stack

Edit `CLAUDE.md` to reflect your actual language, framework, test runner, package manager, and file layout conventions. This is the primary context file all agents read — keep it short and accurate.

### 3. Configure `.claude/settings.json`

Review hook paths and Bash allow/deny lists. Adjust the protected paths to match your repo's sensitive directories.

### 4. Update subagent definitions

Each file in `.claude/agents/` is a system prompt for a specialist agent. Update the stack-specific sections (TypeScript examples → your language) while keeping the behavioral rules intact.

### 5. Drop in your stack tooling

Add `package.json` / `pyproject.toml` / `go.mod` — whatever your stack needs. The scaffold has no runtime dependencies of its own.

### 6. Run the pipeline

Open Claude Code in the repo root:

```
/spec <describe what you want to build>
```

Follow the 7-phase pipeline. Read `SDLC-PLAYBOOK.md` for the full operational guide.

---

## Key Principles

**Spec first, code second.** The specification is the source of truth. Agents that skip the spec phase produce unreviewed, unstructured code that creates tech debt.

**Human gates at leverage points.** You approve specs, designs, and merge decisions. Agents handle the implementation loop in between.

**Three-strikes rule.** If an agent loops on the same error more than 3 times, it must stop, summarize what it tried, state its hypothesis, and escalate. This prevents silent hallucination degradation.

**Context engineering over prompt engineering.** What's in the context window matters more than how you word the prompt. Keep `CLAUDE.md` current and use MCP servers to pull live context (tickets, DB schemas, error logs) instead of pasting.

**Deterministic gates, not agent promises.** Hooks enforce linting, typechecking, and test passage. The agent cannot declare success if the gates fail.

---

## Branching Convention

| Branch | Purpose |
|---|---|
| `main` | This scaffold — stack-agnostic, no runtime code |
| `ts-vue-node` | TypeScript + Vue 3 + Node.js implementation |
| `python-fastapi` | Python + FastAPI implementation |
| `go-grpc` | Go + gRPC implementation |
| `<your-stack>` | Your implementation — branch from `main` |

When Anthropic or the community updates the core scaffold (new agents, improved hooks, updated commands), you can `git merge main` into your stack branch to pick up improvements without losing your stack-specific code.

---

## Further Reading

- `SDLC-PLAYBOOK.md` — operational manual, step-by-step guide for each pipeline phase
- `ai-agentic-research.md` — research foundations, 2026 industry patterns, metrics, anti-patterns
- `claude-code-architecture.md` — Claude Code architecture reference
- [GitHub Spec-Kit](https://github.com/github/spec-kit) — spec-driven development tooling
- [Claude Code docs](https://docs.claude.ai/en/docs/claude-code) — subagents, hooks, MCP
- [Agentic SDLC Guide — CodeRabbit](https://www.coderabbit.ai/guides/agentic-sdlc)
