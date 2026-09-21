# memory-bank/

A durable, repo-local, tool-agnostic record of project context — separate
from any one AI tool's own private memory, so the context survives a switch
of tools, machines, or who's driving.

Read in this order when picking up work here:

1. **[`activeContext.md`](activeContext.md)** — what's true *right now*.
   Changes often; read this first, every time.
2. **[`progress.md`](progress.md)** — what's built, what's not, and why some
   non-obvious calls were made. Stable narrative form.
3. **[`projectbrief.md`](projectbrief.md)** — what this project even is.
   Rarely changes.
4. **[`productContext.md`](productContext.md)** — who uses it, product
   decisions already made, UX conventions already settled.
5. **[`systemPatterns.md`](systemPatterns.md)** — architecture, recurring
   design patterns, and durable lessons from mistakes already made once.
6. **[`techContext.md`](techContext.md)** — stack, commands, environment
   gotchas.

## Keeping this current

- Update **`activeContext.md`** whenever the focus shifts to something new —
  edit it in place, don't just append (stale entries actively mislead the
  next person/agent).
- Move a completed piece of work from `activeContext.md` into `progress.md`
  once it's actually done and verified, not before.
- If something here turns out to be wrong, fix it — don't leave a
  contradiction for the next reader to untangle. `systemPatterns.md`'s
  closing lesson applies to this whole directory: verify against real code
  before trusting a claim here that predates your own work.

See also [`../CLAUDE.md`](../CLAUDE.md) (the full reference for Claude Code
specifically), [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (backend module
boundaries in depth), and [`../claude/config.md`](../claude/config.md) (the
spec-driven workflow for team-authored tasks in `claude/`).
