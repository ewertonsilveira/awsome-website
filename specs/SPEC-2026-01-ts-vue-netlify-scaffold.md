# Spec: TypeScript + Vue 3 Web App Scaffold on Netlify

**ID**: SPEC-2026-01
**Status**: Draft
**Owner**: Requirements Analyst
**Created**: 2026-05-31
**Branch**: `create-ts-vue-app`

---

## Overview

This spec covers the creation of a production-ready scaffold web application using TypeScript 5 and Vue 3, deployed to Netlify via Git integration. The scaffold establishes opinionated, repeatable conventions for routing, state management, component architecture, testing, and CI/CD so that every feature built on top of it starts from a consistent, well-typed foundation. It is the concrete implementation of the `create-ts-vue-app` branch in the agentic SDLC scaffold repo.

---

## Problem

The `main` branch of this repo is intentionally stack-agnostic. Developers who want to build a TypeScript + Vue 3 app using this agentic workflow currently have no concrete starting point: the `Stack`, `File Layout`, and `Conventions` sections of `CLAUDE.md` are all placeholder text. Every new project must rediscover the same decisions (build tool, state library, router config, Netlify wiring) from scratch, which is slow and produces inconsistent results across teams and AI agents.

---

## Goals

- Produce a runnable Vue 3 + TypeScript 5 application skeleton that passes `typecheck`, `lint`, and `test` without modification.
- Provide a `netlify.toml` that correctly handles SPA history-mode routing and env-var conventions so a first deploy succeeds on `git push`.
- Populate all placeholder sections in `CLAUDE.md` with the real stack details so downstream agents have accurate context.
- Achieve a Lighthouse performance score >= 90 and accessibility score >= 90 on the default home page before any feature code is added.
- Establish a test coverage baseline of >= 80% lines/branches on `src/composables/` and `src/stores/`.

---

## Non-Goals

- No backend, API server, or serverless functions in this spec. Flag as an Open Question if needed later.
- No authentication or authorization layer. A separate spec will cover this if required.
- No database, ORM, or persistent storage beyond browser `localStorage` if Pinia persistence is needed (separate spec).
- No CMS integration (Contentful, Sanity, etc.).
- No Storybook setup in this spec. The existing `example-vue-ts-vite-storybook` skill documents that pattern; a follow-on spec may add it.
- No end-to-end (E2E) tests (Playwright, Cypress). Covered separately.
- No internationalization (i18n). Out of scope unless the user specifies a domain requiring it.
- No design system or component library integration (e.g., Vuetify, PrimeVue). Scaffold ships with plain CSS custom properties only.

---

## Functional Requirements

### FR-01 — Application Shell

The scaffold MUST render a functioning single-page application shell with:

- A persistent `AppHeader` component containing the site title (sourced from `VITE_SITE_TITLE` env var, falling back to `"My App"`) and primary navigation links.
- A persistent `AppFooter` component.
- A `<RouterView>` main content area between header and footer.
- A `NotFound` (404) catch-all route that renders a user-facing "Page not found" message.

### FR-02 — Route Structure

Vue Router 4 MUST be configured with HTML5 history mode. The initial route set:

| Route | Path | View component |
|---|---|---|
| Home | `/` | `views/HomeView.vue` |
| About | `/about` | `views/AboutView.vue` |
| Not Found | `/:pathMatch(.*)*` | `views/NotFoundView.vue` |

Routes MUST be code-split via dynamic `import()` so each view is a separate async chunk. The router MUST scroll to the top of the page on every navigation.

### FR-03 — State Management

Pinia MUST be installed and registered as the global state plugin. A `useAppStore` store MUST exist as the canonical example demonstrating:

- Typed reactive state (at minimum: `appTitle: string`, `isLoading: boolean`).
- At least one computed getter.
- At least one action.

The store MUST use Pinia's setup-function syntax (not the options API syntax).

### FR-04 — Environment Variable Conventions

All runtime configuration MUST be accessed via `import.meta.env.VITE_*` variables (Vite convention). A committed `.env.example` file MUST document every variable the app reads. The actual `.env` and `.env.local` files MUST be listed in `.gitignore`. The Netlify deployment MUST read the same variable names via Netlify's environment variable UI.

> **Note**: The Netlify deployment context doc referenced `VUE_APP_` prefix (Vue CLI convention). This spec mandates Vite, which uses `VITE_` prefix. See Open Question OQ-02.

### FR-05 — CLAUDE.md Population

The `CLAUDE.md` file in the repo root MUST have all placeholder sections replaced with the real stack details for this branch:

- Stack table filled with actual values.
- File layout section reflecting the `src/` tree defined in this spec.
- Conventions section with naming, import alias, async, error handling, and validation rules.
- Testing rules with the 80% coverage gate and Vitest specifics.

---

## Non-Functional Requirements

### NFR-01 — Performance

- Production bundle initial JS payload MUST be <= 150 kB gzipped (excluding async route chunks).
- Route-level code splitting MUST be enabled so no single async chunk exceeds 100 kB gzipped.
- Lighthouse Performance score on the Home route MUST be >= 90 when measured against the Netlify production URL.

### NFR-02 — Accessibility

- All interactive elements MUST have accessible names (WCAG 2.1 Success Criterion 4.1.2).
- Color contrast MUST meet WCAG 2.1 AA (SC 1.4.3: 4.5:1 for normal text, 3:1 for large text).
- The application MUST be keyboard-navigable: focus order MUST be logical, focus indicators MUST be visible.
- The Lighthouse Accessibility score on the Home route MUST be >= 90.

### NFR-03 — Responsive Design

- Layout MUST be usable at viewport widths from 320 px to 1440 px without horizontal scroll.
- Breakpoints: mobile-first. Define at minimum `sm` (>= 640 px) and `lg` (>= 1024 px).
- No external CSS framework is required; use CSS custom properties and media queries directly.

### NFR-04 — TypeScript Strictness

- `tsconfig.json` MUST enable `"strict": true` with no per-file `@ts-ignore` suppressions in committed scaffold code.
- `vue-tsc` MUST report zero errors on a clean checkout.

### NFR-05 — Code Quality Gates

- ESLint MUST pass with zero errors on `pnpm lint`.
- Prettier formatting MUST be enforced via `pnpm format:check` (fails on diff).
- `pnpm typecheck` (`vue-tsc --noEmit`) MUST exit 0.
- All three checks MUST be run as pre-commit hooks via `lint-staged` + `husky`.

### NFR-06 — Security Baseline

- No secrets, tokens, or credentials MUST appear in source control (enforced by the existing `block-protected-paths` hook and `.gitignore`).
- `Content-Security-Policy` header MUST be set in `netlify.toml` `[[headers]]` to at minimum: `default-src 'self'`, with documented extension points for CDN assets.
- `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` MUST be set in Netlify headers.

---

## Tech Stack

```
Language:         TypeScript 5 (strict mode)
Framework:        Vue 3 — Composition API, <script setup lang="ts">
Runtime:          Node.js LTS (>= 20)
Build tool:       Vite (latest stable)
Test runner:      Vitest (latest stable) + @vue/test-utils
Lint/format:      ESLint (eslint-plugin-vue, @typescript-eslint) + Prettier
Package manager:  pnpm
State:            Pinia (setup-function syntax)
Router:           Vue Router 4 (history mode)
Validation:       Zod (boundary validation; schema-first types)
HTTP client:      Native fetch (no Axios in scaffold; add via separate spec if needed)
Git hooks:        husky + lint-staged
```

---

## Architecture Notes

> These are constraints and patterns for the architect and coder agents. No implementation decisions are made here; this section flags what the architect MUST address in the subsequent design step.

**Source layout:**

```
src/
├── components/     # Presentational only. Props in, events out.
├── composables/    # use* hooks. All business logic lives here.
├── stores/         # Pinia stores. State + actions only.
├── services/       # API clients and external integrations.
├── types/          # Zod schemas + z.infer types.
├── utils/          # Pure functions. No Vue or store imports.
├── views/          # Route-level components.
├── router/         # Vue Router instance and route definitions.
└── App.vue         # Root component.
```

**Import alias** — `@/` MUST resolve to `src/` in both Vite config and `tsconfig.json` `paths`. No relative `../` imports that traverse more than one level.

**Component contract** — Every component in `src/components/` MUST be presentational (no store reads, no direct API calls). Data flows in via typed props; events flow out via typed emits. Stores and composables are the responsibility of `src/views/`.

**Error handling** — All async operations in composables MUST catch errors and surface them as typed `error` state (not unhandled promise rejections). A shared `AppError` utility class MUST be created in `src/utils/AppError.ts`.

**Architect flag**: The choice of CSS architecture (plain custom properties vs. a utility-first approach like UnoCSS) is not decided in this spec. Flag for the architect agent as part of the design task.

---

## Netlify Deployment

### `netlify.toml` Requirements

The committed `netlify.toml` in the repo root MUST include:

**Build settings:**

```toml
[build]
  command   = "pnpm build"
  publish   = "dist"

[dev]
  command   = "pnpm dev"
  port      = 5173
```

> Note: The Netlify context doc specified port 8080 and `vue-cli-service` commands. This spec uses Vite; the dev server defaults to port 5173. See OQ-02.

**SPA redirect (required for Vue Router history mode):**

```toml
[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

Without this rule, any direct navigation to a non-root path (e.g., `/about`) will return a Netlify 404 instead of serving the Vue app.

**Security headers:**

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options          = "DENY"
    X-Content-Type-Options   = "nosniff"
    Referrer-Policy          = "strict-origin-when-cross-origin"
    Content-Security-Policy  = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
```

> `'unsafe-inline'` for styles is the minimum viable CSP for Vite-generated CSS. The architect MUST evaluate whether nonce-based or hash-based style CSP is feasible for this stack.

### Environment Variable Conventions

- All app-level runtime config uses `VITE_` prefix (e.g., `VITE_API_BASE_URL`, `VITE_SITE_TITLE`).
- Variables are accessed via `import.meta.env.VITE_*` in source code.
- A `.env.example` file MUST be committed listing every variable with a non-secret example value and a comment explaining its purpose.
- Actual secret values are set in the Netlify UI under Site Settings > Environment Variables, never in source control.
- `VITE_*` variables are embedded at build time. Any variable that changes per-environment (staging vs. production) MUST be set in the Netlify UI per deploy context, not hard-coded.

### CI/CD via Netlify Git Integration

- Netlify auto-detects the repo on first connection; the `netlify.toml` overrides any auto-detected settings.
- Every push to `create-ts-vue-app` triggers a Netlify preview deploy with a unique URL.
- Merges to `main` trigger a production deploy.
- The Netlify build log MUST be the source of truth for build failures; no separate GitHub Actions workflow is required for deployment.

---

## Testing Strategy

### Unit Tests — Vitest

- Test runner: Vitest with `jsdom` environment.
- All files in `src/composables/` and `src/stores/` MUST have a corresponding test file in `src/<module>/__tests__/<Name>.test.ts`.
- Coverage gate: >= 80% lines and branches for `src/composables/**` and `src/stores/**`, enforced via `vitest --coverage` with the `@vitest/coverage-v8` provider.
- Network requests MUST be mocked using MSW (`msw`). Do not stub `fetch` directly.
- Tests MUST cover: happy path, at least one error/rejection path per async operation, and boundary validation (Zod parse failures).

### Component Tests — Vue Test Utils

- Route-level views (`src/views/`) MUST have component tests using `@vue/test-utils` `mount` (not `shallowMount` for integration coverage).
- Tests MUST assert: rendered HTML structure includes expected landmarks, router-link `to` attributes are correct, and key conditional renders (loading state, error state) behave correctly.
- The Pinia test helper `createTestingPinia` MUST be used to isolate store state between tests.

### Test Scripts

The following scripts MUST exist in `package.json`:

| Script | Command |
|---|---|
| `pnpm test` | `vitest run` |
| `pnpm test:watch` | `vitest` |
| `pnpm test:coverage` | `vitest run --coverage` |
| `pnpm typecheck` | `vue-tsc --noEmit` |
| `pnpm lint` | `eslint src --ext .ts,.vue` |
| `pnpm format:check` | `prettier --check src` |
| `pnpm build` | `vite build` |
| `pnpm dev` | `vite` |
| `pnpm preview` | `vite preview` |

---

## Open Questions

- [ ] **OQ-01 — App domain/purpose**: This spec creates a generic scaffold. What is the actual application this scaffold will be built into? (e.g., dashboard, marketing site, SaaS product) The answer determines the initial route set, naming, and whether a design system is needed. Required before feature specs can be written.
- [ ] **OQ-02 — Netlify env var prefix / build tool**: The provided Netlify context doc specifies `VUE_APP_` prefix (Vue CLI) and `vue-cli-service` commands. This spec mandates Vite, which uses `VITE_`. Confirm Vite is the correct choice. If the project must use Vue CLI, the build tool section of this spec must be revised entirely.
- [ ] **OQ-03 — Authentication**: Will the app require user login? If yes, a separate spec for auth (JWT, OAuth, Netlify Identity, Auth0, etc.) must be written before any protected routes are implemented.
- [ ] **OQ-04 — API integration**: Will the app call external or internal APIs? If yes, the `VITE_API_BASE_URL` convention needs to be confirmed and a service-layer spec should document error contracts, retry logic, and auth token passing.
- [ ] **OQ-05 — Netlify site name and production URL**: What is the Netlify site name and production URL? This determines the `VITE_API_BASE_URL` default value in `.env.example` and is needed before a first deploy can be validated.
- [ ] **OQ-06 — CSS strategy**: Should the scaffold use plain CSS custom properties only, or integrate a utility-first framework (UnoCSS, Tailwind CSS v4)? Recommend plain CSS custom properties for the scaffold to remain dependency-light, but requires human confirmation.
- [ ] **OQ-07 — Node.js version pinning**: What Node.js version should be pinned in `.nvmrc` / `.node-version` and in the Netlify `NODE_VERSION` environment variable? Recommend Node.js 20 LTS.

### ANSWERS:
OQ-01 - Web app is basic static web page with ability to customer to send email. (https://www.awsome.co.nz/). Business: `AWSome Painting & Decorating Limited`. It is a basic Web page with porfolio information about the business and email me function
OQ-02 - We can use swap to stack, `React`, `Tanstack`, Nuxt/Next, Astro. No need to get hanged on one single framework. What we need is to deploy to netlify. I've created an app on netlify website and pull it's changes. Have a look at it
- I moved ahead and installed their exxample: `npx gitpick TanStack/router/tree/main/examples/react/start-tailwind-v4 start-tailwind-v4`
- We need to somehow initialize Netlify locally and push to server (netlify.toml file)
 - https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/#continuous-deployment
OQ-03 — No Authentication, Authorization needed
OQ-04 — No Api Integration
OQ-05 - I will update Netlify Production configuration myself when we are ready
OQ-06 - You can base on the current CSS styles. Later we will improve it
OQ-07 - I'm running Node.js v24.3.0
---

## Acceptance Criteria

### AC-01 — Cold clone builds without errors

Given the `create-ts-vue-app` branch with no local `.env` file,
when a developer runs `pnpm install && pnpm build`,
then the command MUST exit 0, the `dist/` directory MUST be created, and `dist/index.html` MUST exist.

### AC-02 — Dev server starts and serves the home route

Given a completed `pnpm install`,
when a developer runs `pnpm dev` and opens `http://localhost:5173/`,
then the browser MUST render the `HomeView` component inside the app shell (header and footer visible) with no console errors.

### AC-03 — Client-side routing works for all defined routes

Given the dev server is running,
when the user navigates to `/about` via `<RouterLink>` click,
then the URL in the browser address bar MUST update to `/about` without a full page reload, and the `AboutView` component MUST be rendered in `<RouterView>`.

### AC-04 — SPA redirect handles direct URL access on Netlify

Given the app is deployed to Netlify with the `netlify.toml` from this spec,
when a user enters `https://<netlify-url>/about` directly in the browser (bypassing client-side navigation),
then Netlify MUST serve `index.html` with HTTP status 200, and Vue Router MUST render `AboutView` on the client.

### AC-05 — 404 catch-all route renders correctly

Given the app is running (dev or production),
when a user navigates to any path not defined in the router (e.g., `/does-not-exist`),
then `NotFoundView` MUST be rendered and the page title or visible heading MUST contain the text "not found" (case-insensitive).

### AC-06 — TypeScript strict mode passes with zero errors

Given a clean checkout,
when `pnpm typecheck` is run,
then `vue-tsc --noEmit` MUST exit 0 with zero type errors or warnings.

### AC-07 — Lint and format checks pass

Given a clean checkout,
when `pnpm lint && pnpm format:check` is run,
then both commands MUST exit 0 with zero ESLint errors and zero Prettier formatting diffs.

### AC-08 — Unit tests pass and meet coverage gate

Given a clean checkout,
when `pnpm test:coverage` is run,
then Vitest MUST exit 0, all tests MUST pass, and coverage for `src/composables/**` and `src/stores/**` MUST be >= 80% lines and >= 80% branches.

### AC-09 — Pinia store is accessible and reactive

Given the app is running in the browser,
when the `useAppStore` action to update `appTitle` is called,
then any component consuming `appStore.appTitle` MUST reactively reflect the new value without a page reload.

### AC-10 — Security headers are present on Netlify production

Given the app is deployed to Netlify,
when an HTTP request is made to `https://<netlify-url>/`,
then the response MUST include headers `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a `Content-Security-Policy` header whose value contains `default-src 'self'`.

### AC-11 — Environment variable fallback renders correctly

Given no `VITE_SITE_TITLE` variable is set in the environment,
when the app is built and served,
then the `AppHeader` component MUST display the fallback title `"My App"` without throwing a runtime error.

### AC-12 — CLAUDE.md placeholder sections are replaced

Given a review of the `CLAUDE.md` file on the `create-ts-vue-app` branch,
when any human or agent reads the Stack, File Layout, Conventions, or Testing Rules sections,
then none of those sections MUST contain the text `ACTION REQUIRED` or angle-bracket placeholder values such as `<e.g., ...>`.

---

## Definition of Done

- [ ] All twelve acceptance criteria (AC-01 through AC-12) pass in CI (Netlify build + local `pnpm test:coverage`).
- [ ] `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all exit 0 on a clean clone.
- [ ] `netlify.toml` is committed and a successful Netlify preview deploy has been confirmed for the branch.
- [ ] `.env.example` is committed with every `VITE_*` variable documented.
- [ ] `CLAUDE.md` has no remaining placeholder text (AC-12).
- [ ] All open questions OQ-01 through OQ-07 are either resolved or explicitly deferred with a linked follow-on spec.
- [ ] Reviewer agent has approved the implementation diff.
- [ ] Commit history uses Conventional Commits and references `SPEC-2026-01` in the body.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Netlify env var prefix mismatch (OQ-02) | HIGH | HIGH | Resolve OQ-02 before any coder work begins |
| CSP `'unsafe-inline'` for styles | MEDIUM | MEDIUM | Architect evaluates hash-based CSP; documents in ADR |
| Coverage gate unachievable at scaffold stage | LOW | LOW | Enforce gate in CI from day one |
| Node.js version drift between local and Netlify | LOW | MEDIUM | Pin version in `.nvmrc` + Netlify `NODE_VERSION` env var (OQ-07) |
