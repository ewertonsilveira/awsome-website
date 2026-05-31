# Project Context for AI Agents

> **This is the scaffold `main` branch.** It is intentionally stack-agnostic. When you branch for a specific language or framework (e.g., `ts-vue-node`, `python-fastapi`), replace the placeholder sections below with your real stack details. Agents read this file first — keep it short, accurate, and current.

---

## About This Project

`Agentic Development` — Autonomous AI Agents for the Software Development Lifecycle.

A ready-to-clone scaffold for running a **fully agentic SDLC**. It wires together a hub-and-spoke team of AI subagents with deterministic safety hooks, slash commands, and a spec-driven workflow. The `main` branch is the base; every stack-specific implementation lives in its own branch.

---

## Stack

> **ACTION REQUIRED when branching**: Replace this entire section with your real stack.

```
Language:        <e.g., TypeScript, Python, Go, Rust>
Framework:       <e.g., Vue 3, FastAPI, Gin, Axum>
Runtime:         <e.g., Node.js LTS, Python 3.12, Go 1.22>
Build tool:      <e.g., Vite, esbuild, cargo>
Test runner:     <e.g., Vitest, pytest, go test>
Lint/format:     <e.g., ESLint + Prettier, Ruff, golangci-lint>
Package manager: <e.g., pnpm, pip + uv, go mod>
State/DB:        <e.g., Pinia, SQLAlchemy, pgx>
Validation:      <e.g., Zod, Pydantic, ozzo-validation>
```

---

## File Layout

> **ACTION REQUIRED when branching**: Replace with your repo's actual source layout. Agents use this to know where new code belongs.

```
src/
└── <describe your layout here>
```

When unsure where new code belongs, add an "If unsure" rule here that matches your architecture (e.g., "business logic in services/, data access in repositories/").

---

## Conventions

> **ACTION REQUIRED when branching**: Replace with language/framework conventions for this repo.

- **Naming**: `<your naming convention>`
- **Imports**: `<absolute paths / aliases / relative rules>`
- **Async**: `<async/await, goroutines, asyncio — your rule>`
- **Error handling**: `<typed errors, Result types, exceptions — your rule>`
- **Validation**: `<validate at every system boundary>`

---

## Testing Rules

> **ACTION REQUIRED when branching**: Replace with your test strategy.

- Every module with business logic MUST have unit tests.
- Integration tests cover system boundaries (DB, HTTP, queues).
- Mock external services at the boundary layer, not deep inside.
- Coverage gate: `<your threshold>` lines/branches for core modules.
- Run tests in agent loops with minimal output mode to save tokens.

---

## Do Not Touch Without Explicit Approval

These paths are protected by hooks — agents cannot write to them without a human override:

- `migrations/**` — database schema changes need human review.
- `infra/**`, `terraform/**`, `.github/workflows/**` — infrastructure needs human review.
- `.env*` files — never read, never write. Use the secrets manager.
- Package manifest dependencies (`package.json`, `pyproject.toml`, `go.mod`, etc.) — propose additions in chat, do not install silently.

> Adjust `.claude/hooks/block-protected-paths.mjs` to match your actual protected paths when branching.

---

## Agent Operating Rules

These rules apply to ALL agents in this repo, regardless of stack:

1. **Spec first**: For any task larger than ~50 LOC or touching >2 files, write/update a spec under `specs/` before coding (see `.claude/commands/spec.md`).
2. **Three-strikes rule**: If a test or build fails 3 times on the same root cause, stop. Summarize what you tried, your current hypothesis, and escalate to the human.
3. **Plan before edit**: Use the `architect` subagent for cross-file changes. Confirm the plan with the human before touching code.
4. **Peer review every task**: After each implementation task, the `reviewer` agent validates the diff before moving to the next task. Do not skip this step.
5. **Verify before claiming done**: Run your stack's typecheck + lint + test suite after every meaningful change. If any fail, do not declare success.
6. **Diff hygiene**: Make the smallest diff that satisfies the spec. No unrelated reformatting. No "while I'm here" cleanups.
7. **Commit messages**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`). Reference the spec ID or ticket in the body.
8. **No new dependencies** without justifying it in the PR description (size, maintenance status, alternatives considered).

---

## Skills

Stack-specific agent skills live in `.claude/skills/`. Each skill is a `SKILL.md` file that teaches agents deep, focused knowledge about a specific pattern or toolchain in this repo.

See `.claude/skills/README.md` for the format and how to add skills.

> When branching, add skills for your stack under `.claude/skills/<skill-name>/SKILL.md`.

---

## Available Subagents

See `.claude/agents/`:

| Agent | Role |
|---|---|
| `requirements-analyst` | Turns vague tickets into structured, testable specs |
| `architect` | ADRs, system design, dependency mapping, task breakdown |
| `coder` | Implements one task at a time against an approved spec |
| `tester` | Generates and hardens test suites; validates coverage |
| `reviewer` | Adversarial critic pass on every task diff and on the full PR |
| `security-auditor` | Threat model, secrets audit, dependency CVE scan |
| `sre-incident` | Production anomaly triage; does NOT execute changes |

---

## Available Slash Commands

See `.claude/commands/`:

| Command | What it does |
|---|---|
| `/spec` | Generates a structured specification from a vague input |
| `/plan` | Breaks an approved spec into ordered implementation tasks |
| `/implement` | Executes a single task with the coder → tester → reviewer loop |
| `/test` | Generates or extends tests for a specific file or module |
| `/review` | Runs an adversarial review of the current diff |
| `/pr-prep` | Produces the PR description + risk summary |
