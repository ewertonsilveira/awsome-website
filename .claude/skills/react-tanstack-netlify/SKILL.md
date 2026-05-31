# Skill: React 19 + TanStack Start + Tailwind v4 + Netlify

**Stack**: React 19 + TanStack Start (static prerender) + TanStack Router + Tailwind CSS v4 + Netlify Forms
**Trigger**: Creating/modifying routes, presentational components, the contact form, or Netlify/prerender configuration in `web-app/`
**Owner**: SPEC-2026-01
**Last reviewed**: 2026-05-31

---

## Purpose

This skill covers the four key patterns in the AWSome Painting & Decorating site:
1. **File-based routes** — adding/modifying pages in `web-app/src/routes/`
2. **Presentational components** — building reusable React + Tailwind v4 components in `web-app/src/components/`
3. **Netlify Forms** — wiring the contact form so Netlify detects it at build time
4. **Static prerender + Netlify deploy** — configuring TanStack Start to emit fully static HTML to `dist/client`

---

## When to Use This Skill

- Adding a new page/route
- Building a new reusable UI component
- Editing the contact form or its validation
- Changing `app.config.ts`, `netlify.toml`, or the prerender setup

## When NOT to Use This Skill

- General TypeScript conventions → see `CLAUDE.md` → Conventions
- Architecture decisions (should this be a component vs inline JSX?) → escalate to `@architect`

---

## Pattern 1 — File-Based Route (Page)

TanStack Router discovers routes from files in `web-app/src/routes/`. The `routeTree.gen.ts` is regenerated automatically — never hand-edit it.

**File location**: `web-app/src/routes/<name>.tsx`
**Naming convention**: lowercase, matching the URL path (e.g., `about.tsx` → `/about`)
**Special files**: `__root.tsx` (shell), `index.tsx` (`/`), `$.tsx` (catch-all 404)

```tsx
// web-app/src/routes/services.tsx
import { createFileRoute } from '@tanstack/react-router'
import { SectionHeading } from '~/components/SectionHeading'
import { services } from '~/data/services'

export const Route = createFileRoute('/services')({
  component: ServicesPage,
})

function ServicesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <SectionHeading>Our Services</SectionHeading>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>
    </main>
  )
}
```

**Root route shell** (`__root.tsx`) — wraps all pages:

```tsx
// web-app/src/routes/__root.tsx
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Header } from '~/components/Header'
import { Footer } from '~/components/Footer'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  )
}
```

**Catch-all 404** (`$.tsx`):

```tsx
// web-app/src/routes/$.tsx
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/$')({
  component: NotFoundPage,
})

function NotFoundPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p className="text-gray-600">The page you're looking for doesn't exist.</p>
      <Link to="/" className="text-brand underline">
        Back to home
      </Link>
    </main>
  )
}
```

---

## Pattern 2 — Presentational Component

All components in `web-app/src/components/` are presentational: **props in, callbacks out, no side-effects**.

**File location**: `web-app/src/components/<Name>.tsx`
**Naming convention**: PascalCase filename = PascalCase component name

```tsx
// web-app/src/components/ServiceCard.tsx
interface ServiceCardProps {
  service: {
    id: string
    title: string
    description: string
    icon?: string
  }
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
      <p className="mt-2 text-sm text-gray-600">{service.description}</p>
    </article>
  )
}
```

```tsx
// web-app/src/components/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-lg px-5 py-2.5 font-semibold transition'
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-brand',
    secondary: 'border border-brand text-brand hover:bg-brand/10',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
```

**Business content** goes in `web-app/src/data/`, not in components:

```ts
// web-app/src/data/services.ts
export const services = [
  { id: 'painting', title: 'Painting', description: 'Interior and exterior painting...' },
  { id: 'decorating', title: 'Decorating', description: 'Expert decorating solutions...' },
  // ...
] as const

// web-app/src/data/business.ts
export const BUSINESS = {
  name: 'AWSome Painting & Decorating',
  email: 'john@awsome.co.nz',
  phone: '0210616499',
  address: '5 Patutu Grove, Trentham, 5018, Upper Hutt',
  facebook: 'https://www.facebook.com/awsome.co.nz',
  since: 1993,
} as const
```

---

## Pattern 3 — Netlify Forms (Contact Form)

**Critical constraint**: the `<form>` MUST be present in the prerendered (static) HTML. Netlify scans the deployed HTML at build time — if the form is rendered only on the client (e.g., inside a `useEffect`), Netlify will not detect it.

Required attributes: `name="contact"`, `method="POST"`, `data-netlify="true"`, hidden `form-name` input, honeypot field.

```tsx
// web-app/src/components/ContactForm.tsx
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '~/components/Button'

const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
})

type ContactFormValues = z.infer<typeof ContactSchema>
type FieldErrors = Partial<Record<keyof ContactFormValues, string>>

export function ContactForm() {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    const result = ContactSchema.safeParse(data)

    if (!result.success) {
      e.preventDefault()
      const fieldErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ContactFormValues
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    // Valid — let the native POST proceed to Netlify
    setErrors({})
  }

  if (submitted) {
    return (
      <div role="alert" className="rounded-lg bg-green-50 p-6 text-green-800">
        <p className="font-semibold">Thanks! We'll be in touch soon.</p>
      </div>
    )
  }

  return (
    // IMPORTANT: these attributes must be present in the static HTML for Netlify detection
    <form
      name="contact"
      method="POST"
      data-netlify="true"
      netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5"
    >
      {/* Required hidden inputs for Netlify Forms */}
      <input type="hidden" name="form-name" value="contact" />
      <p className="hidden">
        <label>
          Don't fill this out: <input name="bot-field" />
        </label>
      </p>

      <FormField
        label="Name"
        name="name"
        required
        error={errors.name}
        autoComplete="name"
      />
      <FormField
        label="Email"
        name="email"
        type="email"
        required
        error={errors.email}
        autoComplete="email"
      />
      <FormField
        label="Phone (optional)"
        name="phone"
        type="tel"
        error={errors.phone}
        autoComplete="tel"
      />

      <div>
        <label htmlFor="service" className="block text-sm font-medium text-gray-700">
          Service (optional)
        </label>
        <select
          id="service"
          name="service"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="">Select a service...</option>
          <option value="painting">Painting</option>
          <option value="decorating">Decorating</option>
          <option value="tiling">Tiling</option>
          <option value="plastering">Plastering</option>
          <option value="wallpapering">Wallpapering</option>
          <option value="spray">Spray</option>
          <option value="waterblasting">Waterblasting</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Message / project details <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          aria-required="true"
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        {errors.message && (
          <p id="message-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.message}
          </p>
        )}
      </div>

      <Button type="submit" variant="primary">
        Get a Free Quote
      </Button>
    </form>
  )
}

// Reusable field — always associates label + error via aria-describedby
function FormField({
  label,
  name,
  type = 'text',
  required = false,
  error,
  autoComplete,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  error?: string
  autoComplete?: string
}) {
  const errorId = `${name}-error`
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
```

---

## Pattern 4 — Static Prerender + Netlify Config

**`web-app/app.config.ts`** — TanStack Start static prerender config:

```ts
// web-app/app.config.ts
import { defineConfig } from '@tanstack/react-start/config'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  tsr: {
    // Prerender all discovered routes to static HTML
    prerender: {
      enabled: true,
    },
  },
  vite: {
    plugins: [tsConfigPaths()],
  },
})
```

> **Note**: The exact prerender API depends on the installed `@tanstack/react-start` version. The architect MUST confirm the API for the installed version (see FU-02 in the spec) before the coder implements it. Check the package's changelog or source for `prerender` config options.

**`web-app/netlify.toml`** — corrected, relative paths, security headers:

```toml
[build]
  command   = "npm run build"
  publish   = "dist/client"

[dev]
  command   = "npm run dev"
  port      = 3000

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options            = "DENY"
    X-Content-Type-Options     = "nosniff"
    Referrer-Policy            = "strict-origin-when-cross-origin"
    # CSP: extend here when adding fonts, analytics, reCAPTCHA (see FU-04/FU-05 in spec)
    Content-Security-Policy    = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'"
```

> CSP notes: `style-src 'unsafe-inline'` is needed for Tailwind's injected styles in v1. `form-action 'self'` permits the Netlify Forms same-origin POST. Tighten when a nonce or hash-based CSP is added later.

---

## Checklist

Before handing off a route or component task:
- [ ] `npm run build` in `web-app/` exits 0 (Vite build + `tsc --noEmit`)
- [ ] `npm run format:check` passes (Prettier)
- [ ] All `<img>` elements have meaningful `alt` text (empty `alt=""` only for decorative images)
- [ ] All form fields have associated `<label>` elements (matching `htmlFor` / `id`)
- [ ] Form errors use `aria-invalid` + `aria-describedby` pointing to the error element
- [ ] Navigation active link uses TanStack Router `activeProps` (not manual class logic)
- [ ] TanStack Router devtools are guarded: `{import.meta.env.DEV && <TanStackRouterDevtools />}`
- [ ] No `routeTree.gen.ts` in the diff (it's auto-generated; if it changed, that's expected — don't manually edit)
- [ ] No secrets or API keys committed
- [ ] `netlify.toml` uses relative `publish = "dist/client"` (no absolute paths)

---

## Anti-Patterns

| ❌ Don't | ✅ Do instead |
|---|---|
| Render `<form data-netlify>` inside a `useEffect` or client-only component | Render the form in the route component so it appears in prerendered HTML |
| Hard-code business copy (phone, email, address) in JSX | Put it in `src/data/business.ts` and import |
| Use `pnpm exec vue-tsc` or `pnpm run` | Use `npm run` from `web-app/` |
| Hand-edit `routeTree.gen.ts` | Let TanStack Router regenerate it — just run `npm run dev` or `npm run build` |
| Use `style={{ color: 'red' }}` for theming | Use Tailwind utility classes; define brand tokens in `app.css` |
| Use `any` to silence TypeScript | Fix the type; use `z.infer<>` for Zod-derived types |
| Import with `../../components/Button` | Import with `~/components/Button` |
| Include absolute paths in `netlify.toml` (e.g. `/opt/build/repo/...`) | Use relative `publish = "dist/client"` |
| Add `@ts-ignore` or `as unknown as X` | Fix the underlying type error |

---

## Related Skills

- `CLAUDE.md` → Conventions (TypeScript rules, naming, import alias)
- `specs/SPEC-2026-01-awsome-painting-netlify-site.md` → FR-03 (forms), FR-05 (prerender), FR-06 (netlify.toml), NFR-02 (a11y), NFR-05 (security headers)
