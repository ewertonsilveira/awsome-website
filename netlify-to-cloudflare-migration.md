# Netlify → Cloudflare Pages Migration Guide

## Stack

```text
Language:        TypeScript 5.x (strict mode)
Framework:       React 19
Meta-framework:  TanStack Start (STATIC PRERENDER only)
Router:          TanStack Router
Styling:         Tailwind CSS v4
Build tool:      Vite 8
Validation:      Zod
Contact form:    Netlify Forms
Package manager: npm
Runtime:         Node.js v24.3.0
Current Host:    Netlify
Target Host:     Cloudflare Pages
```

---

## Migration Impact Assessment

| Feature | Netlify | Cloudflare Pages |
|----------|----------|----------|
| Static hosting | ✅ | ✅ |
| Git deployments | ✅ | ✅ |
| CDN | ✅ | ✅ |
| Custom domains | ✅ | ✅ |
| Headers | ✅ | ✅ |
| Redirects | ✅ | ✅ |
| Forms | ✅ | ❌ |
| Serverless functions | ✅ | ✅ |

### What requires changes?

1. Static site hosting → No changes
2. TanStack Start → No changes
3. Vite build → No changes
4. Tailwind → No changes
5. Headers → Migrate `_headers`
6. Redirects → Migrate `_redirects`
7. Netlify Forms → Must be replaced

---

# Cloudflare Deploy Script

Create:

```bash
scripts/deploy-cloudflare.sh
```

```bash
#!/usr/bin/env bash

set -euo pipefail

echo "Installing dependencies..."
npm ci

echo "Type checking..."
npx tsc --noEmit

echo "Building application..."
npm run build

echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist/client \
  --project-name=my-project \
  --commit-dirty=true

echo "Deployment complete."
```

Make executable:

```bash
chmod +x scripts/deploy-cloudflare.sh
```

---

# Install Wrangler

```bash
npm install --save-dev wrangler
```

---

# package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "deploy:cf": "./scripts/deploy-cloudflare.sh"
  }
}
```

Deploy:

```bash
npm run deploy:cf
```

---

# Cloudflare Pages Build Settings

```yaml
Framework preset: None
Build command: npm run build
Build output directory: dist/client
Root directory: /
Node version: 24
```

Production branch:

```yaml
main
```

---

# wrangler.toml

```toml
name = "my-project"

compatibility_date = "2026-06-01"
```

---

# Headers Migration

Move:

```text
_headers
```

to:

```text
public/_headers
```

Example:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
```

---

# Redirects Migration

Move:

```text
_redirects
```

to:

```text
public/_redirects
```

Example:

```text
/old-page /new-page 301
```

---

# Replace Netlify Forms

Current:

```html
<form
  name="contact"
  method="POST"
  data-netlify="true"
>
```

Cloudflare ignores:

```html
data-netlify="true"
```

## Option A (Recommended)

Use Formspree:

```html
<form
  action="https://formspree.io/f/xxxxx"
  method="POST"
>
```

No backend required.

## Option B

Create a Cloudflare Worker endpoint:

```text
POST /api/contact
```

Use Resend or Mailgun for email delivery.

---

# GitHub Actions Deployment

```yaml
name: Deploy Cloudflare Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24

      - run: npm ci

      - run: npm run build

      - run: |
          npx wrangler pages deploy dist/client \
            --project-name=my-project
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

# Recommended Final Architecture

```text
GitHub
   ↓
Cloudflare Pages
   ↓
TanStack Start (Static)
   ↓
dist/client

Forms:
Contact Page
   ↓
Formspree

DNS:
Cloudflare
```

