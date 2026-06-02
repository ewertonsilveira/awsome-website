# Spec: Replace Resend with Cloudflare Email Service for the Contact Form

**ID**: SPEC-2026-03
**Status**: Approved
**Owner**: Ewerton Silveira
**Created**: 2026-06-02

---

## Problem

The contact form on the live site (`https://awsome-website.pages.dev/contact`, custom domain `https://www.awsome.co.nz`) returns **HTTP 500** on submission. The Pages Function `web-app/functions/api/contact.ts` fails at the email-send step (the 34-byte `{"ok":false,"error":"send_failed"}` response confirms it), because the email path depends on **Resend** — a third-party provider that requires (a) a `RESEND_API_KEY` secret set on the Pages project and (b) `awsome.co.nz` verified as a Resend sender domain with SPF/DKIM records. Neither is reliably in place.

Rather than finish wiring up Resend, the owner has chosen (Option B) to **drop the third-party dependency entirely and send email natively through Cloudflare**. The domain already uses Cloudflare DNS, Email Routing is enabled on `awsome.co.nz`, and Cloudflare now offers a first-party transactional **Email Service**. Moving to it removes the `resend` npm package, removes one externally-managed API key, and consolidates email onto the same platform that already hosts and routes the site.

---

## Goals

- The contact form sends email successfully end-to-end (React form → `/api/contact` Pages Function → Cloudflare Email Service → `john@awsome.co.nz`) on the live Cloudflare deployment, returning HTTP 200 `{ "ok": true }`.
- The `resend` npm dependency is removed from `web-app/package.json` and no longer imported anywhere in `web-app/`.
- Email is sent via the **Cloudflare Email Service REST API** called with `fetch()` from inside the Pages Function — no new runtime dependency is added.
- All existing `/api/contact` behaviour is preserved with zero regression: Zod re-validation, 100 KB body cap, 3/IP/min KV rate limit → 429, 422 on bad input, 200 `{ok:true}` on success.
- On any email-send failure the function returns HTTP 500 `{ "ok": false, "error": "send_failed" }` **and** logs the underlying cause via `console.error` (preserving the diagnostics added during triage).
- `CLAUDE.md` is updated so the documented stack reflects Cloudflare Email Service instead of Resend.

---

## Non-Goals

- No change to the React component tree, the `ContactForm` UI/UX, routing, Tailwind theme, or business-content data. The client still POSTs the same JSON to the same same-origin `/api/contact`.
- No change to the rate-limit policy (3/IP/min), the KV namespace binding, or the security headers in `public/_headers`.
- No migration to the `send_email` Workers binding (see RD-1 — not available in Pages Functions) and no conversion of `/api/contact` from a Pages Function into a standalone Worker.
- No use of Cloudflare Email **Workers** (inbound email processing / Destination Workers) — that feature handles mail *received* at `awsome.co.nz`, not outbound form notifications, and is out of scope.
- No automated test suite (deferred per SPEC-2026-01 testing rules; quality stays build-gate + manual verification).
- No DNS record changes beyond whatever Email Service's sender-domain verification requires (handled in the dashboard, see RD-3).

---

## User Stories

### US-1 — Contact Form Sends via Cloudflare Email Service

As a prospective customer, I want to submit the contact form and have my message delivered to the business, so that I can reach them without opening my own email client.

**Acceptance**:
- [ ] Given a POST to `/api/contact` with a valid JSON body (`name`, `email`, `message` non-empty), when the function processes it, then it issues an HTTPS POST to the Cloudflare Email Service REST endpoint with `from`/`to` = `john@awsome.co.nz`, a subject of `<name> via awsome.co.nz`, and a plain-text body containing the submitter's name, email, optional phone/service, and message — and returns HTTP 200 `{ "ok": true }`.
- [ ] Given a valid submission from the React contact page on the live deployment, when the function returns `{ "ok": true }`, then the UI shows the existing success confirmation without a full-page reload.
- [ ] Given `john@awsome.co.nz`, when a valid form is submitted, then an email is received within 60 seconds containing the submitter's name, email, and message body.
- [ ] Given a successful send, when the function returns 200, then the KV rate-limit counter for that IP is incremented (so the increment-on-success behaviour from the current code is preserved).

### US-2 — Preserve Validation, Rate-Limit, and Error Behaviour

As the site owner, I want the contact endpoint to keep its existing guards after the provider swap, so that the migration introduces no security or abuse regression.

**Acceptance**:
- [ ] Given a POST to `/api/contact` with a missing or invalid required field that bypasses client validation, when the function runs Zod validation, then it returns HTTP 422 with a body describing the offending field(s) — unchanged from current behaviour.
- [ ] Given a request body larger than 100 KB, when the function reads it, then it returns HTTP 422 without attempting to send email — unchanged from current behaviour.
- [ ] Given a 4th POST from the same IP within 60 seconds, when the rate limit (3/IP/min) is exceeded, then the function returns HTTP 429 with `Retry-After` and does **not** call the Email Service — unchanged from current behaviour.
- [ ] Given the Email Service API returns a non-2xx response (or the required credentials are missing), when the function handles it, then it returns HTTP 500 `{ "ok": false, "error": "send_failed" }`, logs the cause via `console.error`, and does **not** increment the rate-limit counter.

### US-3 — Drop the Resend Dependency

As a developer, I want the `resend` package and its key removed, so that the project has one fewer third-party dependency and one fewer externally-managed secret.

**Acceptance**:
- [ ] Given `web-app/package.json` after this change, when its dependencies are listed, then `resend` is absent.
- [ ] Given the `web-app/` source tree, when searched for `resend` / `RESEND_API_KEY`, then there are no remaining imports or references in application code (`contact.ts` no longer imports the Resend SDK or reads `env.RESEND_API_KEY`).
- [ ] Given `cd web-app && npm install` is re-run after the dependency removal, when it completes, then `npm run build` (Vite + `tsc --noEmit`) still exits 0.
- [ ] Given `CLAUDE.md`, when the "Stack" and any email references are read, then they describe **Cloudflare Email Service**, not Resend, and the `RESEND_API_KEY` secret line is replaced with the new Email Service credentials.

### US-4 — Secrets & Dashboard Configuration

As the site owner, I want the Email Service credentials stored as encrypted Pages secrets, so that no token is ever committed and the function can authenticate to the REST API.

**Acceptance**:
- [ ] Given the Cloudflare Pages project `awsome-website`, when its environment is inspected, then a secret holding the Email Service API token (e.g. `CF_EMAIL_API_TOKEN`) is set, and the Cloudflare account ID is available to the function (env var, e.g. `CF_ACCOUNT_ID`).
- [ ] Given the repository, when any committed file is searched, then neither the API token nor the account ID appears as a literal value (account ID may live in `wrangler.toml`/dashboard config only if the team accepts it as non-secret; the token must never be committed).
- [ ] Given the obsolete `RESEND_API_KEY` secret, when the dashboard is reviewed after cutover, then it is removed (or documented as safe to remove).

---

## Constraints

- **Platform reality — REST API, not binding**: Cloudflare Pages Functions cannot use the `send_email` Workers binding (it is not configurable for Pages). The implementation MUST call the Email Service **REST API** over `fetch()` from within `functions/api/contact.ts`. See RD-1.
- **Email Service maturity**: Cloudflare Email Service is in **public beta** as of April 2026; its API may change before GA. The implementation must isolate the send logic so a future contract change touches one function only, and must fail closed (HTTP 500 `send_failed`, never a false 200) if the API shape shifts.
- **Plan requirement**: Email Service requires a **Workers Paid plan** on the Cloudflare account. This is a billing/account precondition (RD-4) and a hard blocker if not met.
- **DNS / sender verification**: The sending domain `awsome.co.nz` must be verified for sending in Email Service (the domain already uses Cloudflare DNS and has Email Routing enabled, which satisfies the "must use Cloudflare DNS" requirement). Any DKIM/SPF/return-path records Email Service requires are added via the Cloudflare dashboard (RD-3).
- **Security — no trust in client**: The Pages Function continues to re-validate every request with Zod; the client-side schema in `src/data/contact.ts` remains UX-only. The function owns the security boundary.
- **Security — secrets**: The Email Service API token is stored only as an encrypted Pages secret and (if CI deploys) a GitHub Actions secret. It must never appear in any committed file, `wrangler.toml` value, or workflow YAML.
- **Security — server-only**: All credentials, the account ID, and the REST call stay inside `functions/` (Workers runtime). No secret or `env.*` read in `web-app/src/` — the routes are statically prerendered.
- **Diff hygiene**: The only application-code change is to `functions/api/contact.ts` (swap the Resend SDK call for a `fetch` to the Email Service REST API). No unrelated refactors of validation, body-reading, or rate-limit code.
- **Build gate**: `cd web-app && npm run build` and `cd web-app && npm run format:check` must both exit 0 after the change. `npm run typecheck` must exit 0.
- **Protected path — human action required**: `web-app/package.json` dependency changes are protected per `CLAUDE.md`. Removing `resend` must be proposed and approved (or performed) by a human; the agent does not silently edit the manifest or run `npm install`.

---

## Resolved Decisions

- **RD-1 — Send mechanism (DECIDED: Email Service REST API via `fetch`)**: The Pages Function calls the Cloudflare Email Service REST endpoint:
  `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/email/sending/send`
  with headers `Authorization: Bearer <CF_EMAIL_API_TOKEN>` and `Content-Type: application/json`, and a JSON body `{ from, to, subject, text }` (optionally `html`).

  **Rationale**: The native `send_email` Workers binding is not available to Pages Functions (no binding config surface for Pages), and it is restricted to *verified destination addresses*. The REST API works from any runtime via plain `fetch` (no new dependency), is true transactional sending (no per-recipient verification), and keeps `/api/contact` as a same-origin Pages Function — no Worker subdomain, no CORS, no second deploy.

- **RD-2 — Sender / recipient addresses**: `from: "john@awsome.co.nz"` and `to: "john@awsome.co.nz"` are retained from the current implementation. Single recipient; no CC/BCC. (`from`/`to` may be promoted to env vars but hard-coding the existing values is acceptable for v1.)

- **RD-3 — Sender domain verification**: `awsome.co.nz` must be verified for sending in Email Service. The domain already uses Cloudflare DNS with Email Routing active (MX + DKIM `cf2024-1._domainkey` + SPF records already present), which satisfies the Cloudflare-DNS prerequisite. Any additional Email Service sending records are added in the dashboard during T2.

- **RD-4 — Workers Paid plan**: Email Service requires a Workers Paid plan. The owner confirms (or upgrades) the account before T2. If the account cannot be on a paid plan, this spec is blocked and the fallback is to finish the Resend path instead (out of scope here).

- **RD-5 — Credentials**: A scoped Cloudflare API token with **email send** permission is created and stored as the Pages secret `CF_EMAIL_API_TOKEN`. The account ID is provided to the function as `CF_ACCOUNT_ID` (env var). The obsolete `RESEND_API_KEY` secret is removed after cutover.

- **RD-6 — Pages project name**: The live project is **`awsome-website`** (matches `deploy:cf` in `package.json`). Note: `wrangler.toml` currently sets `name = "awsome-nz"`, a cosmetic mismatch — optionally aligned to `awsome-website` during T1 as a minor cleanup (not required for function correctness).

- **RD-7 — Error logging retained**: The two `console.error` diagnostics added during triage are preserved/adapted: one for missing credentials, one for a non-2xx Email Service response (logging status + response body). This keeps `wrangler pages deployment tail` useful if the beta API misbehaves.

---

## Task Breakdown (for `/plan`)

| ID | Title | Protected? |
|----|-------|------------|
| T1 | Rewrite the email-send section of `functions/api/contact.ts`: remove the `import { Resend }` and the `env.RESEND_API_KEY` path; add `env.CF_EMAIL_API_TOKEN` + `env.CF_ACCOUNT_ID` to the `Env` interface; replace the `resend.emails.send(...)` call with a `fetch` POST to the Email Service REST endpoint; map non-2xx → HTTP 500 `send_failed` with `console.error(status, body)`; keep validation, body cap, KV rate-limit, and increment-on-success unchanged. Remove `resend` from `package.json` and re-run `npm install`. | **PROTECTED — `package.json` dependency removal requires human approval** |
| T2 | Cloudflare dashboard / account config (manual): confirm Workers Paid plan (RD-4); verify `awsome.co.nz` for sending in Email Service + add any required DNS records (RD-3); create the scoped API token; set Pages secret `CF_EMAIL_API_TOKEN` and env var `CF_ACCOUNT_ID` on project `awsome-website`; remove the obsolete `RESEND_API_KEY` secret. | Manual (dashboard action) |
| T3 | Update `CLAUDE.md`: Stack `Email:` line → Cloudflare Email Service (REST API) instead of Resend; replace the `RESEND_API_KEY` secret reference with `CF_EMAIL_API_TOKEN` / `CF_ACCOUNT_ID`; adjust the contact-form description. | — |
| T4 | Deploy (`npm run deploy:cf`) and smoke-test on the live deployment: submit the form, confirm 200 + email received within 60s; tail logs to confirm no `send_failed`; verify 422 (bad input) and 429 (4th request/min) paths still behave. | Manual verification |

---

## Definition of Done

- [ ] All acceptance criteria in US-1 through US-4 pass manual verification on the live Cloudflare Pages deployment.
- [ ] `cd web-app && npm run build` exits 0 with no TypeScript errors.
- [ ] `cd web-app && npm run format:check` exits 0 with no Prettier diffs.
- [ ] `cd web-app && npm run typecheck` exits 0.
- [ ] `resend` is absent from `package.json` and from all `web-app/src` and `web-app/functions` imports.
- [ ] No Email Service token (and, if treated as secret, no account ID) appears in any committed file.
- [ ] The contact form delivers an email to `john@awsome.co.nz` within 60 seconds on the live domain.
- [ ] The 422, 429, and 500 (`send_failed`) paths all behave as specified; `console.error` diagnostics appear in `wrangler pages deployment tail` on a forced failure.
- [ ] `CLAUDE.md` reflects Cloudflare Email Service; no stale Resend/`RESEND_API_KEY` references remain.
- [ ] The reviewer agent has approved the `contact.ts` diff before commit (per CLAUDE.md operating rule 4).
- [ ] `SPEC-2026-03` status updated to `Implemented`.

---

## Risks

- **Email Service is beta**: Likelihood: Medium / Impact: High — the REST contract may change before GA, silently breaking sends. Mitigation: isolate the send call in one function; fail closed (500 `send_failed`, never a false 200) on any non-2xx; keep `console.error` logging so a contract drift is visible in `wrangler pages deployment tail`; document the exact endpoint + payload used in the PR.
- **Workers Paid plan not active**: Likelihood: Medium / Impact: High — Email Service requires a paid plan; without it sends will 4xx and the form stays broken. Mitigation: confirm/upgrade the plan in T2 **before** code cutover; if blocked, fall back to completing the Resend path (out of scope here) rather than shipping a broken form.
- **Sender-domain verification gap**: Likelihood: Medium / Impact: High — if `awsome.co.nz` is not verified for *sending* in Email Service (distinct from Email Routing being enabled), the API rejects the send. Mitigation: complete sender verification + any required DNS records in T2 and confirm with a live test send before declaring done.
- **API token scope too narrow/broad**: Likelihood: Low / Impact: Medium — a token missing email-send permission causes 403s; an over-scoped token is a security liability. Mitigation: create a token scoped to email send only; store as an encrypted Pages secret; never commit it.
- **Account ID treated as non-secret**: Likelihood: Low / Impact: Low — the Cloudflare account ID is required in the REST URL and is not itself a credential, but some teams prefer not to commit it. Mitigation: pass it via `CF_ACCOUNT_ID` env var rather than hard-coding in `contact.ts`; decide in T2 whether it lives in dashboard config or `wrangler.toml`.
- **Dependency-removal build break**: Likelihood: Low / Impact: Medium — removing `resend` could surface a stray import or a lockfile mismatch. Mitigation: grep `web-app/` for `resend` before removal; re-run `npm install` + `npm run build` as the gate (protected-path approval required for the manifest edit).
