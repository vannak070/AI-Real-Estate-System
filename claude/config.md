# config.md — how the agent works on this repo

Read this before starting any task driven from `claude/`. It is the rulebook;
[`../CLAUDE.md`](../CLAUDE.md) and [`../ARCHITECTURE.md`](../ARCHITECTURE.md) are
the background.

## 1. Always work from a spec

- A **feature** task requires a `claude/features/<name>.md`. No spec → ask for one,
  don't guess.
- A **change** to something already produced goes through `claude/updates/<name>.md`
  (or a human edit). Don't silently rework prior output.
- After producing output, **stop for human review**. Do not proceed to test or to
  the next feature until asked.
- Run `claude/tests/test-<name>.md` only when asked; report results, don't "fix
  and re-run" in a loop.

## 2. Repo map

```
apps/client         customer website — Vite + React 18 (@era/client), :5173
apps/admin          back office — Vite + React 18 (@era/admin), :5174
apps/api            modular monolith backend (@era/api), :4000
packages/contracts  event & command schemas (@era/contracts)
packages/shared     ids, logger (@era/shared)
packages/api-client typed client for @era/api — REST now, tRPC later (@era/api-client)
packages/ui         shared React primitives (@era/ui)
packages/mock-data  TEMPORARY fixtures for both SPAs — replace with @era/api-client
packages/theme      shared brand tokens (@era/theme)
```

pnpm workspace + Turborepo. `pnpm typecheck` / `pnpm lint` / `pnpm build` fan out
via `turbo`.

`apps/client` and `apps/admin` are separate apps rooted at `/`; the admin app has
no `/admin` prefix. Only admin links to the customer site (`VITE_CLIENT_URL`, a
plain `<a href>`); the customer site has no link into the back office.

## 3. Boundary rules (backend) — do not break

From `ARCHITECTURE.md`:

- A module (`apps/api/src/modules/<m>/`) **never imports another module**. Cross-
  module calls go through `ctx.modules.<name>` or an event.
- A module reads/writes **only its own tables** (`apps/api/prisma/schema/<m>.prisma`).
  No foreign keys across modules — cross-module links are bare id columns.
- A module's public API in its `index.ts` is a **hand-written projection**, never a
  Prisma row type.
- Every bus message uses a `defineMessage` entry in `@era/contracts` — no raw type
  strings in module code. Bump `version` on an incompatible payload change.
- Event/command handlers must be **idempotent**.

## 4. Frontend conventions

- Pick the right app: customer-facing → `apps/client`, internal/back-office →
  `apps/admin`. A change that spans both usually belongs in a shared package.
- Data goes through **`@era/api-client`** + TanStack Query hooks, not new
  `@era/mock-data` imports. Migrate one page at a time and drop its
  `@era/mock-data` import when done.
- Match the surrounding file: brand colours are still inline hex in most files
  (`#001F5B` navy, `#EF2D2C` red, `#8B0A1C` maroon) — don't refactor that as a
  side effect. Shared tokens live in `@era/theme`.
- `react-router` (v7), not `react-router-dom`.

## 5. Output expectations

- Smallest diff that satisfies the spec. No drive-by refactors.
- List every file touched and why.
- New behaviour needs a matching `claude/tests/test-<name>.md` (write it if the
  spec author didn't).
- If the spec is missing Jira/Figma/API/base-code detail, list what's blocking
  under **Open questions** and stop — do not fabricate ticket or design content.

## 6. Running things

```bash
pnpm install
pnpm --filter @era/api prisma:generate      # before api typecheck or dev
pnpm --filter @era/api prisma:migrate
pnpm api                                    # backend        :4000
pnpm client                                 # customer site  :5173
pnpm admin                                  # back office    :5174
pnpm typecheck                              # turbo → every package
pnpm lint                                   # turbo → eslint
```
