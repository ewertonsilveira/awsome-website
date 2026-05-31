# Project Context for AI Agents

This file is read automatically by Claude Code (and compatible agents) at the start of every session. Keep it short, factual, and current.

---

## Stack

- **Language**: TypeScript (strict mode)
- **Framework**: Vue 3 (Composition API, `<script setup lang="ts">`)
- **Build**: Vite
- **Runtime**: Node.js (LTS)
- **State**: Pinia
- **Testing**: Vitest 4.1+ (use `--reporter=ai` in agent loops), @vue/test-utils, Playwright (E2E), MSW (API mocking)
- **Validation**: Zod (runtime + inferred types)
- **Lint/Format**: ESLint + Prettier
- **Package Manager**: pnpm (preferred) or npm

---

## File Layout (enforce this)

```
src/
├── components/    # Presentational. Props in, events out. No fetching, no stores.
├── composables/   # use* hooks. ALL business logic lives here.
├── stores/        # Pinia stores. State + actions only.
├── services/      # API clients, side effects, external integrations.
├── types/         # Shared Zod schemas + z.infer types.
├── utils/         # Pure functions. No imports from stores/services.
└── views/         # Route-level components. Compose components + composables.
```

When unsure where new code belongs, put business logic in `composables/`, data access in `services/`, and shared shapes in `types/` as Zod schemas.

---

## Conventions

- **Components**: PascalCase filenames (`UserCard.vue`). One component per file. Always typed props via `defineProps<Props>()`.
- **Composables**: `use` prefix, camelCase (`useAuth.ts`). Return a readonly + actions object, never raw refs the caller can mutate.
- **Stores**: `useXStore` naming, defined with `defineStore('x', () => { ... })` (setup syntax).
- **Types**: Define Zod schema first, export `type Foo = z.infer<typeof FooSchema>`. Validate at every system boundary.
- **Imports**: Use path aliases (`@/components/...`) never relative `../../`.
- **Async**: `async/await`, never `.then()` chains. Always handle errors at the call site or document why not.
- **Errors**: Throw typed `AppError` subclasses, never raw `Error`. Surface user-facing errors via the global toast composable.

---

## Testing Rules

- Every composable, store, service, and util MUST have unit tests.
- Component tests cover user interactions and accessibility, not implementation details.
- Mock the network with MSW, not by stubbing fetch.
- Coverage gate: 80% lines, 80% branches for `composables/`, `services/`, `utils/`. Components excluded.
- Run `pnpm test --reporter=ai` in agent contexts to keep token usage low.

---

## Do Not Touch Without Explicit Approval

- `migrations/**` — database schema changes need human review.
- `infra/**`, `terraform/**`, `.github/workflows/**` — infrastructure changes need human review.
- `.env*` files — never read, never write. Use the secrets manager.
- `package.json` `dependencies` — propose additions in chat, do not install silently.

---

## Agent Operating Rules

1. **Spec first**: For any task larger than ~50 LOC or touching >2 files, write/update a spec under `specs/` before coding (see `.claude/commands/spec.md`).
2. **Three-strikes rule**: If a test or build fails 3 times on the same root cause, stop. Summarize what you tried, your current hypothesis, and escalate.
3. **Plan before edit**: Use the `plan` subagent for cross-file changes. Confirm the plan with the user before touching code.
4. **Verify before claiming done**: Run `pnpm typecheck && pnpm lint && pnpm test` after every meaningful change. If any fail, do not declare success.
5. **Diff hygiene**: Make the smallest diff that satisfies the spec. No unrelated reformatting. No "while I'm here" cleanups.
6. **Commit messages**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`). Reference the spec ID or ticket.
7. **No new dependencies** without justifying it in the PR description (size, maintenance, alternatives considered).

---

## Available Subagents

See `.claude/agents/`:

- `requirements-analyst` — Turn vague tickets into structured specs.
- `architect` — ADRs, system design, dependency mapping.
- `coder` — Implement against an approved spec.
- `tester` — Generate and harden test suites.
- `reviewer` — Critic pass on diffs before PR.
- `security-auditor` — Threat model + secret/dependency audit.
- `sre-incident` — Triage production anomalies.

---

## Available Slash Commands

See `.claude/commands/`:

- `/spec` — Generate a Spec-Kit-style specification.
- `/plan` — Break a spec into ordered implementation tasks.
- `/implement` — Execute a task with the coder subagent.
- `/test` — Generate or extend tests for a target.
- `/review` — Self-review a diff before pushing.
- `/pr-prep` — Produce the PR description + risk summary.
