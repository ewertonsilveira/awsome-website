# SDLC Playbook: From Ticket to Merged PR with Multi-Agent Development Workflow

**Role**: Software Engineer
**Stack**: TypeScript / Vue 3 / Vite / Node.js
**Tools**: Claude Code (subagents + hooks) + GitHub Copilot (chat, completion, code review agent) + Spec-Kit

This is the operational manual. It assumes you've dropped `CLAUDE.md`, `.claude/`, and `.github/copilot-instructions.md` into your repo.

---

## The Pipeline at a Glance

```
[ Tech Stack of Choice ]
         │
         ▼
┌──────────────────────────────┐
│ 1. Select TechStack - manual │  ◄── HUMAN: Select stack and update 
│                              │      files with actions
└────────────┬─────────────────┘


[ Vague ticket / idea ]
         │
         ▼
┌─────────────────────────────┐
│ 1. SPEC   (/spec)            │  ◄── requirements-analyst (Sonnet)
│   Output: SPEC-XXXX.md       │      HUMAN GATE: approve spec
└────────────┬─────────────────┘
             ▼
┌─────────────────────────────┐
│ 2. PLAN   (/plan)            │  ◄── architect (Opus)
│   Output: <SPEC>-design.md   │      HUMAN GATE: approve design
└────────────┬─────────────────┘
             ▼
┌─────────────────────────────┐
│ 3. IMPLEMENT (/implement T1) │  ◄── coder (Sonnet) → tester (Sonnet)
│   Loop per task, max 3 strikes│     HOOK GATE: typecheck/lint/test
└────────────┬─────────────────┘
             ▼
┌─────────────────────────────┐
│ 4. REVIEW   (/review)        │  ◄── reviewer (Opus) + security-auditor (Opus)
│   Output: structured verdict │      HUMAN GATE: address criticals
└────────────┬─────────────────┘
             ▼
┌─────────────────────────────┐
│ 5. PR-PREP  (/pr-prep)       │  ◄── Claude Code generates body
│   Output: PR description     │
└────────────┬─────────────────┘
             ▼
┌─────────────────────────────┐
│ 6. PR REVIEW                 │  ◄── GitHub Copilot code review agent
│   Auto-fix loop on suggestions│     HUMAN GATE: merge approval
└────────────┬─────────────────┘
             ▼
┌─────────────────────────────┐
│ 7. POST-MERGE OBSERVATION    │  ◄── sre-incident (on alert)
└──────────────────────────────┘
```

---

## Phase 1: Spec (the leverage point)

**Time investment**: 10-30 min. **Value**: prevents 80% of downstream rework.

### Step-by-step

1. Open Claude Code in the repo root.
2. Run:
   ```
   /spec Users need to upload identity documents for KYC verification
   ```
3. The `requirements-analyst` will ask 3-7 clarifying questions. Answer them in chat.
4. Review the generated `specs/SPEC-2026-XX-<slug>.md`.
5. Edit anything that's wrong. **Mark Status: Approved** when ready.

### Anti-patterns to avoid

- Skipping the spec because "it's a small change." Small changes still benefit from a 5-minute spec; you save 30 minutes of mid-coding ambiguity.
- Letting the agent write the spec without questioning it. The spec is *your* contract; own it.
- Specs longer than 2 pages. Split into multiple SPEC-XXXX or you'll lose focus.

### What good looks like
A teammate (or a fresh AI agent next month) can read your spec and explain back exactly what to build, in what order, and how you'll know it's done.

---

## Phase 2: Plan (architecture decisions, captured)

**Time investment**: 15-45 min. **Value**: locks in design before code makes it permanent.

### Step-by-step

1. With SPEC approved, run:
   ```
   /plan SPEC-2026-XX
   ```
2. The `architect` (Opus) scans the codebase, identifies reusable primitives, then produces `specs/SPEC-2026-XX-design.md` with:
   - 1-3 ADRs for non-obvious decisions
   - A component map (ASCII or mermaid)
   - "Touched Files" table
   - Zod schemas / API contracts
   - **Ordered task list** (T1, T2, T3...) — each <200 LOC
3. Read it critically. Ask: "Is there a simpler way?" If yes, push back; the architect will revise.
4. Mark design Approved.

### When to override

- The architect proposes a new dependency → push back unless justified
- The architect chose Options API → reject (CLAUDE.md says Composition only)
- The architect added a new top-level directory → push back

### Output checkpoint

You should now have:
- `specs/SPEC-2026-XX-<slug>.md` (the what)
- `specs/SPEC-2026-XX-design.md` (the how)

These are your **executable spec**. Future agents will read both.

---

## Phase 3: Implement (the loop)

**Time investment**: ~30 min per task (T1, T2, ...). **Value**: the actual work.

### Per-task loop

For each task in the design:

1. ```
   /implement SPEC-2026-XX T1
   ```
2. The `coder` (Sonnet) reads the task description and "Touched Files", writes the smallest diff that satisfies it.
3. **Hooks run automatically** after each file write:
   - `PostToolUse`: `tsc --noEmit` on touched files — failure rolls back the write
4. The coder runs `pnpm test --reporter=ai` itself, reads the output, iterates.
5. **Three-strikes**: if the coder fails the same root cause 3 times, the `SubagentStop` hook halts the loop and surfaces an escalation report. You decide what to do.
6. On success, the orchestrator hands to the `tester` (Sonnet), which adds boundary/error/security cases.
7. **Final gate** (Stop hook): full `pnpm typecheck && pnpm lint && pnpm test --coverage`. Must pass.
8. Commit with a conventional message referencing the SPEC.

### Parallel work tip
T1, T2, T3 are sequential by default but if the design marks tasks as independent, you can open multiple Claude Code sessions or use **Agent Teams** (experimental) to run them in parallel. Be careful: parallel work on touching files = merge pain.

### When to break the rhythm
- **Coder asks to touch a file not in "Touched Files"** → stop the agent, update the design first.
- **Coder proposes a new dependency** → stop, evaluate, only then proceed.
- **Tests pass but you're uneasy** → run `/review` early.

---

## Phase 4: Review (adversarial pass)

**Time investment**: 5-10 min agent time + 5-15 min human triage.

### Step-by-step

1. With all tasks done, run:
   ```
   /review SPEC-2026-XX
   ```
2. The `reviewer` (Opus) reads the diff against the spec. Runs gates. Produces a structured verdict.
3. **In parallel**, if the diff touches sensitive surfaces (auth, input, secrets, deps, network, files), `security-auditor` (Opus) runs a threat-modeling pass.
4. Aggregated output gives you Critical / Important / Nits.

### How to act on the verdict
- **BLOCK** → fix Critical, re-run `/review`. Do not skip.
- **REQUEST_CHANGES** → address Important unless you have a documented reason to ship as-is.
- **APPROVE** → proceed to PR.

### Pro tip
Don't ask the reviewer to fix what it found. That creates a coder/reviewer conflict of interest. Fix manually or invoke `/implement` with a fresh task; let the reviewer evaluate cleanly.

---

## Phase 5: PR Prep

**Time investment**: 2 min.

```
/pr-prep SPEC-2026-XX
```

Generates `PR_DESCRIPTION.md` with What / Why / How / Risks / Testing / Rollback / Checklist. Push the branch:

```bash
git push -u origin <branch>
gh pr create --body-file .git/PR_DESCRIPTION.md
```

---

## Phase 6: PR Review (Copilot agent)

GitHub Copilot's code review agent (March 2026) automatically:

1. Gathers full repo context
2. Comments on the diff
3. Offers **"Implement suggestion"** buttons → Copilot opens a fix-PR against your branch

### How to use it well

- **Treat Copilot's suggestions like a junior reviewer**: high signal on style and obvious bugs, lower signal on architecture.
- **Click "Implement suggestion" only when you've read the suggestion fully.** The fix-PR can introduce its own bugs.
- **Don't auto-merge fix-PRs.** Always re-run your local gates after pulling a Copilot fix.

### Cost gate
From June 1, 2026, Copilot reviews bill against Actions minutes + AI Credits. Configure your repo to gate reviews:
- Only run on PRs labeled `needs-review`, or
- Skip PRs touching only docs/ or tests/

Add to `.github/copilot-review-config.yml`:
```yaml
paths:
  include:
    - "src/**"
  exclude:
    - "docs/**"
    - "**/*.md"
```

### Final human review
Even with Copilot reviewing, you (or a teammate) reviews **intent**: does this match what the team agreed to build? Copilot can't answer that.

---

## Phase 7: Post-Merge Observability

Set up the `sre-incident` subagent as an on-call resource. When an alert fires:

```
@sre-incident We're seeing 5xx spikes on /api/orders since 14:32 UTC. Logs attached.
```

The agent produces ranked hypotheses + recovery options. **It does not execute anything.** You decide and run the rollback.

---

## Daily Routine (recommended)

| Time | Activity |
|---|---|
| **9:00 - 9:15** | Triage inbox: any incidents, PR review requests. Run `@sre-incident` on anything alarming. |
| **9:15 - 9:30** | Pick a ticket. Run `/spec` if not already spec'd. Approve or refine. |
| **9:30 - 10:00** | Run `/plan`. Review design with a coffee. Approve. |
| **10:00 - 12:00** | `/implement T1`, T2, T3... Interrupt only on escalations. |
| **12:00 - 12:30** | `/review`. Triage findings. |
| **12:30 - 13:00** | `/pr-prep`, push, open PR. Move on. |
| **Afternoon** | Code review for teammates (Copilot pre-pass, then you on intent). Spec work for tomorrow's tickets. |

This pattern targets **2-3 merged PRs per day** for typical-sized features, with the agents doing 70% of the typing and you doing 100% of the deciding.

---

## Cost & Token Hygiene

| Setting | Recommendation |
|---|---|
| Coder model | Sonnet (good ROI per task) |
| Tester model | Sonnet (can downshift to Haiku for trivial files) |
| Architect model | Opus (decisions matter, used rarely) |
| Reviewer model | Opus (adversarial pass needs the depth) |
| Security model | Opus |
| Requirements model | Sonnet |
| Vitest in agent loops | Always `--reporter=ai` |
| Context window budget | Keep <40% full at task start |
| Three-strikes | Hard-enforced via `SubagentStop` hook |

Expected monthly cost (1 engineer, ~40 merged PRs): **$80-$200** in Claude API + Copilot subscription. The ROI shows up in PR cycle time, not raw token spend.

---

## Maturity Roadmap (12-month)

Adapted from your existing Maturity Model section:

| Month | Target Level | Focus |
|---|---|---|
| **1** | L2 → L3 | Drop CLAUDE.md, copilot-instructions.md, subagents into one repo. Run the loop for 2 weeks. |
| **2-3** | L3 solid | Add hooks (typecheck/lint gates). Establish three-strikes discipline. |
| **4-6** | L3 → L4 | Spec-Kit adoption team-wide. Track DORA metrics. Tune subagent prompts based on escalation logs. |
| **7-9** | L4 | Agent Teams for parallel task execution. MCP servers for live ticket/error context. |
| **10-12** | L4 → L5 (selectively) | `sre-incident` auto-triages SEV3s. Reviewer agent gates all PRs. Humans focus on specs + architecture. |

L5 (full autonomy) is **not** the goal for most teams. L4 with strong human review on intent is the sweet spot through 2027.

---

## When NOT to Use This Pipeline

- **Hotfixes**: skip Spec/Plan, go straight to implement + heavy review.
- **Spikes / prototypes**: skip the pipeline entirely. Vibe-code, throw away, then spec the real thing.
- **Novel research / new algorithms**: agents are bad here. Use them as rubber-duck, write code yourself.
- **Cross-team API breaking changes**: human design review is non-negotiable. Use the architect as a starting point, not the final word.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Coder keeps modifying out-of-scope files | Design's "Touched Files" too vague | Tighten the design; re-run `/plan` |
| Tests pass but reviewer flags Critical | Coverage gap | Run `/test <file>` to expand suite |
| Hooks block legitimate writes | Path pattern too aggressive | Edit `.claude/hooks/block-protected-paths.mjs` |
| Subagent context overflows | Reading too much code | Add more targeted Grep in subagent definition |
| Copilot review missed an obvious bug | Known ~15-25% miss rate | Your reviewer subagent already caught it; trust your local gate |
| Three-strikes triggering too often | Tasks too big | Split design tasks tighter (<150 LOC each) |

---

## Quick-Reference Card

```
/spec <description>         → SPEC-XXXX.md
/plan SPEC-XXXX             → SPEC-XXXX-design.md
/implement SPEC-XXXX T1     → code + tests for T1
/test <path>                → expand test coverage
/review SPEC-XXXX           → critic + security verdict
/pr-prep SPEC-XXXX          → PR_DESCRIPTION.md

@requirements-analyst       → ask it to spec something
@architect                  → ask it a design question
@coder                      → only via /implement; not directly
@tester                     → expand tests
@reviewer                   → adversarial pass
@security-auditor           → threat model
@sre-incident               → triage an alert
```

---

## Files in This Toolkit

- `CLAUDE.md` — project context (root)
- `.claude/agents/*.md` — 7 subagent definitions
- `.claude/commands/*.md` — 6 slash commands
- `.claude/settings.json` — hooks + permissions
- `.github/copilot-instructions.md` — Copilot guidance
- `ai-agentic-research.md` — theory + 2026 update
- `SDLC-PLAYBOOK.md` — this file

Drop them into any TS/Vue/Node repo to bootstrap the workflow.
