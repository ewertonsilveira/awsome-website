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
5. After the coder reports back, run the gates:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test --reporter=ai
   ```
6. If gates pass: invoke `tester` subagent to harden the test suite.
7. If gates fail and the coder hit three strikes: stop, surface the escalation report to the user, do NOT loop.
8. Update the task as completed in the design doc.
9. Suggest next step: `/implement <SPEC> T<N+1>` or `/review` if all tasks done.

The coder only touches files in the task's "Touched Files" list. If it needs more, it must stop and ask.
