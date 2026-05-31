---
description: Run an adversarial critic + security pass on the current branch before opening a PR.
argument-hint: [optional: SPEC-YYYY-NN to anchor the review]
---

Spec context: $ARGUMENTS

1. Determine the diff: `git diff main...HEAD` (or the project's main branch name).
2. Run gates one final time:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test --coverage
   ```
3. Invoke `reviewer` subagent on the diff, anchored to the spec if provided.
4. In parallel, if the diff touches auth/input/secrets/deps/network/files, invoke `security-auditor` subagent.
5. Aggregate both reports into a single structured output:
   ```markdown
   # Pre-PR Review

   ## Verdict (worst of the two)
   APPROVE | REQUEST_CHANGES | BLOCK

   ## Critic Findings
   <reviewer output>

   ## Security Findings
   <security-auditor output, if invoked>

   ## Recommended Next Step
   - If BLOCK: fix Critical items, re-run /review
   - If REQUEST_CHANGES: fix Important items if accepting risk is not justified
   - If APPROVE: run /pr-prep
   ```
6. Do NOT auto-fix findings. The developer decides which to address.
