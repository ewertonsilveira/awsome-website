---
description: Generate the PR title, description, risk summary, and rollback plan from the current branch.
argument-hint: [optional: SPEC-YYYY-NN]
---

Spec: $ARGUMENTS

1. Get the diff: `git diff main...HEAD`
2. Get the commit list: `git log main..HEAD --oneline`
3. Read the spec and design (if SPEC ID provided) for context.
4. Produce a PR description in this exact format:

```markdown
## What
<2-4 sentences. What changed, in user-visible terms.>

## Why
<Reference the spec / ticket. The business/technical reason.>

## How
<2-5 bullets on the technical approach. Mention any ADRs.>

## Risks
- <Risk>: <mitigation already in place>
- <Risk>: <accepted because ...>

## Testing
- [ ] Unit tests: <count added, count modified>
- [ ] Integration tests: <covered scenarios>
- [ ] E2E tests: <covered flows>
- [ ] Manual verification: <steps performed, or "N/A">

## Rollback Plan
<Single command or steps to revert safely. e.g., "revert this commit; no data migration to undo.">

## Checklist
- [ ] Spec acceptance criteria met
- [ ] Tests pass locally (`pnpm test`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Security review completed (or N/A)
- [ ] Docs updated (or N/A)
- [ ] No new high/critical `pnpm audit` findings
- [ ] No new top-level dependencies (or justified above)

## Linked
- Spec: SPEC-XXXX
- Ticket: <link>
- Related PRs: <links>
```

5. Save to `.git/PR_DESCRIPTION.md` and print to chat.
6. Suggest the user copy it into the PR body (or use `gh pr create --body-file .git/PR_DESCRIPTION.md`).
