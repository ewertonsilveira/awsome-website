# Spec: Migrate AWSome Painting & Decorating Marketing Site from Netlify to Cloudflare Pages

**ID**: SPEC-2026-02
**Status**: Approved
**Owner**: Ewerton Silveira
**Created**: 2026-06-01

---

## Problem

The AWSome Painting & Decorating marketing site (SPEC-2026-01) is hosted on Netlify Free tier, which is approaching bandwidth and form-submission limits. Netlify Forms, the current contact mechanism, is a proprietary integration that ties the stack to Netlify's platform. Migrating to Cloudflare Pages eliminates the Free-tier ceiling, provides global CDN performance gains, and moves the contact form to an owned, composable architecture (Cloudflare Worker + Resend). The current `netlify.toml` and repo-root `_headers`/`_redirects` files must be replaced with Cloudflare-compatible equivalents before the live domain (`awsome.co.nz`) can cut over.

---

## Goals

- Deploy the existing static build (`dist/client`) to Cloudflare Pages with zero functional regression versus the current Netlify deployment.
- Replace Netlify Forms with a Cloudflare Pages Function (`/api/contact`, same-origin) that relays contact submissions via the Resend SDK to `john@awsome.co.nz`.
- All five routes (`/`, `/about`, `/services`, `/projects`, `/contact`) render correctly and return HTTP 200 on Cloudflare Pages.
- The contact form submits successfully end-to-end (React form → `/api/contact` Pages Function → Resend → `john@awsome.co.nz`) on the Cloudflare deployment.
- Security headers — the full set currently in `netlify.toml` (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, **`Content-Security-Policy`**) **plus** the new `Permissions-Policy` and `Strict-Transport-Security` — are served on every response via `public/_headers`. The CSP must be ported verbatim; losing it is a regression.
- The custom domain (`awsome.co.nz`) resolves to Cloudflare Pages with valid TLS and HTTPS redirect enforced.
- A GitHub Actions workflow automates typecheck → build → Cloudflare Pages deploy on every push to `main`.

---

## Non-Goals

- No changes to the React component tree, routing logic, Tailwind theme, or business content data.
- No introduction of SSR, edge rendering, or Cloudflare Workers for any purpose other than the contact form relay.
- No removal of `netlify.toml` until the Cloudflare migration is fully verified (it is retired, not deleted, in this spec).
- No migration of DNS records for any domain other than `awsome.co.nz`.
- No automated test suite (deferred per SPEC-2026-01 testing rules; v1 remains build-gate + manual verification).
- Formspree (Option A) is explicitly out of scope; the chosen architecture is Worker + Resend (Option B).
- No changes to GoDaddy registrar settings beyond NS delegation to Cloudflare.

---

## User Stories

### US-1 — Static Site on Cloudflare Pages
As a site visitor, I want all five pages of the marketing site to load correctly from Cloudflare's CDN, so that I experience fast, reliable page loads without Netlify bandwidth restrictions.

**Acceptance**:
- [ ] Given a GET to `https://awsome-nz.pages.dev/`, when the request is served by Cloudflare Pages, then the response is HTTP 200 and the HTML body contains the text "AWSome Painting" (or equivalent home-page headline from `src/data/`).
- [ ] Given GET requests to `/about`, `/services`, `/projects`, `/contact`, when served by Cloudflare Pages, then each returns HTTP 200 with its expected route-specific heading text present in the HTML.
- [ ] Given a GET to a non-existent path (e.g., `/does-not-exist`), when served by Cloudflare Pages, then the response is HTTP 200 and the HTML body renders the 404 catch-all route content (TanStack Router `$.tsx`).
- [ ] Given any response, when the browser receives it, then the `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` headers are all present with exactly those values.
- [ ] Given any response, when the browser receives it, then the `Content-Security-Policy` header is present and byte-for-byte equal to the value currently in `netlify.toml` (no dropped or weakened directives).

### US-2 — Contact Form via Pages Function + Resend
As a prospective customer, I want to submit the contact form and receive confirmation that my message was sent, so that I can reach the business without needing to open my email client.

**Acceptance**:
- [ ] Given a POST to `/api/contact` (same-origin Pages Function) with a valid JSON body (`name`, `email`, `message` all present and non-empty), when the function processes the request, then it calls Resend's send API with `from: john@awsome.co.nz` / `to: john@awsome.co.nz` and returns HTTP 200 with body `{ "ok": true }`.
- [ ] Given a valid form submission from the React contact page on the Cloudflare deployment, when `/api/contact` responds with `{ "ok": true }`, then the UI displays a success confirmation message without a full-page reload.
- [ ] Given a POST to `/api/contact` with a missing required field (e.g., `email` absent), when Zod validation runs client-side, then the form does not submit and the relevant field displays an accessible error (`aria-invalid="true"` and a visible error message linked via `aria-describedby`).
- [ ] Given a POST to `/api/contact` with a missing required field that bypasses client validation, when the function receives the request, then it returns HTTP 422 with a body describing the missing field.
- [ ] Given a 4th POST to `/api/contact` from the same IP within 60 seconds, when the rate limit (3/IP/min, RD-3) is exceeded, then the function returns HTTP 429 without calling Resend.
- [ ] Given `john@awsome.co.nz`, when a valid form is submitted, then an email is received within 60 seconds containing the submitter's name, email, and message body.

### US-3 — GitHub Actions CI/CD
As a developer, I want every push to `main` to automatically typecheck, build, and deploy to Cloudflare Pages, so that the live site is always in sync with the repository without manual deploy steps.

**Acceptance**:
- [ ] Given a push to `main`, when the GitHub Actions workflow runs, then the steps execute in order: checkout → setup-node 24 → `npm ci` → `npm run typecheck` → `npm run build` → `wrangler pages deploy dist/client`.
- [ ] Given a TypeScript error in the codebase, when the workflow runs, then the `typecheck` step exits non-zero and the deploy step does not execute.
- [ ] Given a successful workflow run, when the Cloudflare Pages dashboard is checked, then a new deployment appears with a build timestamp matching the workflow run.
- [ ] Given the workflow file at `.github/workflows/deploy.yml`, when it references the Cloudflare API token, then the token is read from a GitHub Actions secret (`CLOUDFLARE_API_TOKEN`) and never hard-coded in the file.

### US-4 — Custom Domain + TLS
As the business owner, I want `awsome.co.nz` to serve the Cloudflare Pages site over HTTPS, so that the live domain matches the Cloudflare deployment with no browser security warnings.

**Acceptance**:
- [ ] Given a GET to `http://awsome.co.nz/`, when Cloudflare processes it, then the response is an HTTP 301 or 308 redirect to `https://awsome.co.nz/`.
- [ ] Given a GET to `https://awsome.co.nz/`, when the TLS handshake completes, then the certificate is valid, issued to `awsome.co.nz`, and the browser shows no mixed-content or certificate warnings.
- [ ] Given a `curl -I https://awsome.co.nz/` from an external machine, when the response is inspected, then `Strict-Transport-Security` is present with `max-age=31536000; includeSubDomains; preload`.

### US-5 — Netlify Retirement (Non-Destructive)
As a developer, I want `netlify.toml` retained but inert after the migration is verified, so that rollback to Netlify remains possible until the team formally decommissions it.

**Acceptance**:
- [ ] Given the repository after migration, when `netlify.toml` is listed, then the file is present and unmodified (not deleted, not emptied).
- [ ] Given `public/_headers` and `public/_redirects` in the repo, when the Vite build runs (`npm run build`), then both files appear verbatim inside `dist/client/` in the build output.
- [ ] Given the Netlify dashboard, when the project is checked after cutover, when deploys are paused (not deleted), then the last Netlify deploy URL (`https://awsome-nz.netlify.app`) still resolves for rollback reference.

---

## Constraints

- **Performance**: Cloudflare Pages CDN edge must serve the static assets; no origin round-trip for HTML/CSS/JS. Brotli compression must be enabled in Cloudflare dashboard settings.
- **Security**: The Resend API key (`RESEND_API_KEY`) must be stored as a Cloudflare Pages project secret (encrypted env var) and as a GitHub Actions secret. It must never appear in any committed file or workflow YAML value.
- **Security**: The `/api/contact` Pages Function must validate the request `Content-Type` is `application/json`, enforce a maximum request body size, and enforce the 3/IP/min rate limit (RD-3) to prevent abuse.
- **Security**: `public/_headers` must include the full header set under the `/*` glob — the four headers ported from `netlify.toml` (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`) **plus** the two new ones (`Permissions-Policy`, `Strict-Transport-Security`). The CSP value must be ported verbatim; do not drop or weaken any directive.
- **Compliance**: Contact form data (name, email, message) is transmitted to Resend and not persisted by the Pages Function beyond the transient KV rate-limit counter (which stores only an IP-keyed request count, no message content). No message PII is persisted on the platform.
- **Compatibility**: The migration must not change any behaviour observable to end-users on Safari 15+, Chrome, Firefox, or mobile browsers.
- **Build gate**: `cd web-app && npm run build` and `npm run format:check` must both exit 0 after every task. The `npm run typecheck` script (new in this spec) must also exit 0.
- **Protected path — human action required**: `.github/workflows/**` is listed as a protected path in `CLAUDE.md`. The GitHub Actions workflow file (`.github/workflows/deploy.yml`) CANNOT be created by an agent without an explicit human override (`ALLOW_PROTECTED=1` or equivalent). A human must either create the file manually or grant the agent an override during Task T1 (the workflow file is part of the combined migration task).
- **Package manifest**: `wrangler` (devDependency) must be proposed in the plan and approved before `npm install` is run. No silent dependency additions.
- **Node version**: Cloudflare Pages dashboard must be configured with Node 24 to match the local runtime.
- **wrangler.toml**: Placed at repo root with `compatibility_date = "2026-06-01"`. For a Pages project this stays minimal; the KV namespace binding for the rate limiter (RD-3) is declared here / in the Pages dashboard.
- **No SSR APIs**: `/api/contact` is a Cloudflare Pages Function (Workers runtime), not a TanStack Start server function. No `useServerFn`, no server-only imports in `web-app/src/`; the React form reaches it via a plain same-origin `fetch("/api/contact")`.

---

## Resolved Decisions

All open questions have been answered by the owner (2026-06-01):

- **RD-1 — Resend sender address**: The Pages Function calls Resend with `from: "john@awsome.co.nz"`. Requires `awsome.co.nz` to be a Resend-verified domain (SPF/DKIM records added in Cloudflare DNS).
- **RD-2 — Resend recipient address**: Contact submissions are delivered to `to: "john@awsome.co.nz"`. Single recipient — no CC/BCC logic needed. (`RESEND_TO` may be hard-coded or set as a Pages env var.)
- **RD-3 — Rate limiting**: Enforce **3 requests per IP per minute** on `/api/contact`. Over the limit returns HTTP 429. Implemented via Workers KV counter keyed on `CF-Connecting-IP` (or a Cloudflare Rate Limiting rule on the route).
- **RD-4 — Cloudflare account / DNS**: Account exists; nameservers + DNS have already been moved from GoDaddy to Cloudflare and are awaiting propagation. T2 (DNS cutover) is therefore largely complete — remaining work is custom-domain attach + TLS/redirect/Brotli verification.
- **RD-5 — `_redirects`**: No `_redirects` file exists today. There is also no `_headers` file — security headers and the 404 fallback currently live inside `netlify.toml`. T1 must therefore **create `public/_headers` fresh, porting all header values from `netlify.toml` (including the full Content-Security-Policy)**, and decide whether the `/* → /404` fallback is still needed (Cloudflare Pages serves `404.html` automatically for SPA/static misses — likely no `_redirects` file required; skip unless smoke-test shows a gap).
- **RD-6 — Netlify decommission**: Out of scope. The owner will manually remove and decommission Netlify after verification. `netlify.toml` stays in the repo for rollback; no follow-on chore ticket needed from the agent.
- **RD-7 — Contact endpoint architecture (DECIDED: Cloudflare Pages Functions)**: The contact endpoint is a **Cloudflare Pages Function at `functions/api/contact.ts`, served same-origin at `/api/contact`** — NOT a standalone Worker on a `workers.*` subdomain.

  **Rationale**:
  - **No CORS** — same-origin POST eliminates the `Access-Control-Allow-Origin` allowlist and `OPTIONS` preflight handler entirely (removes the "Worker CORS misconfiguration" risk).
  - **No CSP change** — the existing `connect-src 'self'` / `form-action 'self'` directives already permit a same-origin `/api/contact`. A cross-origin Worker subdomain would force editing the CSP.
  - **One deploy, one project, one secrets store** — the function ships with every Pages deploy; `RESEND_API_KEY` is set once on the Pages project. No second `wrangler deploy`.
  - Pages Functions run on the Workers runtime, so the Resend SDK and the KV rate-limiter work identically to a standalone Worker.


## Task Breakdown (for `/plan`)

The following tasks are proposed for sequential implementation. Each corresponds to one agent task (one commit).

| ID | Title | Protected? |
|----|-------|------------|
| T1 | Full code + config migration: **create `public/_headers` fresh, porting all values from `netlify.toml` including the full CSP, plus adding `Permissions-Policy` + `Strict-Transport-Security`** (`_redirects` skipped per RD-5 unless smoke-test shows a gap); add `wrangler.toml` (incl. KV binding for rate limiter); add `wrangler` devDependency + `typecheck`/`deploy:cf` scripts; scaffold Pages Function `functions/api/contact.ts` (Zod validation, Resend `from`/`to` = `john@awsome.co.nz`, 3/IP/min KV rate limit → 429, 422 on bad input, 200 `{ok:true}` on success — **no CORS needed, same-origin**); update `ContactForm` to `fetch("/api/contact")` with JSON + success/error UI; create `.github/workflows/deploy.yml` CI/CD pipeline; configure Cloudflare Pages dashboard (framework preset None, build command, output dir `dist/client`, Node 24, production branch `main`, `RESEND_API_KEY` secret) | **PROTECTED — `.github/workflows/deploy.yml` requires human override; package.json changes require human approval** |
| T2 | DNS / domain finalisation (NS + DNS already moved per RD-4, awaiting propagation): attach custom domain `awsome.co.nz` in Cloudflare Pages, verify Resend domain (SPF/DKIM), verify TLS, enable HTTPS redirect, enable Brotli | Manual (dashboard action) |
| T3 | Smoke-test all five routes and contact form on live Cloudflare domain; document rollback status of Netlify deployment | Manual verification |

---

## Definition of Done

- [ ] All acceptance criteria in US-1 through US-5 pass manual verification on the live Cloudflare Pages deployment.
- [ ] `cd web-app && npm run build` exits 0 with no TypeScript errors.
- [ ] `cd web-app && npm run format:check` exits 0 with no Prettier diffs.
- [ ] `cd web-app && npm run typecheck` exits 0.
- [ ] `public/_headers` and `public/_redirects` are present in `dist/client/` after build.
- [ ] No secrets (`RESEND_API_KEY`, `CLOUDFLARE_API_TOKEN`) appear in any committed file.
- [ ] `netlify.toml` is present and unmodified in the repository.
- [ ] The GitHub Actions workflow file (`.github/workflows/deploy.yml`) has been created with human approval or direct human authorship.
- [ ] All five routes return HTTP 200 on `https://awsome.co.nz/` with correct content.
- [ ] Contact form delivers an email to the configured recipient inbox within 60 seconds.
- [ ] No new high-severity lint or security findings introduced.
- [ ] `SPEC-2026-02` status updated to `Implemented` and a follow-on chore ticket raised for Netlify decommission (OQ-6).

---

## Risks

- **DNS propagation delay**: Likelihood: High / Impact: Medium — NS record changes at GoDaddy can take up to 48 hours to propagate globally, causing a window where the domain resolves inconsistently. Mitigation: execute DNS cutover during a low-traffic window; keep Netlify deploy live and un-paused until propagation is confirmed via `dig` from multiple regions.
- **Resend domain verification failure**: Likelihood: Medium / Impact: High — If `awsome.co.nz` DNS is not yet delegated to Cloudflare when Resend domain verification is attempted, SPF/DKIM records cannot be set, blocking email delivery. Mitigation: complete DNS delegation (T7) before configuring Resend sender domain; use Resend sandbox domain for T3/T4 development and testing.
- **CSP regression (NEW)**: Likelihood: Medium / Impact: High — The Content-Security-Policy currently lives only in `netlify.toml`. If `public/_headers` is created without porting the CSP, every page silently ships without it, weakening XSS protection. Mitigation: port the CSP value verbatim from `netlify.toml` into `public/_headers`; smoke-test asserts the `Content-Security-Policy` header is present on the live response (add to US-1 AC).
- **~~Worker CORS misconfiguration~~ (ELIMINATED by RD-7)**: Resolved by choosing same-origin Pages Functions (`/api/contact`) over a cross-origin Worker subdomain. No `Access-Control-Allow-Origin` allowlist or `OPTIONS` preflight is required.
- **Protected-path workflow block**: Likelihood: High / Impact: Medium — The `.github/workflows/deploy.yml` file cannot be agent-written without human override, which may block CI/CD automation until a human acts. Mitigation: human creates or approves the file during T1; manual `wrangler pages deploy` (the `deploy:cf` script) can serve as a temporary deploy mechanism until the workflow lands.
- **`wrangler` devDependency version drift**: Likelihood: Low / Impact: Medium — Pinning `wrangler` to a specific version ensures reproducible deploys; unpinned installs may pick up breaking CLI changes. Mitigation: pin to the latest stable `wrangler` version at time of T2 execution; record the version in the PR description.
- **Netlify Forms submissions lost during cutover**: Likelihood: Low / Impact: Low — Any form submission hitting the Netlify-hosted URL after the Worker is deployed but before Netlify Forms is fully deactivated will succeed via the old path. Mitigation: deactivate Netlify Forms in the dashboard only after DNS cutover is confirmed and the Worker is verified end-to-end.
