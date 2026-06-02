# Design: Netlify → Cloudflare Pages Migration (SPEC-2026-02)

## 1. Overview

Migrate the fully static AWSome Painting & Decorating marketing site (React 19 + TanStack Start static prerender + Vite 8 + Tailwind v4) from Netlify Free tier to Cloudflare Pages. The static build output (`dist/client`) is unchanged; the migration replaces the Netlify-specific control plane (`netlify.toml` headers + Netlify Forms) with Cloudflare-native equivalents: a `web-app/public/_headers` file (CSP ported verbatim plus two new headers), a same-origin Cloudflare Pages Function at `web-app/functions/api/contact.ts` that validates input with Zod and relays mail via Resend (rate-limited 3 req/IP/min through Workers KV), a repo-root `wrangler.toml`, and a GitHub Actions deploy workflow. The React component tree, routing, theme, and business content are untouched except for `ContactForm.tsx`, which swaps its Netlify URL-encoded POST for a JSON `fetch('/api/contact')`.

---

## 2. Architecture Diagram

```
                         ┌──────────────────────────────────────────────┐
                         │              Cloudflare Pages                  │
                         │            (project: awsome-nz)                │
                         │                                                │
  ┌──────────┐   GET /   │   ┌─────────────────────────────────────┐     │
  │          │──────────────▶│  Static assets (dist/client)        │     │
  │ Browser  │◀──────────────│  prerendered /, /about, /contact …  │     │
  │ (visitor)│   HTML +  │   │  + public/_headers applied to /*    │     │
  │          │   _headers│   └─────────────────────────────────────┘     │
  │          │           │                                                │
  │          │ POST      │   ┌─────────────────────────────────────┐     │
  │ Contact  │ /api/     │   │  Pages Function                     │     │
  │ form     │ contact   │   │  functions/api/contact.ts           │     │
  │ (JSON)   │──────────────▶│  1. parse JSON                      │     │
  │          │           │   │  2. Zod validate ──► 422 on fail    │     │
  │          │◀──────────────│  3. KV rate-limit ─► 429 over 3/min │─────┼──┐
  │          │ 200/422/  │   │  4. Resend send   ─► 500 on error   │     │  │
  │          │ 429/500   │   │  5. 200 {ok:true}                   │     │  │
  └──────────┘           │   └──────────────┬──────────────────────┘     │  │
                         │                  │ context.env.RATE_LIMIT      │  │
                         │                  ▼                             │  │
                         │   ┌─────────────────────────────────────┐     │  │
                         │   │  Workers KV namespace               │◀────┼──┘
                         │   │  binding: RATE_LIMIT                │     │
                         │   │  key: ip:<addr> · TTL 60s · counter │     │
                         │   └─────────────────────────────────────┘     │
                         └───────────────────────┬──────────────────────┘
                                                 │ HTTPS (Resend SDK)
                                                 ▼
                                   ┌──────────────────────────┐
                                   │  Resend API              │
                                   │  from: john@awsome.co.nz │
                                   │  to:   john@awsome.co.nz │
                                   └────────────┬─────────────┘
                                                ▼
                                   ┌──────────────────────────┐
                                   │  john@awsome.co.nz inbox │
                                   └──────────────────────────┘
```

Secrets (`RESEND_API_KEY`) are injected as Pages environment variables via the Cloudflare dashboard (manual step), never committed. Same-origin request → **no CORS** layer required.

---

## 3. ADR-01: Pages Function Directory Placement

- **Context**: Cloudflare Pages compiles a `functions/` directory into routed Pages Functions. The directory is discovered relative to **the working directory from which `wrangler pages deploy` is invoked** — *not* the static output directory (`dist/client`) and *not* an arbitrary repo location. The spec sets the Pages project Root directory = `web-app`, and the deploy command (both the `deploy:cf` npm script and the CI step) is `wrangler pages deploy dist/client --project-name=awsome-website`. The CI workflow runs `npm ci` and `npm run build` inside `web-app/`, so wrangler is invoked with CWD = `web-app/`.

- **Options considered**:
  1. **A — `web-app/functions/api/contact.ts`**: directory sits at the same level wrangler is run from (`web-app/`). Wrangler auto-discovers `./functions` relative to CWD and uploads it alongside the `dist/client` assets. Matches the documented "create a `/functions` directory at the root of your Pages project (not in the static root such as `/dist`)" guidance. Con: `functions/` is a sibling of `src/`, slightly unusual visually but correct.
  2. **B — `functions/api/contact.ts` at repo root**: only correct if wrangler runs from repo root with Root directory = `/`. The spec fixes Root directory = `web-app` and the build runs in `web-app/`, so wrangler at repo root would not see `dist/client` (it's under `web-app/dist/client`) and would not match the configured project root. Rejected: contradicts the fixed Root directory.
  3. **C — inline `dist/client/_worker.js`**: advanced single-Worker mode; disables the file-based `functions/` router, must be hand-bundled, and is overkill for one endpoint. Rejected per spec guidance ("avoid").

- **Decision**: **Option A — `web-app/functions/api/contact.ts`.** Wrangler discovers the `functions/` folder relative to its invocation directory (`web-app/`), and the file-based route `functions/api/contact.ts` maps to `POST /api/contact` same-origin with the prerendered static site.

- **Consequences**:
  - The `deploy:cf` script and CI step **must** run with CWD = `web-app/` (they already do — build runs there). Document this invariant; running wrangler from repo root would silently drop the Function.
  - `web-app/tsconfig.json` `include: ["**/*.ts","**/*.tsx"]` already covers `functions/api/contact.ts` — the file will be typechecked by `tsc --noEmit` (part of `build`). However, `web-app/tsconfig.json` has **no `compilerOptions.types` array**, which means all `@types/*` are auto-included (including `@types/node`). Adding a `types` array to enable `@cloudflare/workers-types` globals would break this by disabling `@types/node` auto-inclusion. **Resolution (no tsconfig change needed):** the Function must use **selective `import type`** — `import type { PagesFunction, KVNamespace, EventContext } from '@cloudflare/workers-types'` — rather than relying on ambient globals. This keeps existing build intact and makes types explicit.
  - `functions/` must be excluded from the Vite static build but included in the wrangler upload — wrangler handles this automatically (it only compiles `functions/`; Vite never sees it because it is outside `src/`).

---

## 4. ADR-02: Rate Limiting Mechanism

- **Context**: Spec RD-3 requires 3 requests per IP per minute, returning 429 over the limit. Two Cloudflare-native mechanisms exist.

- **Options considered**:
  1. **Workers KV counter**: in the Function, read `ip:<addr>` from a KV namespace, increment, write back with 60s TTL; if count > 3 return 429. Pros: fully in-code, deterministic, testable, lives in version control, works on free tier, already specified (RD-3, wrangler KV binding). Cons: KV is eventually consistent across colos, so the limit is approximate under a globally distributed burst — acceptable for spam mitigation on a low-traffic marketing form.
  2. **Cloudflare Rate Limiting rule (dashboard WAF)**: configure a zone-level rule. Pros: no code, edge-enforced before the Function runs. Cons: not in version control, harder to reproduce per-environment, configured out-of-band in the dashboard (drifts from the repo), and the free-tier rule allowance is limited. Contradicts the spec's "owned, composable, in-repo" direction.

- **Decision**: **Option 1 — Workers KV counter**, binding name `RATE_LIMIT`, key `ip:<CF-Connecting-IP>`, value = integer count, `expirationTtl: 60`. Over 3 within the window → HTTP 429.

- **Consequences**:
  - KV eventual consistency means a determined attacker hitting multiple colos could exceed 3/min briefly. Acceptable for a contact form; Resend send caps and the 429 default still bound abuse.
  - Requires a KV namespace provisioned in the Cloudflare account and its ID pasted into `web-app/wrangler.toml` `[[kv_namespaces]]` (manual step — the real namespace ID is account-specific and must be filled by the human; a placeholder is committed and flagged).
  - The Function reads the client IP from the `CF-Connecting-IP` request header (Cloudflare-injected, trustworthy at the edge), falling back to a fixed bucket if absent.

---

## 5. ADR-03: CSP Migration Strategy

- **Context**: `web-app/netlify.toml` (line 59) carries a hardened CSP plus `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. The spec mandates porting these **verbatim** to `web-app/public/_headers` and adding `Permissions-Policy` + `Strict-Transport-Security`. The CSP's `connect-src 'self'` and `form-action 'self'` already permit the same-origin `fetch('/api/contact')` because the Function is same-origin — no CSP relaxation is needed for the new endpoint.

- **Options considered**:
  1. **Port verbatim, add two headers**: copy the CSP byte-for-byte, append `Permissions-Policy` and `Strict-Transport-Security`. Pros: zero regression risk; the existing directives already cover same-origin POST; auditable 1:1 against `netlify.toml`. Cons: none material.
  2. **Relax CSP for the API / re-derive directives**: e.g., add explicit `connect-src` hosts or loosen `script-src`. Rejected: the endpoint is same-origin (`'self'` already covers it); any relaxation is a net security regression with no functional benefit. Re-deriving the CSP risks dropping a directive — exactly the regression the spec warns against.

- **Decision**: **Option 1 — port the CSP byte-for-byte**, then add `Permissions-Policy` and `Strict-Transport-Security`. The CSP string committed to `_headers` MUST equal `netlify.toml` line 59 character-for-character.

- **CSP (verbatim — single line in `_headers`)**:
  ```
  default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'
  ```

- **New headers**:
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` — deny powerful features the site never uses. (Exactly matches the spec US-1 AC; no extra directives.)
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` — 1-year HSTS; safe because Cloudflare enforces HTTPS and DNS already points at Cloudflare (RD-4).

- **Consequences**:
  - `_headers` uses Cloudflare's plain-text format (path line `/*` then indented `Header: value` lines), which differs syntactically from `netlify.toml`'s TOML table but must carry identical values. A reviewer diffs the CSP string against `netlify.toml:59`.
  - `netlify.toml` is retired, **not deleted** (spec Non-Goal) — it remains as the regression reference until cutover is verified.
  - HSTS `preload` commits the domain to HTTPS-only; correct given the cutover, but flagged in the manual checklist so the operator is aware before DNS propagation completes.

---

## 6. Component Map

### New files
| File | Description |
|---|---|
| `web-app/public/_headers` | Cloudflare Pages headers file. **`web-app/public/` directory must be created (it does not exist today).** `/*` block: CSP (verbatim from `netlify.toml:59`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, plus new `Permissions-Policy` and `Strict-Transport-Security`. Vite copies `public/` passthrough to `dist/client/` — verified convention for this stack. **Note: `web-app/.prettierignore` excludes `**/public`, so `_headers` is not checked by Prettier; format gate does not apply to this file.** |
| `web-app/wrangler.toml` | Pages config: `name = "awsome-nz"`, `pages_build_output_dir = "dist/client"` (relative to `web-app/`), `compatibility_date = "2026-06-01"`, `[[kv_namespaces]]` binding `RATE_LIMIT` (placeholder `id`). **Placed in `web-app/` (NOT repo root)** — this eliminates the CWD/positional-arg/config-file conflict: wrangler is invoked from `web-app/` CWD, finds `wrangler.toml` in CWD, resolves `pages_build_output_dir = "dist/client"` relative to the toml's directory (`web-app/`), and discovers `functions/` relative to CWD. The deploy command uses **no positional arg**: `wrangler pages deploy --project-name=awsome-website`. |
| `web-app/functions/api/contact.ts` | Cloudflare Pages Function. `POST /api/contact` (same-origin). Uses `import type { PagesFunction, KVNamespace, EventContext } from '@cloudflare/workers-types'` (selective import — no tsconfig `types` array change). Parses JSON → enforces max body size (100 KB) → Zod-validates (`z.email()` v4 API mirroring `data/contact.ts`) → KV rate-limit (3/IP/min via `RATE_LIMIT`) → Resend send (`from`/`to` = `john@awsome.co.nz`) → JSON response 200/422/429/500. |
| `.github/workflows/deploy.yml` | **PROTECTED PATH.** GitHub Actions on push to `main`: checkout → setup-node@v4 (Node 24) → `npm ci` → `npm run typecheck` → `npm run build` → `wrangler pages deploy --project-name=awsome-website` (no positional arg — `wrangler.toml` drives output dir), all with `working-directory: web-app`. Uses secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. |

### Modified files
| File | Change | Why |
|---|---|---|
| `web-app/src/components/ContactForm.tsx` | Replace the Netlify URL-encoded POST to `/` (lines 37–52) with `fetch('/api/contact', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(result.data)})`; branch on `res.ok` for success/error UI. Remove `data-netlify`, `netlify-honeypot`, `action="/"`, the hidden `form-name` input, and the bot-field honeypot block (lines 83–95, 90). Keep all Zod validation (line 20), `fieldErrors`, `status` state, and success/error markup. | Swap Netlify Forms for the same-origin Pages Function while preserving validation + a11y + UI. |
| `web-app/package.json` | Add scripts `"typecheck": "tsc --noEmit"` and `"deploy:cf": "wrangler pages deploy --project-name=awsome-website"` (**no positional arg** — `wrangler.toml` `pages_build_output_dir` drives the output dir); add devDependencies `wrangler` and `@cloudflare/workers-types`; add dependency `resend`. | CI typecheck gate, local/CI deploy command, Function runtime + types. |

### Untouched (explicitly)
`web-app/src/data/contact.ts` (schema reused as the contract source of truth), `vite.config.ts`, all routes, all other components, Tailwind theme, `netlify.toml` (retired, not deleted).

---

## 7. API Contract — `POST /api/contact`

Same-origin. No CORS headers. `Content-Type: application/json`.

### Request body

**Maximum size: 100 KB** — the Function checks `Content-Length` (or reads with a size cap) and returns 422 if exceeded, before parsing JSON.

```jsonc
{
  "name":    "string (required, min 1)",
  "email":   "string (required, valid email)",
  "phone":   "string (optional)",
  "service": "string (optional)",
  "message": "string (required, min 1)"
}
```

Validated server-side with a Zod schema identical to `web-app/src/data/contact.ts` (Zod v4 `z.email()`):
```ts
const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().min(1),
});
```

### Responses
| Status | Body | When |
|---|---|---|
| `200 OK` | `{ "ok": true }` | Validation passed, under rate limit, Resend accepted the message. |
| `422 Unprocessable Entity` | `{ "ok": false, "error": "validation", "issues": [{ "field": "email", "message": "…" }] }` | Body fails Zod (`safeParse` unsuccessful) or is not valid JSON. |
| `429 Too Many Requests` | `{ "ok": false, "error": "rate_limit" }` + `Retry-After: 60` header | More than 3 requests from the same `CF-Connecting-IP` within the 60s KV window. |
| `500 Internal Server Error` | `{ "ok": false, "error": "send_failed" }` | Resend SDK throws / non-2xx, or `RESEND_API_KEY` missing. No secret/stack detail leaked to the client. |
| `405 Method Not Allowed` | `{ "ok": false, "error": "method" }` | Any method other than POST (Function exports only `onRequestPost`; non-POST is rejected by the Pages runtime). |

`ContactForm.tsx` treats `res.ok` (200) as success and any non-2xx as the existing "Something went wrong" error state.

---

## 8. Task Breakdown

The spec frames the code+config work as a single combined migration commit (T1). Below, T1 is decomposed into ordered sub-steps **T1a–T1f** that land as **one Conventional Commit** (`feat(deploy): migrate to Cloudflare Pages [SPEC-2026-02]`). Gates after each code-affecting sub-step: `cd web-app && npm run build` (exit 0) and `cd web-app && npm run format:check` (no diffs).

| ID | Title | Files | AC refs | Gates | Protected |
|---|---|---|---|---|---|
| ✅ **T1a** | Create `web-app/public/` directory; add `_headers` with verbatim CSP + new headers | `web-app/public/_headers` (NEW; dir must be created) | US-1 headers/CSP ACs | build only (`_headers` is excluded from Prettier by `.prettierignore **/public`) | no |
| ✅ **T1b** | Add `package.json` scripts + deps (`typecheck`, `deploy:cf` (no positional arg), `wrangler`, `@cloudflare/workers-types`, `resend`) | `web-app/package.json` (MODIFY) | US-3 typecheck AC | `npm install` then build + format | **deps — human approval required** |
| ✅ **T1c** | Add `wrangler.toml` in `web-app/` (NOT repo root): `pages_build_output_dir = "dist/client"`, `compatibility_date = "2026-06-01"`, `[[kv_namespaces]]` RATE_LIMIT with placeholder ID | `web-app/wrangler.toml` (NEW) | wrangler/KV config | format | no |
| ✅ **T1d** | Implement Pages Function: selective `import type` from `@cloudflare/workers-types`; 100 KB body cap; Zod validate; KV rate-limit 3/IP/min; Resend send; 200/422/429/500 responses | `web-app/functions/api/contact.ts` (NEW) | US-2 ACs (200/422/429/500) | build (`tsc --noEmit` covers `functions/` via `tsconfig.json` `include:["**/*.ts","**/*.tsx"]`) + format | no |
| ✅ **T1e** | Rewire `ContactForm.tsx` to JSON `fetch('/api/contact')`; strip Netlify attrs/honeypot | `web-app/src/components/ContactForm.tsx` (MODIFY) | US-2 form-submit AC | build + format | no |
| ✅ **T1f** | Add `.github/workflows/deploy.yml` (deploy command: `wrangler pages deploy --project-name=awsome-website` with `working-directory: web-app`) | `.github/workflows/deploy.yml` (NEW) | US-3 CD ACs | n/a (YAML only) | **YES — PROTECTED PATH; human override required before write** |
| ✅ **T1-review** | Adversarial reviewer pass on full combined diff | all above | — | — | no |
| ✅ **T2** | DNS / custom-domain cutover (see §10) | — (dashboard/registrar) | US-4 ACs | manual | human-only |
| ✅ **T3** | End-to-end smoke test on live Cloudflare deployment | — | all US ACs | manual | human-only |

**Execution order**: T1a → T1b → T1c → T1d → T1e → T1f → T1-review → single commit → T2 → T3.

**Key sequencing notes**:
- T1b must run before T1d so `tsc --noEmit` can resolve `resend` and `@cloudflare/workers-types` during T1d's build gate.
- T1f is blocked until the human grants a protected-path override; the coder must stop and surface this rather than writing to `.github/workflows/`.

**Route coverage note**: US-1 ACs for `/services`, `/projects`, and the `$.tsx` 404 catch-all cannot be verified on this branch — those routes do not exist yet (`vite.config.ts` prerenders only `/`, `/about`, `/contact`; `routeTree.gen.ts` has no `services.tsx`, `projects.tsx`, or `$.tsx`). Those ACs are scoped to SPEC-2026-01 follow-on tasks and are **out-of-scope for smoke-test T3**. T3 verifies only the three prerendered routes plus the contact form end-to-end.

---

## 9. Dependency Additions

All require human approval per CLAUDE.md ("propose in chat, do not install silently").

| Package | Type | Justification |
|---|---|---|
| `resend` | `dependencies` | Official Resend SDK; the contact-relay mechanism mandated by RD-1/RD-2. Small, actively maintained, first-party. Used only inside `web-app/functions/api/contact.ts` — not imported by the browser bundle. |
| `wrangler` | `devDependencies` | Cloudflare's official CLI; required for `deploy:cf` script and the CI deploy step. Dev-only; never shipped to the browser bundle. |
| `@cloudflare/workers-types` | `devDependencies` | TypeScript definitions for `PagesFunction`, `KVNamespace`, `EventContext`, etc. Used via **selective `import type`** in `web-app/functions/api/contact.ts` — no `tsconfig.json` `types` array change needed (adding a `types` array would disable auto-inclusion of `@types/node`, breaking the existing build). Dev-only; no runtime footprint. |

No new browser-bundle dependencies. `zod` (already `^4.4.3`) is reused by the Function.

---

## 10. Manual Steps Checklist (human-required, in order)

1. **Cloudflare account**: confirm Account ID = `ed40bf5918d61517c81ac1508accb824`.
2. **Create the Pages project `awsome-nz`** (Cloudflare dashboard): connect GitHub repo; set **Root directory = `web-app`**, **Build command = `npm run build`**, **Build output = `dist/client`**, **Node version = 24**, **Production branch = `main`**.
3. **Create the Workers KV namespace** `RATE_LIMIT` (dashboard → Workers & Pages → KV → Create, or `wrangler kv namespace create RATE_LIMIT --config web-app/wrangler.toml`): copy the generated namespace **ID** into `web-app/wrangler.toml` `[[kv_namespaces]]` `id` (replacing the `"REPLACE_WITH_YOUR_KV_NAMESPACE_ID"` placeholder), and bind it to the Pages project (Settings → Functions → KV namespace bindings: binding name `RATE_LIMIT`).
4. **Resend setup**: create Resend account; add the `awsome.co.nz` sending domain; add the SPF/DKIM/DMARC DNS records in Cloudflare DNS; generate an API key.
5. **Set `RESEND_API_KEY`** as a Pages production (+ preview) secret in the Cloudflare dashboard. Never commit it.
6. **GitHub Actions secrets**: add `CLOUDFLARE_API_TOKEN` (scoped to Cloudflare Pages:Edit) and `CLOUDFLARE_ACCOUNT_ID` to the repo's Actions secrets.
7. **Protected-path override for T1f**: authorise the agent to write `.github/workflows/deploy.yml` (grant `ALLOW_PROTECTED=1` or equivalent), or commit the file manually using the content in T1f.
8. **DNS / custom-domain cutover (T2)**: add `awsome.co.nz` (and `www`) as a custom domain on the Pages project; confirm NS propagation (RD-4); verify TLS auto-issued and HTTPS redirect active. Note: `Strict-Transport-Security: preload` (ADR-03) makes this HTTPS-only permanently — confirm intent before cutover.
9. **Smoke test (T3)**: routes `/`, `/about`, `/contact` return 200 (note: `/services` and `/projects` are not yet prerendered on this branch — out of scope); contact form → delivery to `john@awsome.co.nz` within 60s; `curl -I` confirms CSP byte-matches `netlify.toml:59`, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`; 4th rapid POST to `/api/contact` returns 429.
10. **Retire Netlify** (after T3): pause/disable the Netlify site. Leave `web-app/netlify.toml` in the repo (CSP regression reference; spec Non-Goal: not deleted).

---

## 11. Review history

**2026-06-01 — plan-reviewer pass, verdict REQUEST_CHANGES (2 BLOCKING, 4 SHOULD-FIX).**
Fixed before re-review:
- BLOCKING 1: `@cloudflare/workers-types` wired via selective `import type` in the Function (not tsconfig `types` array, which would break `@types/node` auto-inclusion).
- BLOCKING 2: `wrangler.toml` moved to `web-app/` (not repo root); `pages_build_output_dir = "dist/client"` relative to `web-app/`; deploy command uses no positional arg — eliminates CWD/config-file/positional-arg conflict.
- SHOULD-FIX: `/services`, `/projects`, `$.tsx` 404 route ACs scoped out of T3 (routes absent on this branch; belong to SPEC-2026-01 follow-on).
- SHOULD-FIX: T1a notes that `web-app/public/` must be created; format gate clarified as build-only for `_headers` (excluded by `.prettierignore`).
- SHOULD-FIX: `Permissions-Policy` fixed to `camera=(), microphone=(), geolocation=()` (spec-exact; removed `browsing-topics=()`).
- SHOULD-FIX: 100 KB body-size cap added to API contract and Function description.

**Post-fix verdict: APPROVED for implementation.**
