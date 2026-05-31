# GitHub Copilot Instructions

> **This is the scaffold `main` branch.** These instructions are intentionally stack-agnostic. When you branch for a specific stack, replace the placeholder sections with real rules for your language, framework, and toolchain.

This file is read by GitHub Copilot (chat, code completion, and code review agent) for every interaction in this repo.

---

## About This Repo

**AWSome Painting & Decorating — Marketing Site** (`SPEC-2026-01`). A fully static React 19 + TanStack Start site deployed to Netlify. Application code lives in `web-app/`. The agentic scaffold (agents, hooks, commands, skills) lives at the repo root.

---

## Stack

```
Language:    TypeScript 5.x strict
Framework:   React 19 (functional components + hooks only)
Meta-fw:     TanStack Start — static prerender, no SSR runtime
Router:      TanStack Router (file-based; routeTree.gen.ts is auto-generated)
Styling:     Tailwind CSS v4 (@tailwindcss/vite)
Build:       Vite 8 → dist/client (static)
Validation:  Zod (client-side form validation)
Forms:       Netlify Forms (no backend, no API keys)
Lint/format: Prettier + tsc --noEmit (no ESLint / Vitest in v1)
Pkg mgr:     npm (never pnpm / yarn)
Node:        v24.3.0
Hosting:     Netlify
```

---

## Hard Rules

1. **Spec before code.** The active spec is `specs/SPEC-2026-01-awsome-painting-netlify-site.md`. Ground all suggestions in its acceptance criteria (AC-01 … AC-15).
2. **One concern per PR.** No drive-by refactors.
3. **No `any` in TypeScript.** No `@ts-ignore`. No `as unknown as X`. `strict: true` is enforced.
4. **No SSR APIs.** This is static prerender — no `useServerFn`, no server-only imports, no runtime env reads.
5. **Static form detection.** The Netlify Forms `<form>` MUST be present in prerendered HTML — never render it client-side only.
6. **No new top-level dependencies** without explicit justification in the PR.
7. **Conventional Commits.** `type(scope): summary` — reference `SPEC-2026-01` in the body.
8. **Peer review at every task.** The `reviewer` agent signs off before moving to the next task.
9. **routeTree.gen.ts is auto-generated.** Never hand-edit it. TanStack Router regenerates it on build/dev.

---

## File Placement

```
web-app/src/
├── routes/         # File-based pages: __root.tsx, index.tsx, about.tsx,
│                   #   services.tsx, projects.tsx, contact.tsx, $.tsx (404)
├── components/     # Reusable presentational components (PascalCase.tsx)
├── data/           # Hard-coded content as typed constants (no JSX)
├── styles/         # app.css — Tailwind v4 entry + CSS theme tokens
├── router.tsx      # createRouter()
└── routeTree.gen.ts # AUTO-GENERATED — never hand-edit
```

Import alias: `~/` maps to `web-app/src/`. Always prefer it over relative paths.

---

## Spec-Driven Workflow

This repo uses a spec-first workflow:

1. Check if `specs/SPEC-XXXX-*.md` exists for the current work.
2. If yes, ground all suggestions in the spec's acceptance criteria and design doc.
3. If no, suggest the user run `/spec <description>` before writing any code.

The spec is the contract. Code that diverges from the spec must either update the spec or revert.

---

## Code Review Agent Guidance

When reviewing PRs in this repo, work through these checks in order. Stop and flag the first **blocker** found; list lower-severity findings separately.

### 1. Spec adherence (blocker if missing)
- Active spec: `specs/SPEC-2026-01-awsome-painting-netlify-site.md`. Check the diff against the AC it claims to address (AC-01 … AC-15).
- If a changed file is not in the spec's scope, flag it as out-of-scope.

### 2. TypeScript correctness (blocker)
- Any `any`, `@ts-ignore`, `// @ts-nocheck`, or `as unknown as X` — block.
- Props / event handler types must be explicit; no implicit `any` via missing generics.
- Zod schema type exported via `z.infer<typeof Schema>` — never duplicate type declarations.

### 3. Netlify Forms static-render constraint (blocker)
- If the diff touches the contact form: verify `<form name="contact" method="POST" data-netlify="true">` is rendered inside a route component (not inside `useEffect`, a lazy-loaded component, or a client-only branch).
- The hidden `<input type="hidden" name="form-name" value="contact" />` and honeypot `bot-field` input must be present in the same form.

### 4. Route / component structure
- New pages must be in `web-app/src/routes/` as file-based routes; they must export `Route = createFileRoute(...)`.
- Reusable UI goes in `web-app/src/components/`; it must be purely presentational (no data fetching, no direct API calls).
- Business content (copy, lists, contact details) must live in `web-app/src/data/`; flag any hard-coded strings in JSX.

### 5. Accessibility (flag, not blocker)
- Every `<img>` must have an `alt` attribute (empty string only for decorative images).
- Every form field must have an associated `<label htmlFor="…">`.
- Error messages must use `aria-invalid` + `aria-describedby` pointing to the error element.
- Interactive elements (buttons, links, menu toggle) must have visible focus indicators.

### 6. Security & secrets
- No API keys, tokens, or credentials in source.
- `netlify.toml` must use relative `publish = "dist/client"` — flag any absolute path.
- CSP in `netlify.toml` must contain at minimum `default-src 'self'`.

### 7. Auto-generated files
- If `routeTree.gen.ts` appears in the diff with hand-written edits (not just TanStack Router output), block it.

### 8. Package manager hygiene
- Any `pnpm-lock.yaml`, `yarn.lock`, or `bun.lockb` in the diff — block; this repo uses npm only.

Do NOT comment on:
- Formatting — Prettier owns this; `npm run format:check` is the gate.
- Style preferences not encoded in the linter config.
- Personal taste.

---

## Forbidden

- Secrets, tokens, or API keys in source code or logs
- `eval` or dynamic code execution from user input
- Committing `console.log` / debug statements
- Force-pushing to `main`
- Writing to `.env*` files
- Hand-editing `routeTree.gen.ts`
- Using `any`, `@ts-ignore`, or `as unknown as X` to suppress TypeScript errors
- Rendering the Netlify Forms `<form>` only on the client — it must be in prerendered HTML
- Using `pnpm` or `yarn` — npm only

---

## Preferred Patterns

- **Components**: Functional, presentational — props in, callbacks out. No side-effects in render.
- **Content**: Business copy and lists in `src/data/` — not inlined in JSX.
- **Tailwind**: Utility classes only; no inline `style=` for layout/colour. Extend theme in `app.css`.
- **Forms**: Zod schema for validation; `aria-describedby` + `aria-invalid` for accessible errors.
- **Images**: `loading="lazy"` for below-the-fold/gallery; `alt` text on every `<img>`; decorative images use `alt=""`.
- **Async**: `async/await` — no `.then()` chains.

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
