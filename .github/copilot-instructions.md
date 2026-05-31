# GitHub Copilot Instructions

> **This is the scaffold `main` branch.** These instructions are intentionally stack-agnostic. When you branch for a specific stack, replace the placeholder sections with real rules for your language, framework, and toolchain.

This file is read by GitHub Copilot (chat, code completion, and code review agent) for every interaction in this repo.

---

## About This Repo

This is the `ai-agentic-workflow` scaffold — a hub-and-spoke multi-agent SDLC framework. The `main` branch contains no application code, only agent definitions, slash commands, hooks, and workflow documentation. Stack-specific branches contain the actual implementation.

---

## Stack

> **ACTION REQUIRED when branching**: Replace with your actual stack.

```
Language:    <e.g., TypeScript strict, Python 3.12, Go 1.22>
Framework:   <e.g., Vue 3, FastAPI, Gin>
Build:       <e.g., Vite, esbuild, cargo>
Testing:     <e.g., Vitest, pytest, go test>
Lint:        <e.g., ESLint + Prettier, Ruff, golangci-lint>
Validation:  <e.g., Zod, Pydantic, ozzo-validation>
```

---

## Hard Rules (scaffold-level — apply to every branch)

1. **Spec before code.** Before generating non-trivial code, check if `specs/SPEC-XXXX-*.md` exists for this work. If yes, ground all suggestions in the spec's acceptance criteria. If no, suggest the user run `/spec` first.
2. **One concern per PR.** No drive-by refactors.
3. **Tests are mandatory** for any new module with business logic.
4. **Validate at every boundary.** All external input — API responses, route params, form data, environment variables — must be validated before use.
5. **No new top-level dependencies** without explicit justification.
6. **Conventional Commits.** All commit messages follow `type(scope): summary`. Reference the SPEC ID in the body.
7. **Peer review at every task.** After each implementation task, the `reviewer` agent must sign off before the next task starts.

> **ACTION REQUIRED when branching**: Add stack-specific hard rules below this line (e.g., "No `any` in TypeScript", "No bare `except:` in Python", "No goroutine leaks").

---

## File Placement

> **ACTION REQUIRED when branching**: Replace with your repo's actual directory map.

```
<describe your layout here>
```

---

## Spec-Driven Workflow

This repo uses a spec-first workflow:

1. Check if `specs/SPEC-XXXX-*.md` exists for the current work.
2. If yes, ground all suggestions in the spec's acceptance criteria and design doc.
3. If no, suggest the user run `/spec <description>` before writing any code.

The spec is the contract. Code that diverges from the spec must either update the spec or revert.

---

## Code Review Agent Guidance

When reviewing PRs in this repo, prioritize in this order:

1. **Spec adherence** — does the diff meet the linked SPEC's acceptance criteria?
2. **Correctness** — logic bugs, off-by-one errors, async ordering issues, missed null/error branches.
3. **Test coverage** — every new branch in business logic must have a test. Error paths must be tested.
4. **Security** — auth changes, unvalidated external input, secrets in logs, dangerous sinks.
5. **Performance** — N+1 patterns, unbounded loops, resource leaks.
6. **Stack idioms** — flag anti-patterns specific to the stack (fill in when branching).

Do NOT comment on:
- Formatting (the linter owns this)
- Style preferences not encoded in the linter config
- Personal taste

---

## Forbidden (scaffold-level — apply to every branch)

- Secrets, tokens, or PII in source code or logs
- `eval` or dynamic code execution from user input
- Synchronous blocking I/O in request-handling paths
- Committed debug/print/console statements (use the project logger)
- Force-pushing to `main`
- Writing to `.env*` files

> **ACTION REQUIRED when branching**: Add stack-specific forbidden patterns (e.g., `localStorage` for tokens in frontend apps, bare `except:` in Python, goroutine spawning without cancel context in Go).

---

## Preferred Patterns (scaffold-level)

- **Error handling**: Use typed/structured errors. Never swallow errors silently.
- **Async**: Use the language-idiomatic async pattern consistently throughout. Do not mix styles.
- **Immutability**: Prefer immutable data structures for state. Mutations should be explicit and localized.
- **Dependency injection**: Pass dependencies explicitly. Avoid global singletons that are hard to test.

> **ACTION REQUIRED when branching**: Add stack-specific preferred patterns.

---

## Commit Messages

Conventional Commits:

```
feat(scope): summary
fix(scope): summary
refactor(scope): summary
test(scope): summary
chore(scope): summary
docs(scope): summary
```

Reference the SPEC ID in the body when applicable: `Implements SPEC-2026-04`.
