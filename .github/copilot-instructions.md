# GitHub Copilot Instructions

This file is read by GitHub Copilot (chat, code completion, and code review agent) for every interaction in this repo.

## Stack
- TypeScript (strict mode), Vue 3 (`<script setup lang="ts">`), Vite, Node.js LTS
- State: Pinia. Testing: Vitest 4.1+, @vue/test-utils, Playwright, MSW. Validation: Zod.

## Hard Rules

1. **Strict TypeScript.** No `any`, no `@ts-ignore`, no `as unknown as`. If the type is hard, propose a Zod schema.
2. **Composition API only.** Never generate Options API. Always `<script setup lang="ts">`.
3. **Business logic lives in composables**, not components. Components are presentational.
4. **Validate at boundaries.** Every API response, every route param, every form input passes through Zod.
5. **Imports use `@/` aliases.** Never `../../`.
6. **One concern per PR.** No drive-by refactors.
7. **Tests are mandatory** for new composables, stores, services, utils.

## File Placement (read this before suggesting a new file)

```
src/components/    → presentational only, no fetching/stores
src/composables/   → business logic, use* hooks
src/stores/        → Pinia, defineStore('x', () => {...}) setup syntax
src/services/      → API clients, side effects
src/types/         → Zod schemas + z.infer types
src/utils/         → pure functions only
src/views/         → route-level components
```

## Spec-Driven Workflow

This repo uses Spec-Kit. Before generating non-trivial code:
1. Check if `specs/SPEC-XXXX-*.md` exists for this work.
2. If yes, ground your suggestions in the spec's acceptance criteria.
3. If no, suggest the user run `/speckit.specify` or stop and write a spec first.

## Code Review Agent Guidance

When reviewing PRs in this repo, prioritize:

1. **Spec adherence** — does the diff meet the linked SPEC's acceptance criteria?
2. **Type safety** — flag any `any`, type assertions, or unvalidated external input.
3. **Test coverage** — every new branch in a composable/service/util must have a test.
4. **Security** — flag auth changes, raw SQL, user input flowing to dangerous sinks.
5. **Performance** — flag N+1 patterns, unbounded loops, large component re-renders.
6. **Vue idioms** — flag Options API, prop mutation, deep watchers, `v-html` on user content.

Do NOT comment on:
- Formatting (Prettier owns this)
- Style preferences not encoded in ESLint
- Personal taste

## Forbidden

- `localStorage`/`sessionStorage` for tokens or PII
- `v-html` on user-controlled content
- `eval`, `Function()`, `new Function()`
- Synchronous file I/O in request paths
- Console logs in committed code (use the project logger)
- New top-level dependencies without explicit justification

## Preferred Patterns

- **Error handling**: throw typed `AppError` subclasses; never raw `Error`.
- **Async**: `async/await` only, no `.then()` chains.
- **State updates**: immutable where reasonable; Pinia setters never mutate args.
- **Component communication**: props down, events up. No prop drilling >2 levels — use provide/inject or a store.
- **Lifecycle hooks**: prefer `onMounted` over `created`. Clean up in `onUnmounted`.

## Commit Messages

Conventional Commits:
- `feat(scope): summary`
- `fix(scope): summary`
- `refactor(scope): summary`
- `test(scope): summary`
- `chore(scope): summary`
- `docs(scope): summary`

Reference the SPEC ID in the body when applicable.
