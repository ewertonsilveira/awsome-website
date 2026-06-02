---
description: Open (or update) a GitHub PR from the current branch by delegating to the pr-publisher subagent. Reuses the /pr-prep body if present; generates one first if not.
argument-hint: [optional: SPEC-YYYY-NN] [--draft] [--base <branch>] [--title "..."]
---

Args: $ARGUMENTS

You are opening a pull request for the current branch. You do NOT run `gh` yourself — you hand the mechanical delivery to the `pr-publisher` subagent. Your job is to assemble its inputs and relay its result.

1. **Parse args**: optional SPEC ID (e.g. `SPEC-2026-02`), `--draft`, `--base <branch>` (default: repo main branch), `--title "..."` (optional override).

2. **Pre-flight (fail fast, before spawning anything):**
   - `git status --porcelain` must be empty. If there are uncommitted changes, STOP and tell the user to commit them (per CLAUDE.md "one clean commit per task") — do NOT commit on their behalf.
   - `git rev-parse --abbrev-ref HEAD` must NOT be the base branch. If it is, STOP.
   - `git log <base>..HEAD --oneline` must be non-empty.

3. **Ensure a PR body exists:**
   - If `.git/PR_DESCRIPTION.md` exists, use it.
   - If not, run the `/pr-prep` skill first (passing the SPEC ID if given) to generate `.git/PR_DESCRIPTION.md`, then continue.

4. **Invoke the `pr-publisher` subagent** with: base branch, head branch, body path (`.git/PR_DESCRIPTION.md`), title override (if any), and the `--draft` flag (if given). Let it push the branch and run `gh pr create`/`gh pr edit`.

5. **Relay** the subagent's result to the user: the PR URL, created-vs-updated, base←head, and draft state. If the subagent stopped (dirty tree, no remote, no body), surface its failure report verbatim — do not retry blindly.

Notes:
- This skill never merges, never force-pushes, never edits the body's substance (that's `/pr-prep`), and never commits.
- Quality sign-off is `/review`'s job — run it before this if you haven't.
