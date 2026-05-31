# Skill: Vue 3 + TypeScript + Vite + Storybook

**Stack**: TypeScript (strict) · Vue 3 Composition API · Vite · Node.js LTS · Storybook 8 · Vitest 4 · Pinia · Zod  
**Trigger**: Creating or modifying components, composables, stores, services, API clients, or Storybook stories in a Vue/TS/Vite project  
**Owner**: Frontend team  
**Last reviewed**: 2026-05-31

---

## Purpose

This skill teaches agents the exact file structure, naming conventions, code templates, and anti-patterns for a Vue 3 + TypeScript + Vite project with Storybook for component documentation. Load this skill before creating any UI component, composable, Pinia store, or Storybook story. It ensures consistency across AI-generated and human-written code.

---

## When to Use This Skill

- Creating a new Vue component and/or its Storybook story
- Writing a new composable (`use*` hook)
- Adding a Pinia store
- Creating a service (API client, external integration)
- Adding Zod schemas and inferred types
- Writing Vitest unit tests for any of the above

## When NOT to Use This Skill

- Pure utility functions with no Vue dependency — just write them in `src/utils/`
- Infrastructure, CI, or config changes — refer to `CLAUDE.md` → Do Not Touch
- Backend/Node.js-only code — create a separate backend skill

---

## Source Layout

```
src/
├── components/     # Presentational only. Props in, events out. No fetching, no stores.
├── composables/    # use* hooks. ALL business logic lives here.
├── stores/         # Pinia stores. State + actions only.
├── services/       # API clients, side effects, external integrations.
├── types/          # Shared Zod schemas + z.infer types.
├── utils/          # Pure functions. No Vue imports, no store imports.
└── views/          # Route-level components. Compose components + composables.

stories/            # Storybook stories (co-located alternative: src/components/*.stories.ts)
```

---

## Patterns

### 1. Vue Component

**File location**: `src/components/<ComponentName>.vue`  
**Naming**: PascalCase, one component per file  
**Rule**: Presentational only — no direct API calls, no store reads (pass data as props)

```vue
<!-- src/components/UserCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  userId: string
  displayName: string
  avatarUrl?: string
  isActive?: boolean
}

interface Emits {
  (e: 'select', userId: string): void
  (e: 'dismiss'): void
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
})
const emit = defineEmits<Emits>()

const initials = computed(() =>
  props.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2),
)
</script>

<template>
  <article
    class="user-card"
    :class="{ 'user-card--active': isActive }"
    @click="emit('select', userId)"
  >
    <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
    <span v-else class="user-card__initials" aria-hidden="true">{{ initials }}</span>
    <p>{{ displayName }}</p>
    <button @click.stop="emit('dismiss')">Dismiss</button>
  </article>
</template>
```

---

### 2. Storybook Story

**File location**: `src/components/<ComponentName>.stories.ts` (co-located) or `stories/<ComponentName>.stories.ts`  
**Naming**: Match the component filename exactly  
**Rule**: One story file per component. Cover: Default, edge cases (long names, missing avatar), interactive states.

```typescript
// src/components/UserCard.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3'
import UserCard from './UserCard.vue'

const meta: Meta<typeof UserCard> = {
  title: 'Components/UserCard',
  component: UserCard,
  tags: ['autodocs'],
  argTypes: {
    onSelect: { action: 'selected' },
    onDismiss: { action: 'dismissed' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    userId: 'user-1',
    displayName: 'Jane Doe',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    isActive: false,
  },
}

export const Active: Story = {
  args: {
    ...Default.args,
    isActive: true,
  },
}

export const NoAvatar: Story = {
  args: {
    userId: 'user-2',
    displayName: 'John Smith',
    isActive: false,
  },
}

export const LongName: Story = {
  args: {
    userId: 'user-3',
    displayName: 'Alexandra Konstantinopoulou-Papadimitriou',
    isActive: false,
  },
}
```

---

### 3. Composable

**File location**: `src/composables/use<Name>.ts`  
**Naming**: `use` prefix, camelCase  
**Rule**: Returns `{ state: readonly<...>, actions }`. Never expose raw writable refs. All business logic goes here — not in components.

```typescript
// src/composables/useUserProfile.ts
import { ref, readonly, computed } from 'vue'
import { UserProfileSchema, type UserProfile } from '@/types/user'
import { userService } from '@/services/userService'
import { useToast } from '@/composables/useToast'

export function useUserProfile(userId: string) {
  const profile = ref<UserProfile | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const displayName = computed(() => profile.value?.displayName ?? 'Unknown')

  async function fetchProfile() {
    isLoading.value = true
    error.value = null
    try {
      const raw = await userService.getById(userId)
      profile.value = UserProfileSchema.parse(raw) // validate at boundary
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load profile'
      useToast().show({ type: 'error', message: error.value })
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State — readonly so callers can't mutate directly
    state: {
      profile: readonly(profile),
      isLoading: readonly(isLoading),
      error: readonly(error),
      displayName,
    },
    // Actions — explicit mutations
    actions: { fetchProfile },
  }
}
```

---

### 4. Pinia Store

**File location**: `src/stores/<name>Store.ts`  
**Naming**: `use<Name>Store`, defined with setup syntax  
**Rule**: State + actions only. No side effects in state setters. Side effects go in actions.

```typescript
// src/stores/authStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AuthUserSchema, type AuthUser } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<AuthUser | null>(null)
  const isAuthenticated = computed(() => currentUser.value !== null)

  function setUser(raw: unknown) {
    currentUser.value = AuthUserSchema.parse(raw)
  }

  function clearUser() {
    currentUser.value = null
  }

  return { currentUser, isAuthenticated, setUser, clearUser }
})
```

---

### 5. Zod Schema + Inferred Type

**File location**: `src/types/<domain>.ts`  
**Rule**: Define the Zod schema first. Export the inferred type. Import the type everywhere — import the schema only where validation happens (service boundaries, form handlers).

```typescript
// src/types/user.ts
import { z } from 'zod'

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(120),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
  role: z.enum(['admin', 'member', 'viewer']),
  createdAt: z.coerce.date(),
})

export type UserProfile = z.infer<typeof UserProfileSchema>
```

---

### 6. Service (API Client)

**File location**: `src/services/<domain>Service.ts`  
**Rule**: All HTTP calls live here. Returns raw data — validation happens in the composable that calls it. Never import from stores inside a service.

```typescript
// src/services/userService.ts
import { AppError } from '@/utils/AppError'

const BASE = import.meta.env.VITE_API_BASE_URL

async function getById(userId: string): Promise<unknown> {
  const res = await fetch(`${BASE}/users/${userId}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  })
  if (!res.ok) {
    throw new AppError(`GET /users/${userId} failed: ${res.status}`, { statusCode: res.status })
  }
  return res.json()
}

async function updateProfile(userId: string, payload: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new AppError(`PATCH /users/${userId} failed: ${res.status}`)
  return res.json()
}

export const userService = { getById, updateProfile }
```

---

### 7. Vitest Unit Test

**File location**: `src/<module>/__tests__/<Name>.test.ts` or alongside the file as `<Name>.test.ts`  
**Rule**: Test behavior, not implementation. Mock the network with MSW (not by stubbing `fetch`). Test error paths.

```typescript
// src/composables/__tests__/useUserProfile.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useUserProfile } from '@/composables/useUserProfile'
import { server } from '@/test/msw/server'
import { http, HttpResponse } from 'msw'

describe('useUserProfile', () => {
  it('fetches and validates the profile', async () => {
    const { state, actions } = useUserProfile('user-1')

    await actions.fetchProfile()
    await flushPromises()

    expect(state.profile.value?.displayName).toBe('Jane Doe')
    expect(state.isLoading.value).toBe(false)
    expect(state.error.value).toBeNull()
  })

  it('sets error state on API failure', async () => {
    server.use(http.get('*/users/user-1', () => HttpResponse.error()))

    const { state, actions } = useUserProfile('user-1')
    await actions.fetchProfile()
    await flushPromises()

    expect(state.profile.value).toBeNull()
    expect(state.error.value).not.toBeNull()
  })
})
```

---

## Checklist

Before handing off a component + story to the reviewer:

- [ ] Component is in `src/components/`, PascalCase filename
- [ ] `defineProps<Props>()` typed — no `PropType<>` casts
- [ ] `defineEmits<Emits>()` typed
- [ ] No store reads or API calls inside the component template/script
- [ ] Storybook story covers Default, at least one edge case, and interactive states
- [ ] Story has `tags: ['autodocs']`
- [ ] Composable returns `{ state: readonly<...>, actions }` — no bare refs
- [ ] Service validates nothing; composable validates at boundary with Zod
- [ ] Unit tests cover happy path + at least one error path
- [ ] `pnpm typecheck && pnpm lint && pnpm test --reporter=ai` all pass
- [ ] `pnpm storybook build` has no errors

---

## Anti-Patterns

| ❌ Don't | ✅ Do instead |
|---|---|
| `fetch()` inside a component `<script setup>` | Put API calls in `src/services/`, call from composable |
| `const store = useAuthStore()` inside a component that's "presentational" | Pass data as props; let the parent/view read the store |
| `ref<any>()` or `as unknown as Foo` | Define a Zod schema in `src/types/`, use `z.infer<>` |
| Options API (`export default { data() {...} }`) | `<script setup lang="ts">` always |
| Storybook story with only one `Default` story | Add edge cases: empty, loading, error, long content |
| Returning bare refs from composables (`return { profile, isLoading }`) | Wrap in readonly: `return { state: { profile: readonly(profile) }, actions }` |
| Relative imports (`../../components/UserCard.vue`) | Use `@/` alias (`@/components/UserCard.vue`) |
| Inline `fetch` validation (`if (!data.id) throw`) | Use `UserProfileSchema.parse(data)` at the composable boundary |
| `console.log` in committed code | Use the project logger (`import { logger } from '@/utils/logger'`) |

---

## Related Skills

Add links to other skills in this project when they exist:

- `.claude/skills/vue-routing/SKILL.md` — Vue Router patterns (create if needed)
- `.claude/skills/pinia-persistence/SKILL.md` — persisted store patterns (create if needed)
- `.claude/skills/msw-fixtures/SKILL.md` — MSW handler conventions (create if needed)
