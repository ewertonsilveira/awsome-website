---
description: Execute a single task from a design's task breakdown via the coder subagent.
argument-hint: <SPEC-YYYY-NN> <T1|T2|...>
---

You are executing a single task. Arguments: $ARGUMENTS

1. Parse the spec ID and task ID from arguments.
2. Read `specs/<SPEC>-design.md` and locate the task block (e.g., "T1").
3. Confirm with the user that:
   - The design is approved
   - This is the next task in order (or get explicit approval to skip)
4. Invoke the `coder` subagent with:
   - The task description
   - The "Touched Files" list
   - The spec ID for context
5. **Quality gates** — after the coder reports back, run the stack's gates from `web-app/`:
   ```bash
   npm run build          # vite build + tsc --noEmit  → typecheck
   npm run format:check   # Prettier                   → lint/format gate
   ```
   Both MUST exit 0. Then **run the app to confirm it actually works** (not just that it compiles): start the dev server / preview the built output and smoke-check the routes or behaviour the task touched (use the `/run` or `/verify` skill). Add and run unit tests **only if the task or design calls for them** — v1 has no automated test suite (see CLAUDE.md → Testing Rules); "test if required" only.
6. If a gate fails and the coder hit three strikes on the same root cause: stop, surface the escalation report to the user, do NOT loop.
7. **Reviewer gate** (mirrors the `plan` phase's plan-reviewer gate) — invoke the `reviewer` subagent with the spec ID + task ID to run an adversarial critic pass on **this task's diff**: logic/contract correctness, spec & AC coverage, CLAUDE.md convention violations, and any out-of-scope edits. Fold its Critical / Important findings back in by re-invoking the `coder` (do NOT let the reviewer fix its own findings — that's a conflict of interest), then re-run the gates in step 5. Re-review once if a Critical finding changed the diff materially.
8. Update the task as completed in the design doc — mark it ✅ and note any deviations from the design.
9. **Commit** — once the gates pass AND the reviewer approves, create a single Conventional Commit referencing the SPEC (e.g. `feat(scope): summary [T2]` with `Implements SPEC-YYYY-NN` in the body). Include the implementation diff and the design-doc update. This leaves a **clean working tree for the next `/implement`** task. (Branch first if somehow on the default branch; never commit to `main`.)
10. Suggest next step: `/implement <SPEC> T<N+1>` or `/review` if all tasks are done.

The coder only touches files in the task's "Touched Files" list. If it needs more, it must stop and ask.
