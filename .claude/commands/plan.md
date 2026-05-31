---
description: Convert an approved spec into a technical design + ordered task list. Invokes the architect subagent.
argument-hint: <SPEC-YYYY-NN>
---

You are starting the Design phase. The spec to plan is: $ARGUMENTS

1. Read `specs/$ARGUMENTS-*.md`. If status is not "Approved", stop and ask the user to approve it first.
2. Invoke the `architect` subagent with the spec content.
3. The architect will scan the codebase, then produce a design doc with ADRs and a task breakdown.
4. Save the design to `specs/$ARGUMENTS-design.md`.
5. Present the design file to the user.
6. Summarize the task count and estimated effort.
7. Remind the user: "Approve this design, then run `/implement $ARGUMENTS T1` to start the coder loop."

Do NOT touch source code in this command.
