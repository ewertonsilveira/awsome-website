# Spec: AWSome Painting & Decorating — Marketing Site (React + TanStack Start on Netlify)

**ID**: SPEC-2026-01
**Status**: Draft
**Owner**: Requirements Analyst
**Created**: 2026-05-31
**Branch**: `create-ts-vue-app` *(stack is now React/TanStack — see TODO: rename branch)*
**Supersedes**: the original Vue-based draft of SPEC-2026-01 (stack pivoted per resolved OQ-02)

---

## Overview

A public marketing / portfolio website for **AWSome Painting & Decorating Limited** (reference: https://www.awsome.co.nz/), a Wellington-region painting and decorating business operating since 1993. The site presents the company's services and project portfolio and lets prospective customers request a free quote via a contact form ("email me" function). It is a brochure site: no authentication, no database, no external API integration. It is built with React 19 + TanStack Start, rendered as a **fully static prerendered** site and deployed to **Netlify** via Git continuous deployment. The contact form uses **Netlify Forms**, so there is no server-side code or secrets to manage.

The working code already exists in [web-app/](../web-app/), bootstrapped from the TanStack `start-tailwind-v4` example. This spec defines what that scaffold must become.

---

## Problem

The business currently has a dated brochure site. The goal is a modern, fast, accessible, responsive rebuild that mirrors the existing information architecture but with an improved visual design and a working quote-request form — deployable to Netlify with zero backend maintenance.

The repo scaffold (`web-app/`) is a bare TanStack Start "Welcome Home" example with a single route, no real content, no contact form, an SSR runtime we don't need, and a `netlify.toml` containing machine-generated absolute paths. It must be turned into a coherent multi-page static site.

---

## Resolved Decisions

These were open questions in the prior draft, now answered by the product owner:

| Ref | Decision |
|---|---|
| Stack (OQ-02) | **React 19 + TanStack Start + TanStack Router + Tailwind v4** (Vue dropped). Framework choice is pragmatic; the binding requirement is "deploys to Netlify". |
| Rendering | **Static prerender** — no SSR server runtime. Output is static HTML in `dist/client`. |
| Contact (OQ-01) | **Netlify Forms** — built-in handling, spam filtering, email notifications. No backend code, no secrets. |
| Auth (OQ-03) | **None.** |
| API integration (OQ-04) | **None.** |
| Tooling | **Lean** — Prettier + TypeScript strict only. No Vitest/unit-test gate and no husky pre-commit hooks in v1. |
| Page scope | **Full mirror** of awsome.co.nz (Home, About, Services, Projects/Gallery, Contact) with a **modernized design** (better layout, CSS, typography). |
| Netlify config (OQ-05) | Product owner manages production Netlify settings (env vars, form notifications, domain) directly. |
| Node version (OQ-07) | Node **v24.3.0** (developer's local version). |
| Package manager | **npm** — single standardized tool (replaces the mixed npm/pnpm references in the scaffold; most universal, zero Netlify setup friction). |
| TypeScript version | Pinned to **5.x** (latest stable 5), down from the scaffold's `^6`, to avoid bleeding-edge compiler risk. |

---

## Goals

- A runnable React + TanStack Start site that `npm run build`s to a fully static `dist/client` and passes `tsc --noEmit`.
- All five pages from the reference site present, with modernized, responsive, accessible design.
- A working "Get a Free Quote" contact form via Netlify Forms that the owner receives by email.
- A `netlify.toml` with corrected, relative build settings + security headers that produces a successful Netlify deploy on push.
- `CLAUDE.md` placeholder sections replaced with the real React/TanStack/Tailwind stack details.

---

## Non-Goals

- No SSR / server runtime, Netlify Functions, or edge functions (static prerender only).
- No authentication, user accounts, or admin/CMS. Content is hard-coded in the repo.
- No database or external API calls.
- No unit/integration/E2E test suite or coverage gate in v1 (lean tooling decision).
- No husky / lint-staged pre-commit hooks in v1.
- No payment, booking, or scheduling features.
- No internationalization.
- No analytics/marketing pixels in v1 (can be added later; would affect CSP).
- Sourcing real project photography is out of scope; the Gallery ships with placeholders the owner can swap.

---

## Functional Requirements

### FR-01 — Site shell & navigation

A persistent shell MUST wrap all pages via the TanStack Router root route (`src/routes/__root.tsx`):

- A responsive header with the business name/logo ("AWSome Painting & Decorating") and primary navigation linking to all pages (FR-02). Navigation MUST collapse to an accessible mobile menu on small viewports.
- A footer containing the business contact details: email `john@awsome.co.nz`, phone `0210616499`, address `5 Patutu Grove, Trentham, 5018, Upper Hutt`, and a Facebook link.
- A `<Outlet />` content region between header and footer.
- The active navigation link MUST be visually indicated (TanStack Router `activeProps`).
- The TanStack Router devtools MUST be rendered in development only, never in the production build.

### FR-02 — Pages / routes

File-based routes under `src/routes/` MUST exist for:

| Page | Path | Content |
|---|---|---|
| Home | `/` | Hero with value proposition + "Get a Free Quote" CTA; highlighted services (Tiling, Interior/Exterior, Decorating) with links into Services; "Since 1993" company vision section. |
| About Us | `/about` | Company story and background (operating since 1993), why-choose-us points. |
| Services | `/services` | All services: Painting, Decorating, Tiling, Plastering, Wallpapering, Spray, Waterblasting. Each with a short description; deep-linkable by anchor where practical. |
| Projects / Gallery | `/projects` | Responsive image grid of portfolio work using placeholder images with descriptive `alt` text the owner can replace. |
| Contact Us | `/contact` | Contact details (FR-01) plus the quote-request form (FR-03). |

A catch-all **404** route MUST render a friendly "Page not found" page with a link back home. Every route MUST be included in the static prerender (FR-05).

### FR-03 — Quote-request contact form (Netlify Forms)

The Contact page MUST contain a form wired for Netlify Forms:

- The form MUST be statically present in the prerendered HTML (so Netlify's build-time form detection succeeds): `name="contact"`, `method="POST"`, `data-netlify="true"`, and a hidden `form-name` input with value `contact`.
- Fields (all with associated `<label>`s): **Name** (required), **Email** (required, valid email), **Phone** (optional), **Message / project details** (required). A **subject/service** select listing the services (optional) is encouraged.
- A honeypot field MUST be enabled for spam protection (`netlify-honeypot="bot-field"` + a hidden `bot-field` input).
- On submit, the browser MUST POST URL-encoded data to Netlify (same-origin); on success the user MUST see a confirmation message (either a thank-you route/state or an inline success message).
- Client-side validation MUST give accessible inline error messages before submission; the form MUST still degrade to a native POST if JS fails.
- The form MUST NOT contain any API keys or secrets. Email notification routing is configured by the owner in the Netlify UI.

### FR-04 — Modernized visual design

The design MUST be a clear visual improvement over the reference site while preserving its information architecture:

- A cohesive theme using Tailwind v4 (the existing `src/styles/app.css` light/dark theme is the starting point).
- Consistent typographic scale, spacing, and a defined brand color palette (trade/professional feel).
- Reusable presentational components (e.g., `ServiceCard`, `Hero`, `SectionHeading`, `Button`) under `src/components/`.
- Imagery uses modern responsive techniques (correctly sized images, `loading="lazy"` for below-the-fold/gallery images).

### FR-05 — Static prerender & build output

- TanStack Start MUST be configured to **prerender all routes** to static HTML (no server runtime in the deployed output).
- The production build MUST emit static assets to `dist/client` and MUST type-check (`tsc --noEmit`) as part of the build.
- No Netlify Functions or server entry point are required for the deployed site.

### FR-06 — `netlify.toml` correction

The committed `netlify.toml` MUST be corrected to:

- `[build] publish = "dist/client"` (relative — remove the absolute `/opt/build/repo/...` path and the machine-generated `publishOrigin`/`commandOrigin` keys).
- `[build] command` MUST match `package.json` (build that runs the Vite build and `tsc --noEmit`).
- Keep a sensible `[dev]` block consistent with the Vite dev port (3000).
- Add the security headers in NFR-05.

### FR-07 — `CLAUDE.md` population

The repo-root `CLAUDE.md` placeholder sections (Stack, File Layout, Conventions, Testing Rules) MUST be replaced with the real React 19 / TanStack Start / Tailwind v4 details and the `web-app/` layout, so downstream agents have accurate context. No `ACTION REQUIRED` or `<e.g., ...>` placeholders may remain.

---

## Non-Functional Requirements

### NFR-01 — Performance

- The deployed site is fully static; the Home route Lighthouse Performance score SHOULD be >= 90 on a production Netlify URL.
- Gallery and below-the-fold images MUST be lazy-loaded and appropriately sized.

### NFR-02 — Accessibility (WCAG 2.1 AA)

- All interactive elements (nav, menu toggle, form fields, buttons, links) MUST have accessible names and visible focus indicators.
- Color contrast MUST meet AA (4.5:1 normal text, 3:1 large text) in both light and dark themes.
- The site MUST be fully keyboard navigable; the mobile menu MUST be operable and dismissible by keyboard.
- All images MUST have meaningful `alt` text (empty `alt` only for purely decorative images).
- Form errors MUST be programmatically associated with their fields (`aria-describedby` / `aria-invalid`).

### NFR-03 — Responsive design

- Usable from 320px to 1440px+ with no horizontal scroll. Mobile-first, with at least `sm` and `lg` breakpoints (Tailwind defaults are acceptable).

### NFR-04 — TypeScript & formatting

- `tsconfig.json` `strict: true` (already set). `tsc --noEmit` MUST exit 0 with zero errors and no `@ts-ignore` in committed code.
- Prettier MUST be configured; `npm run format:check` MUST pass with no diffs.

### NFR-05 — Security headers & secrets

- `netlify.toml` MUST set, for `/*`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Content-Security-Policy` whose value contains `default-src 'self'`. The CSP MUST permit Netlify Forms submission (same-origin POST) and the Tailwind-generated stylesheet, and MUST be documented so future additions (fonts, analytics, reCAPTCHA) have a clear extension point.
- No secrets, tokens, or credentials in source control; `.env*` remains git-ignored.

### NFR-06 — Browser support

- Latest two stable versions of Chrome, Edge, Firefox, and Safari (desktop + mobile).

---

## Tech Stack

```
Language:        TypeScript 5.x (latest stable 5; strict)
UI framework:    React 19
Meta-framework:  TanStack Start — STATIC PRERENDER mode (no SSR runtime deployed)
Router:          TanStack Router (file-based routes, generated routeTree)
Styling:         Tailwind CSS v4 (@tailwindcss/vite)
Build tool:      Vite 8 (dev server port 3000)
Build output:    Static assets → dist/client
Validation:      Zod (already a dependency; for client-side form validation)
Contact form:    Netlify Forms (no backend, no secrets)
Lint/format:     Prettier + TypeScript strict (tsc --noEmit). No ESLint/Vitest/husky in v1.
Package manager: npm (single, standardized — replaces the mixed npm/pnpm references in the scaffold)
Runtime:         Node.js v24.3.0
Hosting/CD:      Netlify (Git continuous deployment)
```

---

## Architecture Notes

> Constraints for the architect/coder agents. The architect MUST confirm the exact TanStack Start prerender API for the installed version (`@tanstack/react-start ^1.168`) and document it in the design.

**Source layout** (under `web-app/src/`):

```
src/
├── routes/         # File-based routes: __root.tsx, index.tsx, about.tsx, services.tsx, projects.tsx, contact.tsx, $catchall/404
├── components/     # Presentational, reusable UI (Hero, ServiceCard, Button, SectionHeading, Header, Footer, ContactForm)
├── data/           # Hard-coded content (services list, project entries, business info constants)
├── styles/         # app.css (Tailwind v4 entry + theme)
├── router.tsx      # createRouter()
└── routeTree.gen.ts# generated — do not hand-edit
```

- **Import alias**: `~/*` → `src/*` (already configured in tsconfig + Vite `tsconfigPaths`). Use it; avoid deep relative imports.
- **Component contract**: components in `src/components/` are presentational (props in, events out); page-level routes own layout/content composition. Business content lives in `src/data/` as typed constants, not hard-coded deep in components (so the owner can edit copy in one place).
- **Prerender concern**: the Netlify Forms `<form>` MUST appear in prerendered HTML; verify the form is not rendered only client-side. The architect MUST address how prerender + form detection interact (e.g., a statically rendered form element).
- **Architect flags**: (a) confirm exact prerender configuration API and whether a Netlify deploy target/preset must be set vs. plain static publish of `dist/client`; (b) confirm CSP value that satisfies Netlify Forms + Tailwind without `'unsafe-inline'` where avoidable.

---

## Netlify Deployment

- **Build**: Vite build + `tsc --noEmit`; publish `dist/client`. Static output — no functions.
- **Forms**: Netlify auto-detects the statically rendered `contact` form at deploy time. The owner enables form-submission email notifications in the Netlify UI (Site settings → Forms). Spam protection via honeypot (+ optional reCAPTCHA later, which would need a CSP update).
- **Headers/redirects**: defined in `netlify.toml` (NFR-05). A catch-all 404 is served by the prerendered 404 page; avoid a blanket `/* → /index.html 200` rewrite that would mask real prerendered routes and the 404.
- **CD**: pushes to the working branch produce Netlify deploy previews; merges to the production branch deploy to production. Production env/domain/form settings are managed by the owner (resolved OQ-05).

---

## Testing & Verification Strategy (Lean)

No automated unit-test suite or coverage gate in v1. Quality is enforced by:

1. `npm run build` (Vite build + `tsc --noEmit`) MUST exit 0 — the type-check is the primary automated gate.
2. `npm run format:check` (Prettier) MUST pass.
3. **Manual verification** of acceptance criteria below, including a real Netlify deploy preview and a test form submission that the owner receives.
4. **Reviewer agent** still performs an adversarial diff review per the repo's agentic playbook (peer review is not skipped even though automated tests are).

> Adding Vitest + Testing Library later is explicitly deferred, not forbidden — a follow-on spec may introduce it once content stabilizes.

---

## Acceptance Criteria

### AC-01 — Static build succeeds
Given a clean `npm install` in `web-app/`, when `npm run build` runs, then it MUST exit 0, `tsc --noEmit` MUST report zero errors, and static HTML for every route MUST be emitted under `dist/client` (including `dist/client/index.html`).

### AC-02 — Dev server serves the site
Given `npm install`, when `npm run dev` runs and `http://localhost:3000/` is opened, then the Home page MUST render inside the shell (header + footer visible) with no console errors.

### AC-03 — All pages reachable via client routing
Given the running site, when the user clicks the header nav links, then each of `/`, `/about`, `/services`, `/projects`, `/contact` MUST render its page in the outlet without a full reload, and the active link MUST be indicated.

### AC-04 — Direct-URL access works (prerendered)
Given the deployed Netlify site, when a user opens `https://<site>/services` (or any route) directly, then Netlify MUST return that route's prerendered HTML with status 200 and the correct page MUST render.

### AC-05 — 404 page
Given the running site, when the user visits an undefined path (e.g., `/nope`), then a friendly "Page not found" page MUST render with a working link back to Home.

### AC-06 — Netlify Form is detected and submittable
Given a Netlify deploy preview, when the deploy completes, then the `contact` form MUST appear under Netlify's detected Forms; and when a user submits valid Name/Email/Message, then the submission MUST be captured by Netlify and the user MUST see a confirmation message. (Owner confirms the notification email arrives.)

### AC-07 — Form validation & spam protection
Given the Contact page, when the user submits with a missing required field or invalid email, then accessible inline errors MUST appear and submission MUST be blocked; and a honeypot field MUST be present in the markup.

### AC-08 — TypeScript strict passes
Given a clean checkout, `tsc --noEmit` MUST exit 0 with no errors and no `@ts-ignore` in committed source.

### AC-09 — Prettier formatting passes
Given a clean checkout, `npm run format:check` MUST exit 0 with no diffs.

### AC-10 — Responsive & mobile nav
Given a 320px-wide viewport, the site MUST have no horizontal scroll and the navigation MUST collapse into a keyboard-operable, dismissible mobile menu.

### AC-11 — Accessibility baseline
Given the Home and Contact pages, an automated a11y check (e.g., Lighthouse/axe) SHOULD score >= 90; all images MUST have appropriate `alt`, all form fields MUST have labels, and focus indicators MUST be visible in both light and dark themes.

### AC-12 — Corrected `netlify.toml`
The committed `netlify.toml` MUST use `publish = "dist/client"` (no absolute path), a build command matching `package.json`, and the NFR-05 security headers; and it MUST NOT contain machine-generated `publishOrigin`/`commandOrigin` keys.

### AC-13 — Security headers present
Given the deployed site, an HTTP request to `/` MUST return `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Content-Security-Policy` containing `default-src 'self'`.

### AC-14 — Devtools excluded from production
The production `dist/client` output MUST NOT include the TanStack Router devtools UI.

### AC-15 — `CLAUDE.md` updated
`CLAUDE.md` Stack / File Layout / Conventions / Testing Rules sections MUST reflect the React/TanStack/Tailwind stack and contain no `ACTION REQUIRED` or `<e.g., ...>` placeholders.

---

## Definition of Done

- [ ] AC-01 … AC-15 verified (build/type/format gates automated; deploy + form + a11y verified manually on a Netlify preview).
- [ ] All five pages + 404 implemented with modernized, responsive, accessible design.
- [ ] Netlify deploy preview is green and a test form submission is received by the owner.
- [ ] `netlify.toml` corrected; `CLAUDE.md` updated; no secrets committed.
- [ ] Reviewer agent has approved the diff.
- [ ] Commits use Conventional Commits and reference `SPEC-2026-01`.

---

## Open Questions / Follow-ups

- [ ] **FU-01 — Branch name**: branch is `create-ts-vue-app` but the stack is React/TanStack. Rename to e.g. `create-ts-react-app` / `awsome-painting-site`? (Cosmetic; coordinate so the Netlify-linked branch keeps deploying.)
- [ ] **FU-02 — Bleeding-edge versions**: the scaffold pins `vite ^8` and `@tanstack/react-start ^1.168` (very new). TypeScript is now pinned to **5.x** (resolved). Architect MUST verify the prerender/static API for the installed Vite/TanStack versions before implementation, and confirm TS 5.x compiles the scaffold cleanly; pin all versions once verified.
- [ ] **FU-03 — Real content & images**: hero copy, about-us story, and project photos are placeholders. Owner to supply final copy/images (can land after first deploy).
- [ ] **FU-04 — reCAPTCHA**: honeypot only for v1. If spam becomes a problem, add Netlify reCAPTCHA (requires a CSP update). Deferred.
- [ ] **FU-05 — Custom domain / analytics**: owner-managed in Netlify; analytics would require a CSP revision when added.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Netlify can't detect a client-only form | MEDIUM | HIGH | Ensure the form is in prerendered HTML; verify on a deploy preview (AC-06) before relying on it |
| Bleeding-edge TanStack/Vite/TS API drift | MEDIUM | MEDIUM | Architect verifies exact prerender config for installed versions; pin once working (FU-02) |
| TanStack Start defaults to SSR, not static | MEDIUM | MEDIUM | Explicitly configure full-route prerender; confirm no server entry in `dist/client` (AC-01/AC-04) |
| CSP breaks Tailwind styles or form POST | LOW | MEDIUM | Architect defines a CSP validated against the deploy preview; document extension points |
| Committed absolute publish path breaks build | LOW | MEDIUM | Correct `netlify.toml` to relative `dist/client` (FR-06/AC-12) |
