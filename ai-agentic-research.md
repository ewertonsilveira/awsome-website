# AI Agentic Architectural research and workflow framework for Agentic Development.

# Software Engineering Workflow: The AI Agentic Development - SDLC

This document details the modern workflow for integrating specialized AI LLMs and autonomous AI Agents across the Software Development Lifecycle (SDLC) to optimize velocity, code safety, and architectural decision-making.

--- 

## Research links
Research Links for Deep DiveFor an in-depth look into how agentic systems are restructuring the software development lifecycle, explore these authoritative resources, guides, and tooling documentation:
https://www.coderabbit.ai/guides/agentic-sdlc

Methodology & Strategy: Review the technical guide on CodeRabbit's Agentic SDLC Framework to understand how the shifting of bottlenecks changes risk profiles across development phases.
https://www.coderabbit.ai/guides/agentic-sdlc

Industry Trends & Impact: Read the comprehensive market analysis in the PwC Global GenAI Agentic Survey Report outlining how engineering roles are being refactored.
https://github.com/github/spec-kit

Spec-Driven Design Systems: Access the primary source documentation for GitHub's Spec-Kit Project Repository to see how intent is written into executable specifications.
https://github.com/github/spec-kit

Operational Workflows: Study the end-to-end cloud implementation strategies shared on the Microsoft App On Azure Blog to understand how teams combine enterprise architecture with agent loops.
https://techcommunity.microsoft.com/blog/appsonazureblog/an-ai-led-sdlc-building-an-end-to-end-agentic-software-development-lifecycle-wit/4491896

Academic Foundations: Evaluate technical research and benchmark data compiled in the ArXiv Academic Survey on AI Agent Architectures, which categorizes planning, reasoning engines, and memory structures.
https://arxiv.org/html/2508.11957v1

---

## The Human-Agent Orchestration Framework

[ Human Input / Vague Ticket ]│▼┌──────────────────────────────┐│  1. REQUIREMENTS & PLANNING  │ ◄── Requirements Agent (Drafts User Stories & Specs)└──────────────┬───────────────┘│  [Human Checkpoint 1]▼┌──────────────────────────────┐│    2. ARCHITECTURE & DESIGN  │ ◄── Design/Architecture Agent (Generates ADRs)└──────────────┬───────────────┘│  [Human Checkpoint 2]▼┌──────────────────────────────┐│  3. CODE EXECUTION (CI/CD)   │ ◄── Coding Agent (Generates modular code & unit tests)└──────────────┬───────────────┘│▼┌──────────────────────────────┐│  4. QUALITY & CRITIC GATES   │ ◄── Critic/Security Agent (Runs PR review & threat model)└──────────────┬───────────────┘│  [Human Review & Merge]▼┌──────────────────────────────┐│  5. OBSERVABILITY & METRICS  │ ◄── SRE Agent (Anomalies, incident triage, and runbooks)└───────────────┬──────────────┘│▼[ Production Release ]

---

## Architectural Breakdown by SDLC Phase

### 1. Requirements & Planning (Productivity)
* **Goal**: Shift from ambiguous feature text to actionable technical blueprints in minutes.
* **AI Agent Workflow**: 
  * A **Requirements Agent** ingests an unpolished Jira/Linear ticket or text prompt.
  * The agent transforms it into explicit user stories following standard Agile formatting (*"As a user, I want to..."*).
  * It isolates system boundaries by writing out-of-scope declarations and clear definition-of-done criteria.
* **Human-in-the-Loop**: The Product Manager or Engineer reviews and refines the auto-generated stories before giving structural approval.

### 2. Architecture & Design (Decision-Making)
* **Goal**: Eliminate architectural blind spots and enforce organizational patterns.
* **AI Agent Workflow**:
  * An **Architecture Agent** reads the approved requirements documentation.
  * It maps existing software components to prevent system redundancy.
  * The agent drafts standard **Architectural Decision Records (ADRs)** and breaks the blueprint down into structured micro-tasks.
* **Human-in-the-Loop**: Senior engineers inspect the system topology and dependencies to confirm alignment with long-term infrastructure health.

### 3. Implementation & Code Execution (Productivity & Quality)
* **Goal**: Automate repetitive boilerplate and test suite generation.
* **AI Agent Workflow**:
  * A **Coding Agent** (orchestrated via terminal platforms like Claude Code or IDE environments like Cursor) checks out the localized task branch.
  * Following **Spec-Driven Development (SDD)**, the agent constructs unit and integration tests *before* writing core logic.
  * It writes modular, context-aware functional components constrained by local repository linters and conventions.
* **Human-in-the-Loop**: The developer observes execution output from code compilers, stepping in only if the agent hits infinite loops or multi-attempt limits.

### 4. Quality Assurance & Review Gates (Quality)
* **Goal**: Detect design regressions, code-smells, and vulnerabilities prior to staging.
* **AI Agent Workflow**:
  * A specialized **Critic Agent** runs an independent audit on the generated code and test results.
  * A concurrent **Security Agent** maps threat models, verifies secrets management, and checks dependencies against exploit lists.
  * The system automatically flags discrepancies, formats findings, and opens a structured Pull Request (PR).
* **Human-in-the-Loop**: Senior engineers do not audit line-by-line grammar; they verify logical diff correctness against system edge cases.

### 5. Deployment & Observability (Decision-Making)
* **Goal**: Lower Mean Time to Resolution (MTTR) when operational builds misbehave.
* **AI Agent Workflow**:
  * The automated CI/CD pipeline pushes the approved release build to staging/production.
  * An **SRE Monitoring Agent** observes logs, traces, and metrics.
  * If a production anomaly occurs, the agent summarizes the failure context, maps it to the specific PR commit, and outputs triage suggestions.

---

## Core Best Practices for Implementation


| Practice | Actionable Approach |
| :--- | :--- |
| **Centralize Context** | Package organizational coding standards, tech stacks, and repo maps into systemic context folders (e.g., `.claude/` or `.cursorrules`). |
| **Deterministic Testing** | Run traditional, deterministic validation (compilers, linters, pre-commit hooks) to check the output of non-deterministic LLMs. |
| **Escalation Rules** | Enforce a strict "three strikes" agent loop rule. If an agent fails to solve an error after three iterations, it must pause and escalate to a human developer. |
| **Outcome Tracking** | Track value based on features shipped and code coverage |

---

## 2026 Update: Production-Ready Agentic Patterns

This section extends the original framework with findings from 2026 industry practice (Spec-Kit, Claude Code subagents, GitHub Copilot agent mode, Vitest 4.1).

### A. Spec-Driven Development (SDD) as the New Default

The industry has converged on **specifications as the source of truth**, not code. GitHub Spec-Kit (90k+ stars) ships a six-command workflow that any major coding agent can consume:

`/speckit.constitution` → `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.taskstoissues` → `/speckit.implement`

Key shift: the PRD is no longer a guide for implementation — it *generates* implementation. Specs are version-controlled, stack-agnostic, and portable across agents (Copilot, Claude, Gemini, Codex, Windsurf — 30+ integrations). Locking yourself to one agent is now an anti-pattern.

### B. Hub-and-Spoke Multi-Agent Architecture

The dominant 2026 pattern for non-trivial work:

```
                    [ Orchestrator / Team Lead ]
                              │
        ┌──────────┬──────────┼──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼
   Requirements  Architect   Coder     Tester    Reviewer
   (Sonnet)     (Opus)     (Sonnet)  (Haiku)    (Opus)
```

- **One orchestrator owns the plan and integration.** Specialist subagents handle bounded tasks, each with its own context window and tool budget.
- **Per-agent model selection** routes high-stakes reasoning to Opus and high-volume cheap tasks to Haiku — cuts cost 60-80% without quality loss.
- **Parallel initialization**: subagents and MCP connections boot concurrently (since Apr 2026), shrinking cold-start to ~2s.
- **Claude Code Agent Teams** (experimental) and **Dynamic Workflows** (research preview, May 2026) provide built-in orchestration for problems too big for a single agent pass.

### C. Deterministic Guardrails via Hooks

Prompts can be ignored. Hooks cannot. Claude Code hooks are shell commands that fire on lifecycle events (`PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`, `UserPromptSubmit`). They are the safety layer between the LLM's non-determinism and the repo.

Minimum viable hook set for production:
1. **Pre-commit lint/typecheck** — block writes that fail `tsc --noEmit`, `eslint`, `vue-tsc`.
2. **Secret scanner** — block any tool call that touches `.env`, AWS keys, JWTs.
3. **Test gate** — block PR creation until `vitest run` exits 0.
4. **Protected paths** — block writes to `migrations/`, `infra/`, `.github/` without explicit human approval.

### D. Spec-Driven Testing with Vitest 4.1

Vitest 4.1 (May 2026) added a **dedicated AI agent reporter** that suppresses passing-test output and console logs, dropping token usage in agent loops by ~70%. Combined with test tags, agents can scope runs to just the surface area they touched.

Pattern for TypeScript/Vue/Node:
- Define agent output schemas with **Zod** for runtime tool-call validation.
- **Mock the LLM layer via DI** so unit tests run deterministically.
- ESLint + `tsc --noEmit` + `vue-tsc` form the "walls" — agents see red squiggles and self-correct in-loop.

### E. Agentic PR Review (GitHub Copilot, March 2026)

Copilot's code review now ingests the full repo context and can pass suggestions back to the cloud coding agent, which opens a **fix-PR against your branch automatically**. This collapses the review → fix → re-review loop from hours to minutes. Caveat: Copilot misses ~15-25% of logic bugs in benchmarks — human review of *intent* is still required, but human review of *style/syntax* is dead.

Starting June 1, 2026, each Copilot review consumes GitHub Actions minutes + AI Credits, so cost-aware teams gate reviews to PRs touching `src/` or labeled `needs-review`.

### F. The Three-Strikes Rule (Reinforced)

Industry data from 2026 deployments confirms: agents that loop more than 3 times on the same error degrade rapidly (hallucination rate climbs from ~5% to ~40% by attempt 5). Hard-code a strike limit in your orchestrator. After strike 3, the agent must:
1. Summarize what it tried.
2. State its current hypothesis.
3. Pause and escalate to human.

### G. Context Engineering Beats Prompt Engineering

The 2026 consensus: prompt wording matters less than *what's in the context window*. Practical rules:
- Keep a `CLAUDE.md` / `.github/copilot-instructions.md` at repo root with stack, conventions, and "do not touch" lists.
- Use MCP servers to pull live context (DB schemas, Linear/Jira tickets, Sentry errors) rather than pasting.
- Run a **context budget**: aim for <40% of the model's window filled at task start to leave room for tool results.

---

## 2026 Update: Stack-Specific Tactics (TypeScript / Vue / Node / Vite)

### Coding Agent Conventions
- **Strict mode everywhere** — `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true` in `tsconfig.json`. Agents lean on the compiler.
- **Vue 3 Composition API + `<script setup lang="ts">`** is the agent-friendly default — clearer dependency graph than Options API.
- **Composables over inheritance** — agents reuse `useFoo()` patterns reliably; class hierarchies confuse them.
- **Pinia** for state — predictable mutation paths the agent can trace.
- **Vite + Vitest** for unified dev/test pipeline — agents run `vitest --reporter=ai` for clean output.

### File-Layout Rules That Help Agents
```
src/
├── components/    # Pure presentational, props-in, events-out
├── composables/   # use* hooks, all business logic lives here
├── stores/        # Pinia stores
├── services/      # API clients, side effects
├── types/         # Shared Zod schemas + inferred types
└── utils/         # Pure functions only
```
Agents make ~40% fewer "where do I put this?" mistakes with this layout.

### Testing Stack
- **Vitest 4.1** (agent reporter) for unit + component tests
- **@vue/test-utils** for component mounting
- **Playwright** for E2E (agents are improving here but still need a human pass)
- **MSW** for API mocking — agents handle MSW handlers well
- **Zod** schemas double as test fixtures + runtime guards

---

## 2026 Update: Metrics That Matter

Stop measuring "lines of code generated by AI." Measure:

| Metric | Target | Why |
| :--- | :--- | :--- |
| **PR cycle time** (open → merge) | -50% from baseline | Real velocity signal |
| **Change failure rate** (DORA) | <15% | Catches agent-induced regressions |
| **Mean time to recovery** (DORA) | <1 hour | SRE agent effectiveness |
| **Spec → merged PR lead time** | <2 days for typical feature | End-to-end agentic pipeline health |
| **Agent escalation rate** | 10-25% of tasks | Below 10% = scope too narrow; above 25% = agent ill-suited |
| **Token cost per merged PR** | Track trend, not absolute | Watch for runaway loops |
| **Human review minutes per PR** | -60% from baseline | Quality of AI pre-review |

---

## 2026 Update: Anti-Patterns to Avoid

1. **One mega-agent for everything** — context bloats, quality collapses. Split by SDLC phase.
2. **Skipping the spec phase to "just code"** — the spec *is* the leverage; without it you're back to vibe-coding.
3. **No deterministic gates** — relying on the agent to enforce its own rules. It won't. Use hooks.
4. **Reviewing AI code line-by-line** — review intent, contracts, edge cases. Let the type-checker and linter handle syntax.
5. **Locking to one vendor** — agents change monthly. Keep specs, prompts, and configs portable.
6. **Ignoring the three-strikes rule** — silent degradation is the #1 cause of AI-generated tech debt.
7. **No memory hygiene** — stale `CLAUDE.md` files are worse than none. Consolidate quarterly.

---

## Sources (2026 Update)

- [GitHub Spec-Kit repository](https://github.com/github/spec-kit)
- [Spec-Driven Development with AI: The 2026 Guide](https://www.fundesk.io/spec-driven-development-github-spec-kit-guide)
- [Claude Code Agent Teams, Subagents, and MCP: The 2026 Playbook](https://www.developersdigest.tech/blog/claude-code-agent-teams-subagents-2026)
- [Multi-Agent Orchestration in Claude Code (Medium)](https://medium.com/neuralnotions/multi-agent-orchestration-in-claude-code-the-architecture-and-economics-of-subagents-06d52e69f8b2)
- [Claude Code Hooks documentation](https://code.claude.com/docs/en/hooks-guide)
- [GitHub Copilot Code Review docs](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [Vitest 4.1 AI Agent Reporter (InfoQ)](https://www.infoq.com/news/2026/05/vitest-4-1-ai-agents/)
- [AI Agent Testing Automation: Developer Workflows for 2026 (SitePoint)](https://www.sitepoint.com/ai-agent-testing-automation-developer-workflows-for-2026/)
