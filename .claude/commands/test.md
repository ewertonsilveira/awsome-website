---
description: Generate or extend tests for a target module via the tester subagent.
argument-hint: <path/to/file-or-module>
---

Target: $ARGUMENTS

1. Invoke the `tester` subagent with the target path.
2. The tester will:
   - Read existing tests for the target
   - Read the implementation to identify branches and error paths
   - Generate a test matrix (happy / boundary / error / concurrency / security)
   - Add missing tests in the existing style
3. After the tester reports back, run:
   ```bash
   pnpm test --reporter=ai --coverage $ARGUMENTS
   ```
4. Present the coverage delta to the user.
5. Flag any new flaky tests detected.

Do NOT modify the implementation in this command, even if the tester finds it untestable. File a follow-up instead.
