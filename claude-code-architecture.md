# Claude Code — Internal Architecture & Workflow Reference

> **Purpose:** Research reference for integrating Claude Code into AI-assisted SDLC workflows.
> **Generated:** May 2026 | **Author:** Claude (Anthropic)

---

## Quick Links — Official Documentation

| Resource | URL |
|---|---|
| Claude Code overview | https://docs.claude.com/en/docs/claude-code/overview |
| How Claude Code works | https://code.claude.com/docs/en/how-claude-code-works |
| Agent loop (official) | https://platform.claude.com/docs/en/agent-sdk/agent-loop |
| Agent SDK overview | https://platform.claude.com/docs/en/agent-sdk/overview |
| Claude Code docs map | https://docs.anthropic.com/en/docs/claude-code/claude_code_docs_map.md |
| MCP introduction | https://modelcontextprotocol.io/introduction |
| Anthropic product page | https://www.anthropic.com/product/claude-code |

---

## Further Reading — Deep Dives

| Resource | URL |
|---|---|
| Inside Claude Code's Architecture (DEV.to) | https://dev.to/oldeucryptoboi/inside-claude-codes-architecture-the-agentic-loop-that-codes-for-you-cmk |
| Claude Code Architecture (Penligent, tools/memory/hooks/MCP) | https://www.penligent.ai/hackinglabs/inside-claude-code-the-architecture-behind-tools-memory-hooks-and-mcp/ |
| Claude Code Workflow Guide (TrueFoundry) | https://www.truefoundry.com/blog/claude-code-workflow-guide |
| Claude Code Orchestration & Dynamic Workflows (Ken Huang) | https://kenhuangus.substack.com/p/claude-code-orchestration-dynamic |
| 5 Claude Code Workflow Patterns (MindStudio) | https://www.mindstudio.ai/blog/claude-code-agentic-workflow-patterns |
| Agentic Workflows with Claude — Architecture Patterns (Medium) | https://medium.com/@reliabledataengineering/agentic-workflows-with-claude-architecture-patterns-design-principles-production-patterns-72bbe4f7e85a |
| Claude Code & Architecture of Autonomous Software Engineering (Catalaize) | https://catalaize.substack.com/p/claude-code-and-the-architecture |
| Dive into Claude Code — Systematic Analysis (VILA-Lab, GitHub) | https://github.com/VILA-Lab/Dive-into-Claude-Code |
| Dive into Claude Code — Full PDF Report | https://zhiqiangshen.com/projects/Claude_Code_Report/Claude_Code_Report.pdf |
| Claude Agent SDK — Agent Loops & Tool Calls (Augment Code) | https://www.augmentcode.com/guides/claude-agent-sdk-agent-loops-tool-calls |
| Claude Managed Agents — Onboarding Guide (GitHub) | https://github.com/az9713/claude-managed-agents |
| Ink — React renderer for CLIs (used by Claude Code terminal UI) | https://github.com/vadimdemedes/ink |

---

## The Core Idea: An Agentic Loop, Not a Chatbot

### What it is

Claude Code is not a chatbot with a code plugin. It is an **agentic loop** — a `while` loop that calls the model, runs tools, feeds results back, and repeats until the task is complete or a stop condition is met.

The mental model shift is critical:

| Chatbot | Agentic Loop |
|---|---|
| Responds once per message | Loops autonomously until done |
| Has no tools | Has 26+ tools: files, shell, search, subagents |
| Forgets after each turn | Accumulates context across all turns |
| User drives every step | Agent self-directs; human sets the objective |
| Produces text | Produces *actions with observable side effects* |

This is why Claude Code maps directly onto your **Workflow 5 — Autonomous Coding Agent**: the loop *is* the mechanism that reads the ticket, reads the codebase, creates a plan, implements code, runs tests, fixes failures, and generates the PR — all without a human steering each step.

### The three-phase macro loop

At the highest level, Anthropic describes each task as cycling through three phases repeatedly until complete:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   ① GATHER CONTEXT  →  ② TAKE ACTION  →  ③ VERIFY  │
│          ▲                                   │      │
│          └───────────── loop back ───────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**① Gather context** — Read files, search the codebase, fetch tickets, inspect test failures. The agent builds a mental model of the current state before deciding anything.

**② Take action** — Write code, run shell commands, edit files, spawn subagents. Actions always have observable side effects in the real environment.

**③ Verify results** — Run tests, check build output, lint, inspect diffs. The result of verification becomes the new context for the next gather phase.

This is the same feedback loop that a skilled engineer runs mentally on every task — Claude Code just makes it explicit, automated, and auditable.

### Why this matters for your SDLC workflows

Your **Agentic SDLC** pipeline maps to this loop at the macro level:

```
Requirements Agent → Architecture Agent → Planning Agent → Coding Agent → Testing Agent → Review Agent
```

Each of those agents is itself running its own internal gather → act → verify loop. The loop is fractal — it operates at the task level, the feature level, and the pipeline level simultaneously.

The key insight from your document's **Agentic Engineering Maturity Model** is that as you move from Level 3 → Level 4 → Level 5, you are not adding new tools — you are extending how long and how autonomously the loop runs before requiring human approval. The loop architecture stays the same; what changes is the trust boundary.

### How the loop differs from a one-shot LLM call

A standard LLM API call (e.g., calling `claude-sonnet-4-6` directly) is stateless and single-pass: you send a prompt, you get a response, done. The agentic loop wraps that call in infrastructure:

- **State accumulation** — every tool result is appended to the context, building a growing record of what has happened
- **Self-correction** — if a test fails, the failure output re-enters the loop as new context, and the model revises its approach
- **Tool-driven grounding** — the model cannot hallucinate a file's contents because it reads the actual file; it cannot guess a test result because it runs the actual test
- **Stopping criteria** — the loop has explicit exit conditions (no more tool calls, max turns reached, human interruption) rather than running indefinitely

This is the foundation of why autonomous coding agents can handle multi-step tasks that a one-shot prompt cannot.

### Research directions for your AI workflow agent

> The following prompts are designed to be fed directly into a research agent to deepen this section.

- `Research: how does the Claude Code agentic loop handle error recovery — what happens when a tool call fails mid-loop?`
- `Research: what is the difference between a ReAct loop and the Claude Code agentic loop architecture?`
- `Research: how do other agentic coding tools (Devin, Cursor, GitHub Copilot Workspace) implement their agent loops compared to Claude Code?`
- `Research: what published benchmarks measure autonomous coding agent loop performance on real-world software engineering tasks (SWE-bench, etc.)?`
- `Research: how does extended thinking interact with the agentic loop — does the model plan before the loop starts or during each iteration?`

---

## Layer 1 — The Agentic Loop (The Engine)

The loop is implemented as a streaming pipeline. Each iteration (called a **turn**) executes five steps in strict order.

```
Turn N
  │
  ├─ Step 1: Assemble context window
  ├─ Step 2: POST to model API (SSE stream opens)
  ├─ Step 3: Detect tool_use blocks → execute each tool
  ├─ Step 4: Append tool results to conversation
  └─ Step 5: Evaluate — more tools needed? → Turn N+1 | Done? → exit
```

### Step 1: Assemble the context window

Before every model call, the loop constructs the full context window by merging sources in a defined priority order:

| Source | Content | Cached? |
|---|---|---|
| System prompt | Claude's base instructions, output style, environment info | Yes |
| Tool definitions | Schema of all available tools (built-in + MCP) | Yes |
| CLAUDE.md hierarchy | Project rules, team standards, compact instructions | Yes |
| Auto-memory | Learned preferences from `~/.claude/memory/` | Yes |
| Conversation history | All prior turns: user messages, assistant responses, tool calls, tool results | Grows each turn |
| File reads / tool outputs | Contents of files read this session, stdout from commands run | Grows each turn |
| Subagent summaries | Compressed results returned from `Task` tool calls | Grows each turn |

**Why this matters for long tasks:** The context window is finite. Every file you read and every command you run adds tokens. A large codebase can fill the context window faster than you expect, which triggers compaction (summarisation of older turns). Understanding what goes into the context window — and controlling it via `CLAUDE.md` `Compact Instructions` — is the primary lever for keeping long autonomous sessions coherent.

**Prompt caching:** Sources that don't change between turns (system prompt, tool definitions, CLAUDE.md) are automatically prompt-cached by Anthropic's API. This means repeated turns in a long session are significantly cheaper and faster than the first turn, because the model only needs to process the *new* content added since the last cache hit.

### Step 2: Call the model (streaming via SSE)

The assembled context is sent to the model API as a single POST request. The response is streamed back as **Server-Sent Events (SSE)** — a continuous stream of JSON chunks — rather than waiting for a complete response.

Why streaming matters architecturally:

- **Tool calls are detected mid-stream.** The moment a `tool_use` block appears in the stream, the execution pipeline starts — before the rest of the model's response has even arrived. This is why you see Claude Code begin reading a file while still "thinking."
- **Perceived responsiveness.** The terminal UI renders tokens in real time as they stream, so the user sees progress continuously rather than a long pause followed by a dump of output.
- **Multiple tool calls in one turn.** A single model response can contain several `tool_use` blocks (e.g., read file A, read file B, grep for pattern C). All of them are detected in the stream and queued for execution before the next turn begins.

The model's response can contain:
- `text` blocks — visible output, explanations, reasoning
- `tool_use` blocks — structured calls to specific tools with validated JSON arguments
- `thinking` blocks (when extended thinking is enabled) — internal reasoning the model performs before deciding what to do

### Step 3: Execute tools

Each `tool_use` block detected in the stream triggers the tool execution pipeline:

```
tool_use block received
        │
        ▼
① Zod schema validation    — are the arguments the right types/shape?
        │
        ▼
② Permission gauntlet      — 5-layer check (see Layer 3)
        │
        ├── DENY  → return error result to conversation
        ├── ASK   → pause loop, prompt user, resume on approval
        └── ALLOW ▼
③ Tool execution           — actual I/O: file read, shell run, web fetch, subagent spawn
        │
        ▼
④ Result captured          — stdout, file contents, error messages, subagent summary
        │
        ▼
⑤ UI rendered              — terminal displays result with status indicator
```

**Multiple tools per turn:** Claude can chain several tools in a single model response. The loop executes them sequentially (not in parallel within a single turn), collecting all results before proceeding to Step 4. This is efficient because it avoids multiple round-trips to the model API when several reads or searches are needed upfront.

**Self-correction via tool results:** If a tool returns an error (e.g., a test fails, a file is not found, a command exits non-zero), that error enters the conversation as a `tool_result` block. The model sees the actual error on the next turn and adjusts — it doesn't assume success. This is what makes the loop genuinely self-correcting rather than brittle.

> **SDLC relevance (Workflow 6 — AI Testing Pipeline):** The self-correction mechanism is exactly how an autonomous agent handles your "run tests → fix failures" loop. The agent doesn't need to be told the tests failed — it ran them, read the output, and the failure is already in its context for the next iteration.

### Step 4: Feed results back into the conversation

All tool results from Step 3 are appended to the conversation history as `tool_result` messages. The conversation now looks like:

```
[system prompt]
[user: "implement passwordless login"]
[assistant: tool_use → Read("src/auth/login.ts")]
[tool_result: "...file contents..."]
[assistant: tool_use → Read("src/auth/session.ts")]
[tool_result: "...file contents..."]
[assistant: tool_use → Bash("npm test -- auth")]
[tool_result: "FAIL: 3 tests failed\n  ✗ token expiry not enforced\n  ✗ ..."]
[assistant: tool_use → Edit("src/auth/login.ts", patch)]
[tool_result: "edit applied"]
... and so on
```

This accumulating conversation *is* the agent's working memory for the current task. It contains the complete audit trail of every action taken, every result observed, and every decision made. This is also why context compaction is a critical concern — as the conversation grows, older entries get summarised, which can cause the agent to lose details from early in the session.

**Design implication:** For long tasks like a full feature implementation, structure your CLAUDE.md to explicitly tell the agent what to preserve across compaction ("always preserve: the original ticket requirements, the agreed architecture decisions, the list of files modified so far").

### Step 5: Stop or continue

After all tool results have been collected, the loop evaluates whether to continue:

| Condition | Outcome |
|---|---|
| Model response contains one or more `tool_use` blocks | → Execute tools, feed results, loop to next turn |
| Model response is pure text (no tool calls) | → Loop exits, response displayed to user |
| `max_turns` limit reached (Agent SDK setting) | → Loop exits with a max-turns error |
| Human interrupts (Ctrl+C or `/stop`) | → Loop exits immediately |
| Permission denied and mode requires human approval | → Loop pauses, waits for human input |

The exit condition of "no tool calls in the response" is the model's own signal that it has completed the task. This is not a hard-coded rule — the model decides when it has done enough, which is why well-scoped prompts produce cleaner exits than vague, open-ended ones.

### The loop in the context of your Autonomous Coding Agent (Workflow 5)

Your Workflow 5 describes these steps:
1. Reads ticket → `WebFetch` or MCP Jira tool
2. Reads codebase → `Glob` + `Read` (multiple files)
3. Creates plan → model reasoning (text block, no tools)
4. Implements code → `Edit` or `Write`
5. Creates tests → `Write`
6. Runs tests → `Bash`
7. Fixes failures → `Edit` (triggered by test failure in tool result)
8. Generates PR → `Bash` (`git` commands) or MCP GitHub tool

Every one of those eight steps is a turn (or several turns) in the agentic loop. The loop runs all of them autonomously because each step's output feeds directly into the next turn's context as a tool result. No human intervention is needed between steps — only at the final human review gate.

### Research directions for your AI workflow agent

> The following prompts are designed to be fed directly into a research agent to deepen this section.

- `Research: what is the maximum number of turns a Claude Code agentic loop can run before context compaction occurs on a 200K context window model?`
- `Research: how does SSE streaming in the Anthropic API affect tool call latency compared to non-streaming responses?`
- `Research: what techniques do production agentic coding systems use to keep context window usage low across long autonomous sessions?`
- `Research: how does the Claude Code loop handle concurrent tool execution — are tool_use blocks from a single turn ever parallelised?`
- `Research: what is the role of extended thinking (thinking blocks) in the agentic loop — does it replace or supplement the gather→act→verify macro loop?`
- `Research: compare the stop condition design of Claude Code's loop to OpenAI Agents SDK and LangGraph — how do they each decide when an agent task is complete?`

---

## Layer 2 — The Tool System

~26 built-in tools. Every tool implements the same interface:
- An **input schema** (validated with Zod before execution)
- A **permission check** (returns: allow / deny / ask)
- **Execution logic**
- **UI renderers** for the terminal display

### Core workhorse tools

| Tool | Purpose |
|---|---|
| `Bash` | Run shell commands |
| `Read` | Read files |
| `Write` | Write/create files |
| `Edit` | Patch specific lines in files |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `Task` | Spawn subagents (isolated context) |
| `WebSearch` | Search the web |
| `WebFetch` | Fetch a URL |

### MCP tools
MCP servers contribute **additional tools at runtime**. Your project can define custom tools (database queries, API calls, deployment scripts) and Claude Code picks them up automatically alongside the built-ins.

> **SDLC relevance:** Register your own MCP tools to give Claude Code access to your ticketing system (Jira/Linear), CI/CD pipeline, or internal APIs.

---

## Layer 3 — The Permission Gauntlet (5 Layers)

Every single tool call passes through **five independent checks** in order:

| # | Layer | What it does |
|---|---|---|
| ① | Tool's own `checkPermissions()` | Bash checks for destructive commands; Write checks file paths |
| ② | Allow/deny list | Glob patterns e.g. `Bash(npm:*)` or `Read(~/project/**)` |
| ③ | Sandbox policy | Managed restrictions on paths, commands, network access |
| ④ | Active permission mode | May auto-approve or force-ask regardless of above |
| ⑤ | Hook overrides | `PreToolUse` hooks can approve, block, or modify the call |

### Permission modes

| Mode | Behaviour |
|---|---|
| `default` | Ask for everything |
| `acceptEdits` | Auto-approve file changes, ask for shell commands |
| `plan` | Read-only until you explicitly approve |
| `bypassPermissions` | Auto-approve everything |
| `auto` | Automation-friendly minimal approval (CI use) |

### Hooks
Hooks are event-driven shell scripts configured in `settings.json`. You can:
- Block any Bash command matching a pattern
- Run a linter after every file edit
- Inject additional context into every user prompt
- Archive transcripts before context compaction

> **SDLC relevance:** Use `PostToolUse` hooks to auto-run your test suite or linter after every file edit Claude makes.

---

## Layer 4 — Context Window & Memory

Everything accumulates in the context window:
- System prompt
- Tool definitions
- CLAUDE.md contents
- Conversation history (all turns)
- Tool inputs and outputs (file reads, command results)

Content that stays the same across turns (system prompt, tool definitions, CLAUDE.md) is **automatically prompt-cached** — reducing cost and latency.

### Memory hierarchy

| Tier | Location | Scope |
|---|---|---|
| CLAUDE.md | `.claude/CLAUDE.md` or project root | Per-project, loaded into every system prompt |
| Auto-memory | `~/.claude/memory/` | Learned preferences accumulated across sessions |
| Session history | `~/.claude/sessions/` | Resume or fork previous conversations via `/resume` |

### Context compaction
When the context window approaches its limit:
1. Older **tool outputs** are cleared first
2. If still needed, the conversation is **summarised**
3. Recent exchanges and key decisions are preserved

**Best practice:** Put persistent rules in `CLAUDE.md`, not in early conversation messages — they survive compaction.

You can control compaction with:
- `CLAUDE.md` section: `Compact Instructions: preserve X and Y`
- `/compact focus on the API changes` — manual targeted compaction
- `/context` — inspect what's consuming space
- `PreCompact` hook — run custom logic (e.g. archive full transcript) before compaction

---

## Layer 5 — Settings Hierarchy

Settings merge in this order — **later values win**:

```
Defaults
  → ~/.claude/settings.json          (user global)
    → .claude/settings.json          (project, commit to VCS)
      → .claude/settings.local.json  (project local, gitignored)
        → CLI flags
          → Environment variables    (highest priority)
```

This means your team checks in project-level tool allowlists, individuals override locally, and CI overrides via env vars — no conflicts.

---

## Layer 6 — Multi-Agent Coordination

Three patterns for scaling beyond a single session:

### Subagents (via `Task` tool)
- Temporary worker instances launched from the current session
- Each gets its own **isolated context window**
- Executes its task and returns only a **summary** to the parent
- Use for: parallel research, isolated subtasks, keeping main context clean

### Agent Teams
- Use **tmux** for true parallelism (separate OS processes)
- A lead agent creates a team; members get separate tmux panes with their own Claude sessions
- Members communicate through a **shared message bus**
- Each member gets role-specific instructions and tool access
- Use for: one agent refactoring the backend while another updates frontend tests

### Dynamic Workflows *(research preview, May 2026)*
- Introduced in Claude Code v2.1.154 — available on Max, Team, Enterprise plans
- Triggered by using the word "workflow" in a prompt, or `/effort ultracode`
- Claude generates a **JavaScript orchestration script on the fly**
- Script holds all loops, branching logic, and intermediate state (outside the context window)
- Can fan out to up to **1,000 subagents**
- Composable with Agent Teams — subagents can be spun up inside a workflow

---

## The Terminal UI

The CLI is a **React application** rendered via [Ink](https://github.com/vadimdemedes/ink) — a React renderer for CLIs.

- Layout uses **Yoga** (CSS flexbox)
- Styling via **ANSI escape codes**
- Supports inline images via the **iTerm protocol**
- Thinking blocks are collapsible
- Tool results show previews with execution status

---

## Architecture Summary (7 Components, 5 Layers)

```
┌─────────────────────────────────────────────────┐
│           Entry points                           │
│   CLI  |  VS Code ext  |  Agent SDK  |  Headless │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              AGENTIC LOOP                        │
│  1. Assemble context                             │
│  2. Call model (SSE streaming)                   │
│  3. Execute tools (validate → perm check → run)  │
│  4. Feed results back                            │
│  5. Stop or loop                                 │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│            TOOL SYSTEM (~26 built-in + MCP)      │
│   Bash | Read | Write | Edit | Glob | Grep       │
│   Task (subagents) | WebSearch | MCP tools       │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│          PERMISSION GAUNTLET (5 layers)          │
│  ① Tool check  ② Allow/deny  ③ Sandbox           │
│  ④ Mode        ⑤ Hooks                           │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│           CONTEXT & MEMORY                       │
│  CLAUDE.md | Auto-memory | Session history       │
│  Tool outputs | Compaction                       │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│           SETTINGS HIERARCHY                     │
│  Defaults → User global → Project → Local →      │
│  CLI flags → Env vars                            │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│           MULTI-AGENT COORDINATION               │
│  Subagents | Agent Teams | Dynamic Workflows     │
└─────────────────────────────────────────────────┘
```

---

## SDLC Integration — Key Levers

| Goal | Claude Code feature to use |
|---|---|
| Enforce project coding standards | `CLAUDE.md` with team rules checked into VCS |
| Auto-run tests after every edit | `PostToolUse` hook triggering your test runner |
| Connect to Jira / Linear / Azure DevOps | MCP server registering ticket/PR tools |
| Block dangerous commands in CI | Permission allow/deny glob patterns + sandbox |
| Parallel feature + test development | Agent Teams (tmux) or Dynamic Workflows |
| Non-interactive CI/CD pipeline runs | `auto` permission mode + headless CLI |
| Custom internal API access | MCP tool server (TypeScript or Python) |
| Resume long refactoring sessions | `/resume` + session history |
| Prevent context drift on large codebases | Structured `CLAUDE.md` + `Compact Instructions` section |

---

## Research Questions for Your AI Workflow

- How does MCP tool registration interact with the permission gauntlet?
- What are the cost and latency implications of Dynamic Workflows vs. Agent Teams?
- How can `PreCompact` hooks be used to persist architectural decisions across long sessions?
- What is the optimal `CLAUDE.md` structure for a TypeScript/Node microservices codebase?
- How does the Agent SDK's subprocess architecture affect observability in a production pipeline?
- Can n8n trigger Claude Code headless runs via the Agent SDK as a workflow step?

---

*Generated by Claude (Anthropic) — claude.ai | May 2026*
