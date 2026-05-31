# Agent Skills

Skills are focused instruction files that teach AI agents **how to work with a specific pattern, tool, or technology** in this repo. They supplement the main `CLAUDE.md` with deep, concrete knowledge about one specific area.

---

## What Is a Skill?

A skill is a `SKILL.md` file inside `.claude/skills/<skill-name>/`. Agents load it on demand when they need to create or modify something that falls within that skill's domain. Think of it as a micro-playbook: not general conventions, but exact patterns, templates, and anti-patterns for one specific thing.

**Examples of what a skill covers:**
- How to create a Vue component and its Storybook story in this repo
- How to add a new API endpoint in this FastAPI project
- How to write a gRPC service handler in Go
- How to scaffold a new pytest fixture suite

**Skills are NOT:**
- General coding standards (those go in `CLAUDE.md`)
- Architecture decisions (those go in `specs/`)
- One-off instructions (give those directly in the prompt)

---

## Skill Directory Structure

```
.claude/
└── skills/
    ├── README.md                          ← this file
    ├── <skill-name>/
    │   └── SKILL.md                       ← the skill definition
    └── example-vue-ts-vite-storybook/
        └── SKILL.md                       ← example skill for Vue/TS/Vite/Storybook
```

---

## SKILL.md Format

Every `SKILL.md` must follow this structure:

```markdown
# Skill: <Name>

**Stack**: <which branch / language / framework this skill applies to>
**Trigger**: <when should an agent load this skill — what tasks, file types, or keywords signal it>
**Owner**: <team or person responsible for keeping this skill current>
**Last reviewed**: <date>

---

## Purpose

<2-4 sentences explaining what this skill covers and why it exists.>

---

## When to Use This Skill

- <Scenario 1: e.g., "Creating a new UI component">
- <Scenario 2: e.g., "Adding a Storybook story for an existing component">

## When NOT to Use This Skill

- <Scenario where a different skill or the main CLAUDE.md applies>

---

## Patterns

### <Pattern Name>

<Explanation of the pattern — why it exists, what it enforces.>

**File location**: `src/<where this type of file lives>`
**Naming convention**: `<naming rule>`

\`\`\`<language>
<canonical template / example code>
\`\`\`

---

## Checklist

Before handing off, verify:
- [ ] <Item 1>
- [ ] <Item 2>

---

## Anti-Patterns

| ❌ Don't | ✅ Do instead |
|---|---|
| <Bad pattern> | <Good pattern> |

---

## Related Skills

- `.claude/skills/<other-skill>/SKILL.md`
```

---

## How to Add a New Skill

1. Create `.claude/skills/<skill-name>/SKILL.md` following the format above.
2. Keep skills **narrow and concrete** — one skill per pattern/toolchain area.
3. Include real code templates the agent can copy, not just descriptions.
4. Add anti-patterns so the agent knows what to avoid.
5. Reference the skill in `CLAUDE.md` → **Skills** section so agents know it exists.
6. Review and update skills quarterly, or whenever the underlying tool/pattern changes.

---

## Skill Index

> Update this table when you add a new skill.

| Skill | Stack | Trigger |
|---|---|---|
| `example-vue-ts-vite-storybook` | Vue 3 + TypeScript + Vite + Storybook | Creating UI components, stories, composables, services |

Add your stack's skills here after branching.
