# `claude/` — Team AI context pack

Human-authored context the team points the AI agent at. This is **not**
`.claude/` (that's Claude Code's own settings) — this folder is documentation you
write and the agent reads.

```
claude/
  config.md              how the agent must work on this repo (read first, every task)
  features/[name].md      spec for a new feature — the agent implements from this
  updates/[name].md       a change request against something already produced
  tests/test-[name].md    how the agent should exercise a flow, step by step
  templates/              blank forms for the three file types above
```

## Workflow

```
1. Write  claude/features/<name>.md         (use templates/feature.md)
2. Agent implements it, then STOPS.
3. Human reviews the output.
      ├─ small fix        → edit by hand
      └─ larger change    → write claude/updates/<name>.md  → agent re-runs
4. Agent runs  claude/tests/test-<name>.md
5. Human verifies again.  Repeat 3–5 until done.
```

## A feature file must include

Text description · screenshots / images · Jira ticket(s) · Figma link(s) ·
the API functions involved · base-code paths the change touches. If any are
unknown, say so under **Open questions** rather than leaving them out — the agent
must not invent Jira or Figma content.

## Naming

- One concern per file. `features/lead-assigned-agent-column.md`,
  `updates/lead-assigned-agent-column.md`, `tests/test-lead-assigned-agent-column.md`
  — same `<name>` across the three so they're easy to trace.
- `kebab-case`, no spaces, no dates in the filename.

## See also

- [`claude/config.md`](config.md) — repo rules for the agent
- [`../CLAUDE.md`](../CLAUDE.md) — repo overview
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — module boundaries, the event bus, the saga example
