# Design: SPEC-2026-03 — Cloudflare Email Service for the Contact Form

**Spec**: SPEC-2026-03 
**Status**: Approved
**Owner**: Ewerton Silveira 
**Design date**: 2026-06-02

## Summary

The contact form returns HTTP 500 because the email-send step in `web-app/functions/api/contact.ts` depends on Resend, which has no configured `RESEND_API_KEY` and no verified sender domain. We replace the Resend SDK call with a native `fetch()` POST to the Cloudflare Email Service REST API, removing the `resend` npm dependency entirely. The change is surgically scoped to a single source file (`functions/api/contact.ts`) plus the protected `package.json` removal, `CLAUDE.md` docs, and out-of-band Cloudflare dashboard/secret configuration. Every existing behaviour — Zod re-validation, 100 KB body cap, 3/IP/min KV rate limit, the 422/429/500 response shapes, and increment-on-success-only — stays byte-identical; only the ~30-line send block (lines 150–185) and the `Env` interface + import header are rewritten.

## Verification of the spec's factual claims against the code

All claims in the spec were verified against the actual `functions/api/contact.ts` (read end-to-end). Status:

| Spec claim | Code reality | Verdict |
|---|---|---|
| Imports `{ Resend } from 'resend'` | Line 2 | CONFIRMED |
| `Env` has `RATE_LIMIT: KVNamespace` + `RESEND_API_KEY: string` | Lines 5–8 | CONFIRMED |
| Reads `env.RESEND_API_KEY`, constructs `new Resend(...)` | Lines 152, 157 | CONFIRMED |
| Calls `resend.emails.send({from,to,subject,text})` | Lines 169–174, from/to both `john@awsome.co.nz` | CONFIRMED |
| Subject `` `${name} via awsome.co.nz` `` | Line 172 | CONFIRMED |
| Plain-text body with name/email/optional phone/service/message | Lines 159–167 | CONFIRMED |
| 100 KB body cap (Content-Length fast path + rolling read cap) | `MAX_BODY_BYTES = 100*1024`, lines 41–96 | CONFIRMED |
| Rate limit 3/IP/min → 429 with `Retry-After` | `RATE_LIMIT_MAX=3`, `RATE_LIMIT_TTL=60`, lines 144–148 | CONFIRMED |
| Increment KV only on send success | `env.RATE_LIMIT.put` at lines 181–183, after the send-error guard | CONFIRMED |
| 422 on invalid input | Lines 124–131 (Zod), plus body-cap/JSON 422s | CONFIRMED |
| Two `console.error` diagnostics (missing creds; send failure) | Lines 153 and 177 | CONFIRMED |
| Client Zod schema fields name/email/phone?/service?/message | `src/data/contact.ts` matches the function's schema exactly | CONFIRMED |
| `resend` dep present | `package.json` line 21: `"resend": "^6.12.4"` | CONFIRMED |

**Mismatches / notes found:**

1. **Body-too-large returns 422, not the spec's prose "422".** The spec body text says "422 on body >100KB" — code agrees (lines 43–52, 76–86 all return 422). Good. (Some other docs loosely say 413; the code is 422 and we keep it.)
2. **`wrangler.toml` `name = "awsome-nz"` vs deploy target `awsome-website`.** Confirmed cosmetic mismatch (RD-6): `package.json` `deploy:cf` uses `--project-name=awsome-website`, which overrides the toml `name`. Aligning the toml is optional in T1.
3. **`error: 'validation'` not `'send_failed'` for input failures.** The 422 bodies use `error: 'validation'` with an `issues[]` array. The spec's US-2 phrasing ("422 on missing/invalid field") is satisfied by this shape; no change needed.
4. **The rate-limit read-modify-write is non-atomic** (documented in the code comment, lines 136–137, "ADR-02"). Out of scope; preserved unchanged.

No blocking mismatches. The spec is accurate enough to design against.

## Cloudflare Email Service REST contract — uncertainty flag

The endpoint is confirmed by current Cloudflare docs:

```
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/email/sending/send
Authorization: Bearer <CF_EMAIL_API_TOKEN>
Content-Type: application/json
```

**The flat body shape is CORROBORATED by the live docs.** The official REST reference (`https://developers.cloudflare.com/email-service/api/send-emails/rest-api/`) shows a **flat** body — `{ to, from, subject, html, text, headers? }` — exactly matching RD-1's assumption. There is **no** `personalizations[]`/`content[]` (SendGrid-style) array for this REST endpoint; that shape belongs to a different API surface and is not a risk here.

**The one genuine open question for T1**: the documented examples lead with an `html` field, and it is **not confirmed whether a `text`-only body (no `html`) is accepted.** If the API requires `html`, shipping a `text`-only body would produce a non-2xx → fail-closed 500 → the form stays broken. Because this API is **public beta (April 2026)** and may drift, T1 MUST verify, against the live reference, whether `text`-only is accepted; if not (or if uncertain), T1 includes an `html` field too (a minimal HTML rendering of the same lines). The send is isolated in `sendContactEmail` (ADR-03) so only the body-builder changes if the contract differs. T1 records the confirmed body shape in the commit message.

## Before → After for the email-send section

### Header (lines 1–8) — BEFORE

```ts
import { Resend } from 'resend';
...
interface Env {
  RATE_LIMIT: KVNamespace;
  RESEND_API_KEY: string;
}
```

### Header — AFTER

```ts
// (drop the resend import entirely)
interface Env {
  RATE_LIMIT: KVNamespace;
  CF_EMAIL_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
}
```

### Send block (lines 150–185) — BEFORE

Resend SDK: `if (!env.RESEND_API_KEY) {...}` → `new Resend(...)` → build `lines[]` → `resend.emails.send(...)` → `if (sendError) {...}` → KV `put` → `200`.

### Send block — AFTER (isolate into a helper; see ADR-03)

The `lines[]` builder (current lines 159–167) is preserved logically, re-pointed to read `fields.*` (the helper takes a `fields` object instead of closing over the destructured locals). The credential guard, send call, and error mapping are replaced. Proposed shape (helper above `onRequestPost`):

```ts
// Isolated so the beta Email Service contract lives in one place (ADR-03).
// Returns null on success, or an Error to log on failure.
async function sendContactEmail(
  env: Env,
  fields: { name: string; email: string; phone?: string; service?: string; message: string },
): Promise<Error | null> {
  if (!env.CF_EMAIL_API_TOKEN || !env.CF_ACCOUNT_ID) {
    return new Error('CF_EMAIL_API_TOKEN or CF_ACCOUNT_ID is not set');
  }

  const lines: string[] = [
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    fields.phone ? `Phone: ${fields.phone}` : null,
    fields.service ? `Service: ${fields.service}` : null,
    '',
    'Message:',
    fields.message,
  ].filter((line): line is string => line !== null);

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`;

  // Flat body confirmed against the live REST reference (not personalizations[]).
  // ⚠ T1: confirm `text`-only is accepted; if `html` is required, add an `html` field too.
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CF_EMAIL_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'john@awsome.co.nz',
      to: 'john@awsome.co.nz',
      subject: `${fields.name} via awsome.co.nz`,
      text: lines.join('\n'),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '<no body>');
    return new Error(`Email Service responded ${res.status}: ${detail}`);
  }
  return null;
}
```

Call site inside `onRequestPost` (replacing lines 150–179), keeping the rate-limit `put` exactly where it is (only-on-success):

```ts
const sendError = await sendContactEmail(env, { name, email, phone, service, message });
if (sendError) {
  console.error('contact: email send failed', sendError);
  return json({ ok: false, error: 'send_failed' }, 500);
}

await env.RATE_LIMIT.put(kvKey, String(count + 1), { expirationTtl: RATE_LIMIT_TTL });
return json({ ok: true }, 200);
```

**RD-7 console.error preservation:** Both diagnostics survive (decision in ADR-03). The "missing creds" case (was line 153) is now an `Error` returned from the guard and logged by the single `console.error('contact: email send failed', sendError)` — the message string includes which credential is missing. The "non-2xx with status+body" case (was line 177) is the `Error('Email Service responded ${status}: ${detail}')`. Both reach `console.error` and both fail closed (500 `send_failed`).

### Byte-identical preservation guarantee

The following are NOT touched by T1 (verified line ranges): the `json()` helper (22–34), `ContactSchema` + constants (10–20), Content-Length fast path (41–52), rolling-read body cap (54–106), JSON parse (108–121), Zod safeParse + 422 mapping (123–131), destructure (133), IP/KV-key derivation (135–142), rate-limit read + 429 + Retry-After (141–148), and the KV `put` TTL semantics (181–183). The reviewer must diff these ranges and confirm zero change. **Note**: the `lines[]` body builder (159–167) is *not* in this byte-identical set — it is logically identical but re-pointed from the destructured locals to `fields.*` for the extracted helper; the reviewer should confirm only that re-pointing, not zero change.

## Decision Records

### ADR-01: Send via REST `fetch()` rather than a `send_email` Workers binding

- **Context**: Pages Functions run on the Workers runtime but the `send_email` binding (Email Routing's outbound binding) is not available to Pages Functions, and the owner has chosen to avoid both a third-party SDK and a standalone Worker.
- **Options**:
  1. `send_email` binding — zero HTTP, no token. **Rejected**: not available in Pages Functions (RD-1); would force a standalone Worker (explicit non-goal).
  2. Resend (status quo) — **Rejected**: the dependency we are removing; needs verified Resend domain + secret.
  3. Cloudflare Email Service REST API via `fetch()` — no new runtime dependency, native to the Workers runtime, works from a Pages Function.
- **Decision**: Option 3 — REST via `fetch()`.
- **Consequences**: Adds an API token secret (`CF_EMAIL_API_TOKEN`) and account-ID env var. We own the request/response contract manually (no SDK types), so we must validate the beta schema in T1 and fail closed. No new npm dependency; `resend` is removed.

### ADR-02: Credentials — token as encrypted secret, account ID as plaintext env var

- **Context**: The REST call needs a bearer token and the account ID in the URL. The token is a credential; the account ID is a non-secret identifier but the spec forbids committing it as a literal.
- **Options**:
  1. Both as encrypted Pages secrets — uniform, but account ID is not actually secret and secrets are write-only/harder to inspect.
  2. Token as encrypted secret, account ID as a plaintext Pages environment variable (`CF_ACCOUNT_ID`) — least-privilege for the real secret, account ID still not committed to git.
- **Decision**: Option 2. `CF_EMAIL_API_TOKEN` = encrypted Pages secret (email-send scope only); `CF_ACCOUNT_ID` = Pages environment variable. Neither appears as a literal in any committed file (read from `env.*` only).
- **Consequences**: Two dashboard settings instead of one. Account ID is visible in the Pages dashboard env list (acceptable — it is not a credential). Matches RD-5.

### ADR-03: Isolate the send into a single `sendContactEmail` helper

- **Context**: The Email Service is public beta; its REST contract may change. The spec calls for "isolate send logic, fail closed."
- **Options**:
  1. Inline the fetch in `onRequestPost` (smallest diff).
  2. Extract a `sendContactEmail(env, fields)` helper that owns the endpoint, headers, body shape, and non-2xx mapping; returns `Error | null`.
- **Decision**: Option 2.
- **RD-7 resolution (decided here, not deferred)**: The helper returns `Error | null`; the single call-site `console.error('contact: email send failed', sendError)` logs the cause. RD-7's "two diagnostics" are satisfied by **two distinct error causes**, each carried in the logged `Error`'s message: the missing-credential case (`'CF_EMAIL_API_TOKEN or CF_ACCOUNT_ID is not set'`) and the non-2xx case (`'Email Service responded ${status}: ${detail}'`, which includes status + response body). Both reach `console.error` and both fail closed (500 `send_failed`). This is the decision — T1/T5 do not re-litigate "one statement vs two." A future contract drift still surfaces in `wrangler pages deployment tail`.
- **Consequences**: If the beta body schema drifts, only the helper changes; the request pipeline (validation/rate-limit/responses) is untouched and the blast radius is one function. Slightly larger initial diff (~10 extra lines). Improves testability for a future suite (v1 has none).

## Component Map

```
ContactForm.tsx (UNCHANGED)
      │  POST JSON {name,email,phone?,service?,message}
      ▼
functions/api/contact.ts  (onRequestPost)
  ├─ body cap (Content-Length + rolling)   ── UNCHANGED ──► 422
  ├─ JSON.parse                             ── UNCHANGED ──► 422
  ├─ ContactSchema.safeParse (Zod)          ── UNCHANGED ──► 422
  ├─ KV RATE_LIMIT.get → count >= 3         ── UNCHANGED ──► 429 + Retry-After
  ├─ sendContactEmail(env, fields)  ◄══ CHANGED (Resend → fetch REST) ══►
  │        │  fetch POST .../email/sending/send  (Bearer CF_EMAIL_API_TOKEN)
  │        └─ non-2xx OR missing creds → Error → console.error → 500 send_failed
  └─ KV RATE_LIMIT.put (only on success)    ── UNCHANGED ──► 200 {ok:true}
                                                   │
                                                   ▼
                              Cloudflare Email Service ──► john@awsome.co.nz
```

## Touched Files

| File | Change | Why |
|---|---|---|
| `web-app/functions/api/contact.ts` | MODIFY | Replace Resend SDK send with REST `fetch`; update `Env`; isolate into helper |
| `web-app/package.json` | MODIFY (**PROTECTED**) | Remove `"resend": "^6.12.4"` dependency |
| `web-app/package-lock.json` | MODIFY (generated) | Result of `npm install` after dep removal — do not hand-edit |
| `CLAUDE.md` | MODIFY | Email line → Cloudflare Email Service; swap `RESEND_API_KEY` → `CF_EMAIL_API_TOKEN`/`CF_ACCOUNT_ID` |
| `web-app/wrangler.toml` | MODIFY (optional, RD-6) | Align `name = "awsome-website"` — cosmetic only |
| Cloudflare Pages dashboard | CONFIG (manual) | Secrets/env + sender verification + plan — not a repo file |

No changes to `src/**` (no React/route/Tailwind/data changes), `_headers`, or the KV binding.

## Type / Contract Changes

- **`Env` interface** (in `functions/api/contact.ts`): remove `RESEND_API_KEY: string`; add `CF_EMAIL_API_TOKEN: string` and `CF_ACCOUNT_ID: string`. Keep `RATE_LIMIT: KVNamespace`.
- **No change** to `ContactSchema` (server) or `src/data/contact.ts` (client) — fields stay `name, email, phone?, service?, message`.
- **No new routes**, no new shared types, no Zod schema changes.
- **Outbound REST contract** (we own it, not exported): endpoint + `Authorization: Bearer` + JSON body — **shape to be confirmed in T1**.

## Task Breakdown (for /implement)

Execution order is linear. Code tasks gate on `npm run build && npm run format:check && npm run typecheck` (all exit 0) from `web-app/`.

1. ✅ **T1 [coder] — Rewrite the send path + remove the dependency.** (**package.json edit is PROTECTED — requires human approval before the coder writes it.**) — **DONE 2026-06-03.** Resend SDK replaced with `fetch()` to the CF Email Service REST endpoint, isolated in `sendContactEmail(env, fields)`; `Env` updated (`RESEND_API_KEY` → `CF_EMAIL_API_TOKEN` + `CF_ACCOUNT_ID`); `resend` removed from `package.json` + lockfile refreshed. All preserved ranges confirmed byte-identical; gates green (build/typecheck exit 0, Prettier clean on touched files). Reviewer: APPROVE.
   - **Deviation 1 (body shape):** ships BOTH `text` and `html` (design's proposed body had `text`-only). Live REST docs lead with `html` and do **not** confirm `text`-only is accepted, so `html` was added as the fail-safe per the design's own T1 directive (line 53). Confirmed shape: flat `{from,to,subject,text,html}`, no `personalizations[]`.
   - **Deviation 2 (security hardening):** the `html` field escapes user input via an `esc()` helper (`&`→`&amp;` first, then `<`/`>`) applied to `lines.map(esc)` — caught by the reviewer as net-new HTML-injection surface (the Resend baseline was text-only). `text` left raw.
   - **Follow-up (pre-existing, NOT T1):** `ContactSchema.name` is not bounded against CRLF, so the raw `subject` interpolation could carry header-injection payloads. Carried over unchanged from the Resend path; out of scope for T1.
   - Before writing: fetch `https://developers.cloudflare.com/email-service/api/send-emails/rest-api/` (Markdown) and confirm the exact request body schema; adjust the `JSON.stringify({...})` body to match the real contract. Record the confirmed shape in the commit body.
   - Remove `import { Resend }`; update `Env` (drop `RESEND_API_KEY`, add `CF_EMAIL_API_TOKEN` + `CF_ACCOUNT_ID`).
   - Add `sendContactEmail` helper (ADR-03); replace lines 150–179 with the helper call + single `console.error` + 500 mapping; keep KV `put` increment-on-success and the `200` return byte-identical.
   - Grep `web-app/` for `resend`/`RESEND_API_KEY` → only `package.json`/`package-lock.json` may remain pre-removal. Remove `"resend"` from `package.json` (PROTECTED) and run `npm install` to refresh the lockfile.
   - **Gates**: `npm run build`, `npm run format:check`, `npm run typecheck` all exit 0; grep for `resend`/`RESEND_API_KEY` returns zero matches in `web-app/` (including lockfile). No token/account-ID literal in the diff (only `env.*` reads).
2. **T2 [manual / dashboard] — Cloudflare configuration.** Confirm **Workers Paid plan** active (RD-4, hard blocker — do before any cutover); verify `awsome.co.nz` for *sending* and confirm MX + DKIM (`cf2024-1._domainkey`) + SPF present (RD-3); create a scoped API token with email-send permission only; set `CF_EMAIL_API_TOKEN` (secret) and `CF_ACCOUNT_ID` (env var) on the `awsome-website` Pages project; remove obsolete `RESEND_API_KEY`.
   - **Acceptance**: plan confirmed; sender domain verified; token scope = email-send only; both vars set; `RESEND_API_KEY` removed. (Not in repo; verified in dashboard.)
3. **T3 [coder] — Update `CLAUDE.md`.** There are **five** Resend/`RESEND_API_KEY` references — all must be updated (verified via grep, do not rely on these line numbers alone; re-grep before editing):
   - **Line 7** (intro): "(email via Resend + KV-backed rate limiting)" → "(email via Cloudflare Email Service + KV-backed rate limiting)".
   - **Line 24** (Stack flow): "emails (Resend)" → "emails (Cloudflare Email Service REST API)".
   - **Line 25** (Stack `Email:` line): "Resend (functions/api/contact.ts) — requires RESEND_API_KEY secret" → "Cloudflare Email Service REST API (functions/api/contact.ts) — requires `CF_EMAIL_API_TOKEN` secret + `CF_ACCOUNT_ID`".
   - **Line 61** (File Layout comment): "Zod validate + KV rate-limit + Resend email" → "Zod validate + KV rate-limit + Cloudflare Email Service".
   - **Line 88** (No-SSR rule): "(secrets, KV, Resend, `env.*` bindings)" → "(secrets, KV, Cloudflare Email Service, `env.*` bindings)".
   - **Gates**: `npm run format:check` (covers `.md`) exits 0; `grep -i 'resend\|RESEND_API_KEY' CLAUDE.md` returns **zero** matches (US-3 AC + T3's own gate).
4. **T4 [manual verification] — Deploy + smoke test.** `npm run deploy:cf`; submit the live form → expect `200 {ok:true}` and email at `john@awsome.co.nz` within 60s; `wrangler pages deployment tail` shows no `send_failed`; verify 422 (bad/missing field, >100 KB body) and 429 (4th POST/IP/min, with `Retry-After`) still behave; force a failure (temporarily bad token) → confirm `500 {ok:false,error:"send_failed"}` + visible `console.error`.
5. **T5 [reviewer]** — Adversarial pass on the `contact.ts` diff (confirm the preserved ranges are byte-identical, the beta contract is confirmed not invented, fail-closed holds, no secret literal) before T1's commit. *Run between T1's gates passing and T1's commit, per CLAUDE.md rule 4.*

## AC-coverage table

| US acceptance bullet | Covered by |
|---|---|
| US-1 valid POST → REST POST with from/to/subject/text → 200 {ok:true} | T1 (code), T4 (live) |
| US-1 UI success confirmation, no reload; email ≤60s; KV counter incremented | T1 (increment-on-success preserved), T4 (live) |
| US-2 422 on missing/invalid field | T1 (Zod path unchanged), T4 |
| US-2 422 on body >100 KB without sending | T1 (body cap unchanged), T4 |
| US-2 429 + Retry-After on 4th POST/IP/min without calling Email Service | T1 (rate-limit guard precedes send), T4 |
| US-2 non-2xx / missing creds → 500 send_failed + console.error + no counter increment | T1 (helper Error mapping; `put` only after success), T4 (forced failure) |
| US-3 `resend` absent from package.json; no resend/RESEND_API_KEY refs; build exits 0 | T1 (PROTECTED removal + grep + build gate) |
| US-3 CLAUDE.md updated | T3 |
| US-4 CF_EMAIL_API_TOKEN secret + CF_ACCOUNT_ID set; no literals committed; RESEND_API_KEY removed | T2 (dashboard) + T1 (env-only reads) |

## Risks & Mitigations

- **Beta REST contract differs from the assumed `{from,to,subject,text}` body** → T1 confirms against live docs before commit; send isolated in `sendContactEmail` (ADR-03) so only the body-builder changes; fail closed on any non-2xx.
- **Workers Paid plan not active** (hard blocker, RD-4) → T2 confirms before T4 cutover; if not active, stop and escalate (the live form stays on its current 500 until resolved — no regression introduced by code).
- **Sender-domain verification gap** → T2 verifies `awsome.co.nz` for *sending* (distinct from inbound Email Routing) before T4.
- **Dependency-removal build break** → grep-first, `npm install` to refresh lockfile, then full build gate in T1; PROTECTED edit needs human approval.
- **Token over-scoped** → T2 creates an email-send-only scoped token.
- **`console.error` semantics (RD-7)** → both diagnostics preserved via the single logged `Error`; reviewer (T5) confirms fail-closed and that the missing-creds and non-2xx causes are both logged.

## Open Questions

1. **RESOLVED — body schema is flat.** The live REST reference confirms a flat `{ to, from, subject, html, text, headers? }` body (no `personalizations[]`). The only residual is whether `text`-only (no `html`) is accepted — a T1 verification step, not a design unknown. If `html` is required, T1 adds a minimal HTML field. (Blocks the code, not the design.)
2. **RESOLVED — RD-7.** Decided in ADR-03: the helper returns `Error | null`, the single `console.error` logs the cause, and the two diagnostics are the two distinct error messages (missing-creds; non-2xx with status+body). Not deferred to the coder.
3. **`wrangler.toml` name alignment** (RD-6) — include the cosmetic `awsome-nz` → `awsome-website` rename in T1, or leave as a separate chore? Default: leave out unless the human wants it bundled (keeps T1's diff to the email path). *(Cosmetic only — `deploy:cf` passes `--project-name=awsome-website`, overriding the toml `name`.)*

## Rollback Plan

Single-commit revert. The T1 change is one commit (`functions/api/contact.ts` + `package.json` + lockfile). To roll back: `git revert <T1 sha>`, `npm install` (restores `resend`), `npm run deploy:cf`. The dashboard secret/env changes (T2) are inert if unused and can be left or deleted independently. No KV, DNS (beyond verification records, which are additive and harmless), or routing changes to undo.

## Relevant file paths

- `web-app/functions/api/contact.ts` (the only app-code change; send block lines 150–185, header lines 1–8)
- `web-app/package.json` (PROTECTED — line 21 `resend` removal)
- `web-app/package-lock.json` (regenerated)
- `web-app/wrangler.toml` (optional RD-6 rename; KV binding stays)
- `web-app/src/data/contact.ts` (unchanged — reference for field parity)
- `CLAUDE.md` (T3 docs update)

## Review history

- **`plan-reviewer` — round 1 — 2026-06-02 — verdict: REQUEST_CHANGES**
  - **Factual spot-check**: all line-number/Env/Resend/console.error/KV/body-cap/rate-limit/422-500/field-parity claims verified against the code — PASS. Reviewer additionally researched the live Cloudflare docs.
  - **BLOCKING**: T3 named only ~2 CLAUDE.md edits but there are **5** Resend references (lines 7, 24, 25, 61, 88) — T3 would have failed its own "no remaining Resend" gate. → **Fixed**: T3 now enumerates all five with before→after, and the gate is a zero-match grep.
  - **SHOULD-FIX 1**: the REST-contract uncertainty was misdirected (speculated a SendGrid `personalizations[]` schema that doesn't exist for this endpoint). → **Fixed**: rewrote the uncertainty flag — flat body is corroborated; the real T1 verification is `text`-only vs `html`-required.
  - **SHOULD-FIX 2**: `lines[]` builder was wrongly called "byte-identical" (it's re-pointed to `fields.*`). → **Fixed**: removed from the byte-identical set; described as logically identical / re-pointed, with an explicit reviewer note.
  - **SHOULD-FIX 3**: RD-7 ("two diagnostics") was punted to the coder. → **Fixed**: resolved decisively in ADR-03 (helper returns `Error`; two distinct error messages; both logged + fail closed).
  - **NICE-TO-HAVE**: redundant `tsc --noEmit` across `build`+`typecheck` (kept for DoD parity); RD-6 rename reasoning confirmed sound; endpoint string confirmed correct. No action.
  - **Resolution**: all BLOCKING + SHOULD-FIX folded in. No change altered task sequencing or AC coverage (T3's *scope* expanded but its task identity/order is unchanged), so a re-run is optional rather than required; flagged for the human to decide.
