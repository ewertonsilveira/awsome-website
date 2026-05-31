---
description: Generate a Spec-Kit-style specification from a vague ticket or idea. Invokes the requirements-analyst subagent.
argument-hint: <one-line description or ticket URL>
---

You are starting the Spec phase of the SDLC. The user input is:

$ARGUMENTS

1. Invoke the `requirements-analyst` subagent with the user's input.
2. If the user input is too vague to spec directly, the analyst will ask 3-7 grouped clarifying questions. Surface those questions to the user via AskUserQuestion.
3. Once the analyst produces a draft spec, save it to `specs/SPEC-YYYY-NN-<slug>.md` (auto-increment NN).
4. Present the spec file to the user with `mcp__cowork__present_files`.
5. Remind the user: "Approve this spec, then run `/plan SPEC-YYYY-NN` to produce the design."

Do NOT proceed to architecture or coding in this command.
