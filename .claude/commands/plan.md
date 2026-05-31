---
description: Convert an approved spec into a technical design + ordered task list. Invokes the architect subagent.
argument-hint: <SPEC-YYYY-NN>
---

You are starting the Design phase. The spec to plan is: $ARGUMENTS

1. Read `specs/$ARGUMENTS-*.md`. If status is not "Approved", stop and ask the user to approve it first.
2. Invoke the `architect` subagent with the spec content.
3. The architect will scan the codebase, then produce a design doc with ADRs and a task breakdown. Save it to `specs/$ARGUMENTS-design.md`.
   1. **Design review (gate):** Invoke the `plan-reviewer` subagent with the spec ID ($ARGUMENTS) to run an adversarial critic pass on the saved design — AC coverage, factual claims about the codebase, ADR soundness, task sequencing, contradictions, and convention violations. Fold its BLOCKING and SHOULD-FIX findings back into `specs/$ARGUMENTS-design.md`, and record a short "Review history" note in the design. If any BLOCKING finding changed the design materially, re-run `plan-reviewer` once to confirm.
4. Present the design file to the user.
5. Summarize the task count and estimated effort, and note the plan-reviewer verdict + what was fixed.
6. Remind the user: "Approve this design, then run `/implement $ARGUMENTS T1` to start the coder loop."

Do NOT touch source code in this command.
