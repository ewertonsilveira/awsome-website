# Design: AWSome Painting & Decorating — Marketing Site (SPEC-2026-01)

**Spec**: [SPEC-2026-01-awsome-painting-netlify-site.md](SPEC-2026-01-awsome-painting-netlify-site.md)
**Status**: Approved
**Author**: architect subagent
**Reviewed by**: reviewer subagent (2026-05-31) — adversarial critic pass; all findings folded in (see Review history)
**Created**: 2026-05-31

---

## Review history

The `reviewer` subagent did an adversarial critic pass on this design before approval. Verdict: sound, with fixes applied:

- **B1 (blocking)** — ADR-02/§6 disagreed on the form POST target (`/` vs `/contact`). Unified on `action="/"` for both the JS `fetch` and the no-JS native submit.
- **B2 (blocking)** — `new URLSearchParams(formData as any)` would break `tsc --noEmit` (AC-08) and violate the no-`any` rule. Replaced with a typed body built from the Zod-parsed `ContactValues`.
- **S1** — direct-hit 404 servability wasn't owned by a task. ADR-06 now mandates verifying `dist/client/404.html` (T2) with a `status=404` redirects fallback (T3).
- **S2** — CSP framing made dropping `script-src 'unsafe-inline'` look likely; it isn't (inline hydration-state script). Reframed as the expected, necessary baseline.
- **S3** — Prettier devDependency now explicitly pre-authorized by the Approved spec (NFR-04).
- **S4 / nits** — preserve `source('../')` in `app.css`; `z.email()` (not deprecated `z.string().email()`); `Button` typed as a discriminated union, not an intersection.

---

## 1. Context & Scope

We are turning the bare `start-tailwind-v4` TanStack scaffold under `web-app/` into a fully static, prerendered React 19 marketing site for AWSome Painting & Decorating, deployed to Netlify via Git CD with a Netlify Forms contact form. There is no SSR runtime, no backend, no database, and no secrets in the deployed output (`web-app/dist/client`).

**In scope (v1):** three content pages — Home (`/`), About (`/about`), Contact (`/contact`) — plus a catch-all 404; a shared shell (header with mobile nav + footer); a Netlify-detectable contact form with client-side Zod validation and graceful no-JS degradation; corrected `netlify.toml`; CSP and security headers; dev-only router devtools; and a `CLAUDE.md` refresh.

**Explicitly deferred (out of scope v1):** dedicated `/services` and `/projects` routes (do NOT create `services.tsx` or `projects.tsx`); the home page surfaces a short inline services highlight only. No tests, no ESLint, no husky, no analytics, no reCAPTCHA, no i18n.

**Approach over alternatives:** static full-route prerender (not SSR, not SPA-shell-only) so every route — including the 404 and the form-bearing contact page — exists as real HTML at deploy time, which is the precondition for Netlify's build-time form detection. The visual design uses copy-paste Tailwind v4 markup adapted from HyperUI-style patterns, with zero new runtime dependencies.

---

## 2. Current-state findings (scaffold delta)

### Installed versions (`web-app/package.json`)
| Package | Installed range | Spec target | Action |
|---|---|---|---|
| `@tanstack/react-start` | `^1.168.18` | static prerender | Configure prerender in Vite plugin |
| `@tanstack/react-router` | `^1.170.10` | file routes | Keep |
| `@tanstack/react-router-devtools` | `^1.167.0` | dev-only | Gate behind dev flag (T-devtools) |
| `react` / `react-dom` | `^19.0.0` | React 19 | Keep |
| `zod` | `^4.4.3` | form validation | Keep (already present — no new dep) |
| `tailwindcss` / `@tailwindcss/vite` | `^4.2.2` | Tailwind v4 | Keep |
| `tailwind-merge` | `^3.6.0` | (utility) | Keep; useful for `Button` variant merging |
| `vite` | `^8.0.14` | Vite 8 | Keep |
| `@vitejs/plugin-react` | `^6.0.1` | — | Keep |
| `typescript` | `^6.0.2` | **pin to 5.x** | Change devDependency to a `5.x` range (FU-02) |
| `@types/node` | `^22.5.4` | — | Keep |

### Config / source delta
- **`web-app/vite.config.ts`** — has `tanstackStart()`, `viteReact()`, `tailwindcss()`, port 3000, `resolve.tsconfigPaths: true`. **No prerender/SPA config.** MUST add the `prerender`/`pages` config to `tanstackStart()` to emit static HTML and avoid a deployed server. There is **no `app.config.ts`** in this TanStack Start version — all Start config lives in this Vite plugin call. The design doc and tasks must target `vite.config.ts`, NOT `app.config.ts`.
- **`web-app/package.json`** — `build` is `vite build && tsc --noEmit` (good, satisfies the build gate). There is a leftover `start: node .output/server/index.mjs` script implying an SSR server — should be removed (no server runtime). **No `format:check` script and no Prettier dependency** are present, yet AC-09/NFR-04 require `npm run format:check` to pass. Prettier must be added as a devDependency and the script added. **This devDependency is pre-authorized**: the Approved spec mandates it (NFR-04/AC-09 require `npm run format:check` to pass), which satisfies CLAUDE.md's "propose dependency additions" gate — the coder may add it in T1 without a separate chat approval, and notes it in the PR description.
- **`web-app/netlify.toml`** — machine-generated: absolute `publish = "/opt/build/repo/web-app/dist/client"`, `base = "/opt/build/repo/web-app"`, `publishOrigin`/`commandOrigin`/`headersOrigin`/`redirectsOrigin = "config"`, a `@netlify/plugin-emails` plugin + `[functions.emails]` block, `command = "vite build"` (does NOT match package.json's build+typecheck). MUST be rewritten: relative `publish = "dist/client"`, `command = "npm run build"`, drop all `*Origin` keys, drop the emails plugin/functions blocks, keep `[dev]` on port matching 3000, add NFR-05 headers. (Note: scaffold `[dev].port = 8888` / `targetPort = 3000` is Netlify Dev's proxy; we standardize on documenting Vite's 3000.)
- **`web-app/tsconfig.json`** — `strict: true`, `~/*` → `src/*` alias, `noEmit`, `moduleResolution: Bundler`. No change needed.
- **`web-app/src/router.tsx`** — `getRouter()` with `defaultPreload: 'intent'`, `scrollRestoration: true`. Keep; add `defaultNotFoundComponent` only if we choose the not-found route strategy in ADR-06.
- **`web-app/src/routes/__root.tsx`** — minimal shell: `<html>`/`<head HeadContent/>`/`<body>`, a single Home `<Link>`, **`<TanStackRouterDevtools>` rendered unconditionally** (must become dev-only — AC-14), `<Scripts/>`. MUST be expanded into the real Header + `<Outlet/>` + Footer shell and add document `<head>` meta (lang, viewport, title).
- **`web-app/src/routes/index.tsx`** — placeholder "Welcome Home!!!". MUST become the real Home page.
- **`web-app/src/routeTree.gen.ts`** — auto-generated, only knows `/`. Regenerates on dev/build when new route files are added. Never hand-edit.
- **`web-app/src/styles/app.css`** — Tailwind v4 entry; first line is `@import 'tailwindcss' source('../');` (the `source('../')` sets the content-scan root — **must be preserved** when T4 adds tokens) plus a light/dark base layer. **No brand theme tokens.** Extend here with `@theme` brand palette + typographic tokens (FR-04); do not remove or alter the `source('../')` directive.
- **`web-app/public/`** — does not exist. Create for favicon and any imagery (FU-03 supplies real images later; use lightweight placeholders/SVG in v1).
- **No `.prettierrc`** — only `.prettierignore` (already excludes `routeTree.gen.ts`, `build`, `public`). Add a `.prettierrc` so formatting is deterministic across machines.

---

## 3. ADRs

### ADR-01: Full-route static prerender via the `tanstackStart()` Vite plugin (no `app.config.ts`, no SSR server)
- **Context:** FR-05/AC-01/AC-04 require every route emitted as static HTML to `dist/client` with no server entry consumed by Netlify. The spec's "Architecture Notes" asked the architect to confirm the *exact* API for `@tanstack/react-start ^1.168`. Investigation shows this version has **no `app.config.ts`**; Start configuration is passed to `tanstackStart()` inside `web-app/vite.config.ts`, and static prerendering is enabled via the plugin's `prerender` option (`enabled: true`), optionally with an explicit `pages` array and/or `crawlLinks`.
- **Options considered:**
  1. **`prerender: { enabled: true, crawlLinks: true }` + explicit `pages` for `/`, `/about`, `/contact`, and the 404.** Pro: produces real HTML per route; explicit `pages` guarantees the contact page (with the form) and the 404 are emitted even if a link is missed; deterministic for Netlify form detection. Con: must keep the `pages` list in sync with routes (trivial at 3 pages).
  2. **SPA mode (`spa.enabled: true`) emitting only a `_shell.html`** with a Netlify `/* → /_shell.html 200` rewrite. Pro: simplest config. Con: the contact form would NOT be in per-route prerendered HTML (it'd be client-rendered into the shell), defeating Netlify build-time form detection (AC-06); a blanket 200 rewrite masks real routes and the 404 (spec explicitly warns against this in the Netlify Deployment section). **Rejected.**
  3. **Default SSR build + deploy the Nitro server to Netlify Functions.** Pro: zero prerender config. Con: violates the "no server runtime / no functions" requirement (Non-Goals, FR-05); adds cold-start and a serverless surface we don't want. **Rejected.**
- **Decision:** Option 1. Configure in `web-app/vite.config.ts`:
  ```ts
  tanstackStart({
    prerender: { enabled: true, crawlLinks: true },
    pages: [
      { path: '/' },
      { path: '/about' },
      { path: '/contact' },
    ],
  })
  ```
  `crawlLinks` follows nav links as a safety net; the explicit `pages` array pins the routes that MUST exist. The catch-all 404 route is emitted by the framework's not-found handling (verified during T2 build — see Risk R1). Remove the `start` script; deploy only `dist/client`.
- **Consequences:** No server entry is consumed in production. The exact option names (`enabled`, `crawlLinks`, `pages[].path`) MUST be re-verified by the coder against the locally installed `@tanstack/react-start@1.168.18` build output during T2 (the prerender API is new and has had churn — GitHub issues #5419, #5939); if the installed plugin rejects a key, the coder consults the installed package's types and stops after the three-strikes rule rather than guessing. Pin versions once green (FU-02).

### ADR-02: Netlify Forms strategy — statically rendered uncontrolled form with progressive client-side Zod validation
- **Context:** FR-03/AC-06/AC-07 require: (a) the `contact` form present in prerendered HTML for build-time detection; (b) native POST degradation if JS fails; (c) accessible client-side Zod validation; (d) an accessible success state. The known gotcha: a React-controlled form whose markup is generated only at runtime is invisible to Netlify's static crawler, and `data-netlify` attributes are sometimes stripped/ignored by JSX frameworks.
- **Options considered:**
  1. **Single uncontrolled native `<form>`** with `name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/"`, a hidden `<input type="hidden" name="form-name" value="contact" />`, and a hidden honeypot `bot-field`. JS adds an `onSubmit` that runs Zod, and on success POSTs `application/x-www-form-urlencoded` via `fetch` to the form's own `action` (`/`), then shows an inline success panel. With JS off, the browser performs the native POST to the same `action` and Netlify serves its default success page. Pro: one form in HTML, detected at build, degrades natively, validates client-side; the JS and no-JS paths hit the **identical** URL. Con: must be careful to keep inputs uncontrolled (use `defaultValue`/`FormData`) so static markup is complete.
  2. **A separate static hidden HTML form for detection + a controlled React form for UX.** Pro: clean separation. Con: duplication, drift risk, and the controlled form still needs the hidden `form-name`; more moving parts for no benefit at this scale. **Rejected.**
  3. **Redirect to a Netlify default thank-you page** instead of inline success. Pro: trivial. Con: full page reload, weaker UX, and loses the SPA feel; spec allows either but inline is better and still degrades. **Chosen as the no-JS fallback only**, with inline success as the JS path.
- **Decision:** Option 1. The `<form>` has `action="/"` and JS POSTs to that **same** URL — both the JS `fetch` and the no-JS native submit target `/` (the guaranteed-present `dist/client/index.html`); Netlify accepts the form POST at that path because `form-name=contact` is in the body. The `ContactForm` is presentational and **uncontrolled** for field values (read via `FormData` on submit); React state holds only validation errors and submit status (`idle | submitting | success | error`). On submit: `preventDefault`, parse `FormData` with the Zod schema; on failure set field errors (wired via `aria-invalid` + `aria-describedby`); on success build a **typed** URL-encoded body from the Zod-parsed values (no `as any` — see §6) and `await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })`, then switch to the success panel. The `<form>` always carries the static Netlify attributes so it works with JS disabled.
- **Consequences:** The form is detected at deploy (AC-06) and works without JS (FR-03). Inputs being uncontrolled means validation is on-submit (not per-keystroke) — acceptable and simpler; a future enhancement could add blur validation. Verification of detection + a real submission is a manual deploy-preview step (AC-06) and cannot be confirmed by the build gate alone — called out in Risks.

### ADR-03: Content-Security-Policy (pragmatic `script-src 'unsafe-inline'` for hydration state); documented extension points
- **Context:** NFR-05/AC-13 require a CSP whose value contains `default-src 'self'`, permits Netlify Forms (same-origin POST) and the Tailwind stylesheet, and documents future extension points (fonts, analytics, reCAPTCHA). In the **production** build Tailwind v4 is compiled to a **linked stylesheet** (`~/styles/app.css?url` in `__root.tsx` head), not inline styles, so prod `style-src 'self'` is plausible (the CSP is enforced only via the deployed `netlify.toml` headers — dev, where `@tailwindcss/vite` injects inline `<style>`, is unaffected). **However, TanStack Start serializes dehydrated router/loader state into an inline `<script>` read at hydration** (via `<Scripts/>`), so `script-src` is **expected to require `'unsafe-inline'`**, not optionally. Because this is a static deploy with no server to mint per-request nonces, and because a present `'unsafe-inline'` makes any `'nonce-'`/`'sha256-'` ignored anyway, hash/nonce approaches are not viable while also shipping inline state.
- **Options considered:**
  1. **`script-src 'self'`** only. Pro: strictest. Con: TanStack Start's inline hydration-state script would be blocked, breaking hydration/client routing. **Rejected** — the inline state script makes this infeasible.
  2. **`script-src 'self' 'unsafe-inline'`.** Pro: works with the framework's inline hydration-state script. Con: weakens script protection. The spec says avoid `'unsafe-inline'` "where practical"; for a static no-server site, scripts are author-controlled and there is no user-generated content, so the residual risk is low. **Chosen** — this is the expected, necessary baseline, not a fallback.
  3. **Hash-based `script-src 'self' 'sha256-...'`.** Pro: strict and inline-compatible in principle. Con: hashes change every build (no regeneration step in lean v1); and once `'unsafe-inline'` is present for the state script, hashes are ignored anyway. **Rejected for v1.**
- **Decision:** Ship this baseline in `netlify.toml`:
  ```
  Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
  ```
  Rationale per directive: `form-action 'self'` permits the Netlify same-origin POST; `style-src 'self'` covers the **prod** compiled Tailwind stylesheet (no inline styles in our components — Tailwind utilities only, per CLAUDE.md); `img-src 'self' data:` allows local images and inline SVG data URIs; `connect-src 'self'` allows the `fetch` POST. `script-src` keeps `'unsafe-inline'` for the framework's inline hydration-state script. **T3 verification = confirm the site hydrates with this CSP, AND inspect `dist/client` HTML to confirm `style-src 'self'` holds (no framework-emitted inline `<style>`/`style=` in prod output).** Only attempt to drop `'unsafe-inline'` from `script-src` if a build inspection shows zero inline `<script>` — which is not expected; do not burn a coder loop chasing it.
- **Extension points (documented in `netlify.toml` comments):** fonts → add host to `font-src` (+ `style-src` if using a hosted CSS); analytics → add host to `script-src` + `connect-src`; reCAPTCHA (FU-04) → add `https://www.google.com https://www.gstatic.com` to `script-src` and `frame-src`.
- **Consequences:** AA-compatible, satisfies AC-13. `'unsafe-inline'` on `script-src` is the one expected concession (driven by inline hydration state); documented and revisitable. No `frame-src` until reCAPTCHA lands.

### ADR-04: Design system — copy-paste Tailwind v4 markup + small presentational primitives, zero new runtime deps
- **Context:** FR-04 wants a modernized, cohesive look based on a free open-source Tailwind kit (HyperUI-style), with reusable presentational components. CLAUDE.md forbids new runtime UI dependencies.
- **Options considered:**
  1. **Copy-paste HyperUI-style markup into our own components** (`Hero`, `ServiceCard`, `Button`, `SectionHeading`) styled via `app.css` `@theme` tokens. Pro: zero deps, full control, matches the no-deps rule. Con: we own the markup/a11y.
  2. **Add Flowbite-React / a component library as a package.** Pro: prebuilt components. Con: new runtime dependency — violates CLAUDE.md and the spec's explicit decision. **Rejected.**
- **Decision:** Option 1. Define brand tokens in `web-app/src/styles/app.css` via Tailwind v4 `@theme` (brand color scale, accent, surface, and a typographic scale), keep the existing light/dark base, and build presentational primitives in `src/components/`. `tailwind-merge` (already installed) backs the `Button` variant class merge.
- **Consequences:** No new runtime deps. We own accessibility (AC-11) — focus rings, contrast in both themes, labelled controls — which is enforced via manual a11y verification. Content stays in `src/data/` so copy edits don't touch components.

### ADR-05: Router devtools excluded from production via a dev-only dynamic import gated on `import.meta.env.DEV`
- **Context:** FR-01/AC-14 require devtools in dev only and absent from `dist/client`. The scaffold renders `<TanStackRouterDevtools>` unconditionally in `__root.tsx`, which would ship to production.
- **Options considered:**
  1. **Render conditionally on `import.meta.env.DEV` with a lazy/dynamic import** so the devtools module is tree-shaken/code-split out of the production bundle. Pro: Vite statically eliminates the dev branch; devtools UI absent from prod output. Con: slightly more boilerplate (a small dev-only wrapper component).
  2. **`{process.env.NODE_ENV === 'development' && <Devtools/>}`.** Con: `process.env` at render time is discouraged in this static setup (CLAUDE.md "no `process.env` reads at render time"); `import.meta.env.DEV` is the Vite-native, statically-replaced flag. **Rejected.**
- **Decision:** Option 1 — a tiny `RouterDevtools` wrapper that does `const TanStackRouterDevtools = import.meta.env.DEV ? React.lazy(() => import('@tanstack/react-router-devtools').then(m => ({ default: m.TanStackRouterDevtools }))) : () => null`, rendered inside `<React.Suspense>` in `__root.tsx`. Coder verifies the prod `dist/client` chunk set contains no devtools code (AC-14).
- **Consequences:** Prod bundle is smaller and devtools-free; the dev experience is unchanged. `@tanstack/react-router-devtools` stays a (dev-time) dependency but never reaches the prod bundle.

### ADR-06: 404 handling — file-based catch-all route `$.tsx` (prerendered), not a Netlify rewrite
- **Context:** FR-02/AC-05 require a friendly prerendered 404; the spec's Netlify section warns against a blanket `/* → /index.html 200` rewrite that masks real routes.
- **Options considered:**
  1. **A TanStack catch-all route `src/routes/$.tsx`** rendering the NotFound page, included in prerender so Netlify serves real 404 HTML. Pro: matches CLAUDE.md file layout (`$.tsx`), works for direct-URL access, no rewrite hacks.
  2. **`notFoundComponent` on the root route only.** Con: covers client navigation but the static host needs an actual `404.html`/route to serve on direct hits; less explicit. **Rejected in favor of the file route**, though we may also set `defaultNotFoundComponent` to reuse the same component for unmatched client navigations.
- **Decision:** Option 1 — `src/routes/$.tsx` rendering the shared `NotFound` page, plus reusing that component as the router's `defaultNotFoundComponent`. No catch-all 200 rewrite in `netlify.toml`.
- **Two distinct 404 paths, both must work:**
  1. **Client navigation** to an unknown path (`/nope` reached via in-app link) → handled by `$.tsx` / `defaultNotFoundComponent` (T12). This is what AC-05's wording targets.
  2. **Cold direct hit** to an unknown URL (`https://site/nope` typed/linked externally) → there is **no server** to run the router, so Netlify must serve a static `404.html` itself with a 404 status. Netlify serves `dist/client/404.html` automatically **if it exists**.
- **404.html guarantee (closes the S1 gap):** Confirm during T2 that the prerender emits `dist/client/404.html`. If the installed Start version does **not** emit it from `$.tsx`/`crawlLinks`, add `{ path: '/404' }` to the prerender `pages` so a `404.html` is produced. As a last-resort fallback **only if no `404.html` can be emitted**, add a `[[redirects]]` rule in `netlify.toml` (T3) with `status = 404` (NOT 200) sending unknown paths to the 404 page — this preserves the correct status and never masks real prerendered routes.
- **Consequences:** Both 404 paths render the friendly page (AC-05) and direct hits return a real 404 status (AC-04 semantics). The `404.html` emission is verified, not assumed; the redirects fallback is owned by T3, not left in prose.

---

## 4. Component & data design

All components in `web-app/src/components/` are presentational (props in, callbacks out), functional, Tailwind-only styling, importing via `~/`.

| Component | File | Props (contract) | Notes |
|---|---|---|---|
| `Header` | `src/components/Header.tsx` | `{ navItems: NavItem[] }` | Responsive; renders business name + `MobileNav`; `<Link activeProps>` for active state |
| `MobileNav` | `src/components/MobileNav.tsx` | `{ navItems: NavItem[]; open: boolean; onToggle: () => void }` | Keyboard-operable, `aria-expanded`, Esc to close, focus management (AC-10) |
| `Footer` | `src/components/Footer.tsx` | `{ business: BusinessInfo }` | Email, phone, address, Facebook link from data |
| `Hero` | `src/components/Hero.tsx` | `{ title: string; subtitle: string; ctaLabel: string; ctaTo: string }` | Home hero + "Get a Free Quote" CTA → `/contact` |
| `SectionHeading` | `src/components/SectionHeading.tsx` | `{ eyebrow?: string; title: string; description?: string }` | Consistent section headers |
| `ServiceCard` | `src/components/ServiceCard.tsx` | `{ service: Service }` | Icon/title/description; used in Home services highlight |
| `Button` | `src/components/Button.tsx` | **Discriminated union** on `as`: `({ as?: 'button' } & ButtonHTMLAttributes) \| ({ as: 'link'; to: string } & Omit<LinkProps,'children'>)`, plus shared `variant?: 'primary'\|'secondary'\|'ghost'; size?: 'sm'\|'md'\|'lg'` | Use a **discriminated union, NOT an intersection** of anchor+button attrs (an intersection conflicts under strict and tempts an `any` cast — AC-08). Uses `tailwind-merge` for class merging; renders `<Link>` when `as='link'` |
| `ContactForm` | `src/components/ContactForm.tsx` | `{ services: Service[] }` | Netlify Forms form per ADR-02; owns local error/status state only |
| `RouterDevtools` | `src/components/RouterDevtools.tsx` | none | Dev-only wrapper per ADR-05 |

### Data constants (`web-app/src/data/`, typed `export const`)
- `src/data/business.ts` — `export const BUSINESS: BusinessInfo` with `name`, `email` (`john@awsome.co.nz`), `phone` (`0210616499`), `address` (`5 Patutu Grove, Trentham, 5018, Upper Hutt`), `facebookUrl`, `since: 1993`. Type `BusinessInfo` declared here.
- `src/data/services.ts` — `export const SERVICES: Service[]` for Tiling, Interior/Exterior, Decorating (id, title, description, optional icon). Type `Service` declared here.
- `src/data/nav.ts` — `export const NAV_ITEMS: NavItem[]` = `[{ label: 'Home', to: '/' }, { label: 'About', to: '/about' }, { label: 'Contact', to: '/contact' }]`. Type `NavItem`.
- `src/data/content.ts` (optional) — Home/About long-form copy as constants (placeholder copy; FU-03 supplies finals).

---

## 5. Route design (`web-app/src/routes/`)

- **`__root.tsx`** (MODIFY) — document shell: `<html lang="en">`, `<head>` with `HeadContent` (title, meta viewport/description), `<body>` rendering `<Header navItems={NAV_ITEMS} />`, `<main><Outlet/></main>`, `<Footer business={BUSINESS} />`, `<RouterDevtools/>` (dev-only), `<Scripts/>`. Remove the placeholder inline nav and the unconditional devtools.
- **`index.tsx`** (MODIFY) — Home: `Hero` + "Get a Free Quote" CTA, inline services highlight (`SERVICES.map(ServiceCard)`), and a "Since 1993" vision section. No `/services` route.
- **`about.tsx`** (NEW) — company story (since 1993) + why-choose-us points, composed from `SectionHeading` and data/content.
- **`contact.tsx`** (NEW) — contact details (from `BUSINESS`) + `<ContactForm services={SERVICES} />`.
- **`$.tsx`** (NEW) — catch-all 404 rendering the friendly NotFound page with a link Home (ADR-06).
- **`router.tsx`** (MODIFY, minimal) — set `defaultNotFoundComponent` to the NotFound page; keep `defaultPreload`/`scrollRestoration`.
- Do NOT create `services.tsx` or `projects.tsx`. `routeTree.gen.ts` regenerates automatically — never hand-edit.

---

## 6. API / contract details

### Contact form HTML (must be in prerendered output — ADR-02)
```
<form
  name="contact"
  method="POST"
  data-netlify="true"
  netlify-honeypot="bot-field"
  action="/"                   // same-origin POST target; JS and no-JS both POST here (ADR-02)
>
  <input type="hidden" name="form-name" value="contact" />
  <p hidden>
    <label>Don't fill this out: <input name="bot-field" /></label>
  </p>
  <!-- Name (required), Email (required, email), Phone (optional),
       Service select (optional), Message (required) — each with <label>,
       aria-invalid + aria-describedby for errors -->
</form>
```

### Zod schema (in `src/components/ContactForm.tsx` or `src/data/contact.ts`)
```ts
import { z } from 'zod'

export const ContactSchema = z.object({
  name: z.string().min(1, 'Please enter your name'),
  email: z.email('Enter a valid email'), // zod v4 top-level email (z.string().email() is deprecated in v4)
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().min(1, 'Please tell us about your project'),
})
export type ContactValues = z.infer<typeof ContactSchema>
```

**Submit path (JS on)** — type-clean, no `as any` (B2 fix, AC-08):
```ts
const result = ContactSchema.safeParse(Object.fromEntries(new FormData(form)))
if (!result.success) {
  // map result.error.issues → per-field messages (aria-invalid / aria-describedby)
  return
}
// Build a typed body from PARSED values (all string | undefined) — never the raw FormData.
const body = new URLSearchParams({ 'form-name': 'contact' })
for (const [k, v] of Object.entries(result.data)) {
  if (v !== undefined) body.set(k, v) // drops optional empty fields; no File values
}
await fetch('/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: body.toString(),
})
// set status 'success'
```
Building the body from `result.data` (typed `ContactValues`) avoids passing `FormData` (whose values can be `File`) to `URLSearchParams`, so no cast is needed and `form-name=contact` is guaranteed present. **JS off:** native browser POST to `action="/"`.

Note: zod is `^4.4.3` — use `z.email(...)` (top-level), not the deprecated `z.string().email()`. Confirm against the installed v4 types during T10.

---

## 7. Ordered task breakdown (for /implement)

Each task is one coder loop (<~200 LOC), ordered so `cd web-app && npm run build` stays green after each. A reviewer pass follows each task per CLAUDE.md.

| Task | Title | Files | Depends on | ACs | Effort |
|---|---|---|---|---|---|
| **T1** ✅ | Tooling + version pin: add Prettier + `.prettierrc` + `format:check` script; pin `typescript` to `5.x`; remove dead `start` script | `web-app/package.json`, `web-app/.prettierrc` (NEW) | — | AC-08, AC-09 | S |
| **T2** ✅ | Prerender + static config: add `prerender`/`pages` to `tanstackStart()` in `vite.config.ts`; verify `dist/client` static HTML for existing routes; confirm no server entry consumed. **Done:** `prerender: { enabled: true, crawlLinks: true }`, `pages: [{ path: '/' }]`. **`pages` scoped to `/` only** — listing not-yet-existing routes (`/about`, `/contact`, `/404`) hard-fails prerender with `Failed to fetch: Not Found`. **`404.html` emission moved to T12** (requires `$.tsx`); `dist/server/` is a build artifact, not deployed. | `web-app/vite.config.ts` | T1 | AC-01, AC-04 | M |
| **T3** ✅ | `netlify.toml` rewrite: relative `publish="dist/client"`, `command="npm run build"`, drop `*Origin`/emails plugin/functions, `[dev]` port, NFR-05 headers + CSP (ADR-03) with documented extension points; `status=404` `[[redirects]]` fallback (NOT 200). **Done:** hand-authored config, all 4 NFR-05 headers + verbatim ADR-03 CSP, machine cruft removed. **`base = "web-app"`** set (publish resolves to `web-app/dist/client`). **Deploy-only gates (→ T15 checklist):** (a) hydration-under-CSP + prod HTML has no inline `<style>` (style-src 'self'); (b) Netlify site UI **base directory must = `web-app`** or the config isn't discovered. **The `/* → /404` redirect target dangles until T12 emits `404.html`** (harmless: no loop, no route masking — Netlify serves static files before redirects). | `web-app/netlify.toml` | T2 | AC-12, AC-13 | M |
| **T4** ✅ | Theme tokens: extend `app.css` with `@theme` brand palette + typographic scale (light/dark, AA contrast). **Done:** additive `@theme` block — `brand` (blue, 50–950) + `accent` (amber, 50–950) scales, system font stacks, leading/tracking tokens; base layer extended with body font/leading, a `:focus-visible` ring (brand-500) + **`@media (prefers-color-scheme: dark)`** override (brand-300) matching the repo's media-query dark strategy (NOT a `.dark` class), and heading defaults. `source('../')` + original base rules preserved. Reviewer APPROVED (dead `.dark` selector, misleading `using-mouse` comment, and inaccurate contrast figures all folded in). | `web-app/src/styles/app.css` | T1 | AC-11(partial) | S |
| **T5** ✅ | Data layer: `business.ts`, `services.ts`, `nav.ts` (+ optional `content.ts`) with types. **Done:** four pure typed data modules — `BUSINESS: BusinessInfo`, `SERVICES: Service[]` (Tiling, Interior/Exterior, Decorating — no 4th, no services route), `NAV_ITEMS: NavItem[]` (Home/About/Contact only), and `content.ts` placeholder copy (FU-03 supplies finals). Build + format gates green; reviewer APPROVED (no Critical/Important — nits only: `Interior/Exterior` carries the display label "Interior/Exterior Painting"; optional `icon` left unpopulated for T8). **Deviation:** the data files were committed bundled in `62370ea` ("better sec checks", alongside the `.claude/` protection edit) rather than as a standalone `feat [T5]` commit; reviewer pass was run post-commit. | `web-app/src/data/*.ts` | T1 | FR-01, FR-02 content | S |
| **T6** ✅ | Primitives: `Button`, `SectionHeading` (+ `tailwind-merge` for Button). **Done:** `Button` is a genuine discriminated union (`ButtonButton | ButtonLink`) narrowed via `as === 'link'`; variants primary/secondary/ghost + sizes sm/md/lg; `tailwind-merge` class merging; focus rings AC-11. `SectionHeading` eyebrow/title/h2/description with full dark: pairings. Build + format gates green; reviewer APPROVED (no Critical/Important — latent `noUnusedLocals` fragility in destructure pattern noted but not a defect). | `web-app/src/components/Button.tsx`, `SectionHeading.tsx` | T4 | AC-11 | S |
| **T7** ✅ | Shell — devtools split + Header/MobileNav/Footer; rewrite `__root.tsx`; dev-only `RouterDevtools` (ADR-05). **Done:** `RouterDevtools` dev-gated via `import.meta.env.DEV` + `React.lazy` (AC-14 verified — package absent from `dist/client`); `__root.tsx` rewritten to `<html lang>` + head meta + `Header`/`<main>`/`Footer`/`RouterDevtools`/`Scripts` shell (AC-02/AC-03); `Header` owns mobile-open state; `MobileNav` is an accessible disclosure — `aria-expanded`/`aria-controls`, Esc-closes-and-restores-focus, focus-into-first-link-on-open, and (reviewer-driven AC-10 hardening) a `matchMedia` breakpoint reset, focus-out dismissal for Tab-past-last-link, outside-pointer dismissal, and a suppression-ref so an outside focusable click toggles exactly once. Reviewer APPROVED after two passes (1st: 2 Critical + 1 Important AC-10 gaps folded in; 2nd: confirmed resolved, flagged a double-toggle regression which was then fixed; final fix verified by orchestrator against all interaction paths + gates). **Deviation:** `web-app/vite.config.ts` was also edited (outside the listed files) to set `crawlLinks: false` — the new Header links to not-yet-existing `/about` and `/contact`, which `crawlLinks: true` would crawl and hard-fail prerender (T2 failure mode). **T9 MUST re-enable `crawlLinks: true` once `/about` exists.** | `web-app/src/components/Header.tsx`, `MobileNav.tsx`, `Footer.tsx`, `RouterDevtools.tsx`, `src/routes/__root.tsx` (+ `vite.config.ts` deviation) | T5, T6 | AC-02, AC-03, AC-10, AC-14 | L |
| **T8** ✅ | Home page: `Hero`, `ServiceCard`, inline services highlight, "Since 1993" section; rewrite `index.tsx`. **Done:** `Hero` (title/subtitle/CTA via `Button as="link"`) on a `bg-brand-700`/`dark:bg-brand-900` band; `ServiceCard` (title/description, optional-`icon` guarded); `index.tsx` composes Hero + `SectionHeading` + responsive `ul` grid of `SERVICES` cards + "Since 1993" vision section (`VISION_PARAGRAPH`, `BUSINESS.since`), page sections only (shell from `__root.tsx` — verified one `<h1>`/`<header>`/`<footer>` in prerendered HTML). **Deviation:** `web-app/src/components/Button.tsx` was also edited (outside the listed files) — **necessary, T8 is the first consumer of `as="link"`**: T6's `ButtonLink` intersection collapsed `to` to the registered-route union, so `to="/contact"` (unregistered until T11) failed `tsc`; fixed by `Omit<…,'to'>` + explicit `to: string` and a single honest boundary cast `to={to as LinkProps['to']}` (bridges incremental route registration; a cast-free spread provably does not compile). Reviewer found 1 Critical (Hero CTA was `variant="secondary"` = brand-700 text on brand-700 bg, ~1:1 contrast, AC-11 fail) — fixed by adding a reusable `inverse` Button variant (`bg-white text-brand-700`, ~8.6:1 on brand-700 / ~10.5:1 on brand-900) and switching the Hero CTA to it. **Note:** `HERO_TITLE` is a const in `index.tsx` (reviewer nit: could move to `content.ts`); `ServiceCard` icon branch is forward-compat (no `SERVICES` entry sets `icon` yet). | `web-app/src/components/Hero.tsx`, `ServiceCard.tsx`, `src/routes/index.tsx` (+ `Button.tsx` deviation) | T7 | AC-02, AC-03, NFR-01 | M |
| **T9** | About page. **Also add `{ path: '/about' }` to `pages` in `web-app/vite.config.ts` and verify `dist/client/about/index.html` is emitted** (T2 scoped `pages` to `/` only; `crawlLinks` is a safety net, not a guarantee — the build does NOT fail if a route is added but unlinked). **T7 set `crawlLinks: false`** (Header links to `/about`+`/contact` would crawl-fail prerender before those routes existed) — once `/about` exists here, you MAY re-enable `crawlLinks: true`, but only after `/contact` (T11) also exists, else the crawler hard-fails on the still-missing `/contact`. Safer to leave `crawlLinks: false` and rely on explicit `pages` until T11. | `web-app/src/routes/about.tsx`, `web-app/vite.config.ts` | T7 | AC-03 | S |
| **T10** | Contact form (ADR-02): `ContactForm` + Zod schema + uncontrolled form + a11y errors + success state | `web-app/src/components/ContactForm.tsx`, `src/data/contact.ts` | T6, T7 | AC-06, AC-07, AC-11 | L |
| **T11** | Contact page composition (details + form). **Also add `{ path: '/contact' }` to `pages` in `web-app/vite.config.ts` and verify `dist/client/contact/index.html` is emitted** | `web-app/src/routes/contact.tsx`, `web-app/vite.config.ts` | T10 | AC-03, AC-06 | S |
| **T12** | 404 catch-all `$.tsx` + `defaultNotFoundComponent` in `router.tsx`. **Inherits the S1/AC-05 direct-hit ownership from T2: add `{ path: '/404' }` to `pages` in `web-app/vite.config.ts` (now possible because `$.tsx` exists) and explicitly confirm `dist/client/404.html` is emitted** (ADR-06). **Also re-verify the T3 `/* → /404` `status=404` redirect now serves the friendly 404 body** (its target was dangling until this task) | `web-app/src/routes/$.tsx`, `src/router.tsx`, `web-app/vite.config.ts` | T7 | AC-05 | S |
| **T13** | `CLAUDE.md` population: replace placeholder Stack/Layout/Conventions/Testing sections with real React/TanStack/Tailwind details | `CLAUDE.md` (repo root) | T2, T3 | AC-15 | S |
| **T14** | Final pass: run `npm run build && npm run format:check`; verify devtools absent from `dist/client`; pin remaining versions (FU-02) | build artifacts only | all above | AC-01, AC-08, AC-09, AC-14 | S |
| **T15** | **[reviewer]** Adversarial critic pass on the full diff + manual-verification checklist for deploy-preview-only ACs. **Deploy checklist must include:** Netlify site UI **base directory = `web-app`** (else `netlify.toml` isn't discovered — T3 note); live `/` returns the 4 NFR-05 headers (AC-13); `/nope` serves the friendly 404 body with status 404 (post-T12) | — | T14 | AC-06, AC-11, AC-13 (deploy) | M |

**AC coverage map:** AC-01→T2/T14; AC-02→T7/T8; AC-03→T7/T8/T9/T11/T12; AC-04→T2; AC-05→T12 (404.html emission + direct-hit ownership moved from T2 to T12; T3 redirects fallback is the interim guarantee); AC-06→T10/T11/T15(deploy); AC-07→T10; AC-08→T1/T14; AC-09→T1/T14; AC-10→T7; AC-11→T4/T6/T8/T10/T15; AC-12→T3; AC-13→T3/T15(deploy); AC-14→T7/T14; AC-15→T13. Every AC maps to at least one task.

---

## 8. Risks & open follow-ups

**Risks**
- **R1 — Prerender API drift (`@tanstack/react-start@1.168.18`).** The `prerender`/`pages` keys are new and have churned (GitHub #5419, #5939). *Mitigation:* T2 verifies against the installed plugin types and `dist/client` output before later tasks build on it; apply three-strikes and escalate if the API differs.
- **R2 — Netlify can't detect a client-only form.** *Mitigation:* ADR-02 keeps the form uncontrolled and statically present; confirm on a deploy preview (AC-06) before relying on it — this is a manual gate the build cannot prove.
- **R3 — CSP breaks Tailwind or hydration.** *Mitigation:* ADR-03 starts permissive on `script-src` only, tightens after verifying hydration; `style-src 'self'` validated against the linked Tailwind stylesheet.
- **R4 — 404 not emitted by prerender.** *Mitigation:* ADR-06/T2 verify the 404 HTML is produced; fall back to an explicit `pages` entry.
- **R5 — Prettier introduced as a (dev) dependency.** Mandated by NFR-04/AC-09 but is a new dep; justify in the PR description per CLAUDE.md (it is a tooling, not runtime, dependency).

**Carried follow-ups (from spec):**
- **FU-01** — rename branch `create-ts-vue-app` → React-appropriate name (coordinate with Netlify-linked branch). Cosmetic, deferred.
- **FU-02** — pin Vite/TanStack/TS versions once the build is verified green (closed by T14).
- **FU-03** — real hero/about copy and project images supplied by owner post-first-deploy; v1 uses placeholders.
- **FU-04** — reCAPTCHA if honeypot proves insufficient (needs CSP `script-src`/`frame-src` additions — extension point documented in T3).
- **FU-05** — custom domain / analytics owner-managed; analytics needs a CSP revision.

---

## 9. Rollback plan

Each task is a single conventional commit referencing SPEC-2026-01; revert the offending commit and let Netlify redeploy the previous green build. If a prerender/config change (T2/T3) breaks the deploy, revert `vite.config.ts`/`netlify.toml` to the prior commit — the static `dist/client` from the last good build remains the live deploy until the next push.

---

## Sources

- [Static Prerendering — TanStack Start React Docs](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering)
- [SPA mode — TanStack Start React Docs](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)
- [TanStack Start on Netlify — Netlify Docs](https://docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start/)
- [TanStack Start `prerender` errors without sitemap enabled — Issue #5419](https://github.com/TanStack/router/issues/5419)
- [TanStack Start prerender error — Issue #5939](https://github.com/TanStack/router/issues/5939)
