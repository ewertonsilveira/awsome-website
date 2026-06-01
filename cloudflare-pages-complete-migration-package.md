# Cloudflare Pages Migration Package
## For React 19 + TanStack Start (Static Prerender) + Vite 8 + TypeScript 5

---

# 1. Migration Checklist

## Pre-Migration

- [ ] Confirm application is fully static (no SSR runtime)
- [ ] Confirm build output is `dist/client`
- [ ] Commit all changes to Git
- [ ] Backup Netlify configuration
- [ ] Export environment variables from Netlify
- [ ] Review `_headers`
- [ ] Review `_redirects`
- [ ] Inventory all Netlify Forms

---

## Cloudflare Setup

- [ ] Create Cloudflare account
- [ ] Connect GitHub repository
- [ ] Create Cloudflare Pages project
- [ ] Select production branch (`main`)
- [ ] Configure build settings

### Build Settings

```yaml
Framework preset: None
Build command: npm run build
Build output directory: dist/client
Root directory: /
Node version: 24
```

---

## DNS

- [ ] Add custom domain
- [ ] Verify SSL certificates
- [ ] Enable HTTPS redirect
- [ ] Enable Brotli compression

---

## Static Assets

- [ ] Verify images load correctly
- [ ] Verify fonts load correctly
- [ ] Verify generated routes work
- [ ] Verify SPA navigation

---

## Forms

Choose one:

- [ ] Formspree
- [ ] Cloudflare Worker + Resend
- [ ] Other form provider

---

## Security

- [ ] Migrate `_headers`
- [ ] Enable security headers
- [ ] Verify CSP policy

---

## Post Migration

- [ ] Smoke test production
- [ ] Verify Lighthouse score
- [ ] Verify analytics
- [ ] Remove Netlify deployment hooks
- [ ] Disable Netlify site

---

# 2. Production-Ready wrangler.toml

For Pages projects this remains intentionally small.

```toml
name = "my-project"

compatibility_date = "2026-06-01"

[vars]
NODE_ENV = "production"
```

If you later add Workers:

```toml
name = "my-project"

main = "worker/index.ts"

compatibility_date = "2026-06-01"

[vars]
NODE_ENV = "production"
```

---

# Recommended _headers

Create:

```text
public/_headers
```

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

# Recommended _redirects

Create:

```text
public/_redirects
```

Example:

```text
/old-page /new-page 301
/legacy / 301
```

---

# 3. Netlify Forms → Cloudflare Forms Migration

## Current Netlify Form

```tsx
<form
  name="contact"
  method="POST"
  data-netlify="true"
>
```

Remove:

```tsx
data-netlify="true"
```

---

## Option A: Formspree

### React Component

```tsx
export function ContactForm() {
  return (
    <form
      action="https://formspree.io/f/your-form-id"
      method="POST"
      className="space-y-4"
    >
      <input
        name="name"
        type="text"
        required
      />

      <input
        name="email"
        type="email"
        required
      />

      <textarea
        name="message"
        required
      />

      <button type="submit">
        Send
      </button>
    </form>
  );
}
```

---

## Option B: Cloudflare Worker + Resend

### Install

```bash
npm install resend
```

---

### Worker

```ts
import { Resend } from "resend";

export default {
  async fetch(request: Request) {
    const resend = new Resend(
      env.RESEND_API_KEY
    );

    const body = await request.json();

    await resend.emails.send({
      from: "website@example.com",
      to: "owner@example.com",
      subject: "New Contact Form",
      html: `
        <p>${body.name}</p>
        <p>${body.email}</p>
        <p>${body.message}</p>
      `,
    });

    return Response.json({
      success: true,
    });
  },
};
```

---

### React Submit

```tsx
await fetch("/api/contact", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(values),
});
```

---

# Recommended Form Architecture

```text
React Form
    ↓
Cloudflare Worker
    ↓
Resend
    ↓
Your Email Inbox
```

Advantages:

- No vendor lock-in
- Better spam control
- Full ownership
- Type-safe integration

---

# 4. GitHub Actions Workflow

Create:

```text
.github/workflows/deploy.yml
```

```yaml
name: Deploy Cloudflare Pages

on:
  push:
    branches:
      - main

  workflow_dispatch:

concurrency:
  group: production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install Dependencies
        run: npm ci

      - name: Type Check
        run: npm run typecheck

      - name: Build
        run: npm run build

      - name: Deploy
        run: |
          npx wrangler pages deploy dist/client \
            --project-name=my-project
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

# Recommended package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "deploy:cf": "wrangler pages deploy dist/client --project-name=my-project"
  }
}
```

---

# Final Recommended Architecture

```text
GitHub
   │
   ▼
GitHub Actions
   │
   ▼
Cloudflare Pages
   │
   ▼
React 19
TanStack Start
Vite 8
Static Prerender

Contact Form
   │
   ▼
Cloudflare Worker
   │
   ▼
Resend

Custom Domain
   │
   ▼
Cloudflare DNS
```
