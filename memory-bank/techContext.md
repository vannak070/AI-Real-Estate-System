# Tech Context

## Stack

- **Monorepo**: pnpm workspace (pnpm 9, pinned via `packageManager`) +
  Turborepo (`turbo.json`) for `typecheck`/`lint`/`build` fan-out.
  `node-linker=hoisted` in `.npmrc` (flat `node_modules`).
- **Backend** (`apps/api`): Fastify + tRPC v11 + Prisma (multi-file schema
  folder, `prismaSchemaFolder` preview feature) + zod. Pure ESM TypeScript —
  no React/JSX toolchain in this app (relevant: PDFs use `pdfkit`, not
  `@react-pdf/renderer`).
- **Frontend** (`apps/admin`, `apps/client`): React 18 + Vite + React Router
  v7 (import from `react-router`, **not** `react-router-dom`) + Tailwind v4
  (no config file — `@source`/`@theme inline`) + `@era/ui` primitives +
  `lucide-react` icons + `motion`. `apps/admin` also uses TanStack Query +
  `chart.js`/`react-chartjs-2`; `apps/client` uses neither TanStack Query
  (plain `useEffect`/`useState`) nor charts, but adds `react-slick` for
  carousels.
- **Database**: Postgres via `docker-compose.yml`, container `era-postgres`,
  **port 5435** (not 5432–5434 — those are other unrelated projects on this
  machine).
- **AI**: `@anthropic-ai/sdk`, model `claude-haiku-4-5-20251001`, manual
  tool-use loop in `modules/assistant/assistant.service.ts`; token usage per
  call is logged as `assistant.usage`. Telegram via plain `fetch` to the Bot
  API (`modules/messaging/telegram.ts`, no SDK).

## Environment variables (`.env` at the repo root, git-ignored)

Required: `DATABASE_URL`. Optional — the API starts without any of them:
- `ANTHROPIC_API_KEY` — the AI chat and bot (errors clearly if missing).
- `CHAT_TOKEN_SECRET` — signs the website chat's lead reference; without it
  a random per-process secret is used (corrections break across restarts).
- `TELEGRAM_BOT_TOKEN` — starts the Telegram bot; without it nothing starts.
- `PUBLIC_API_URL` — set → Telegram webhook at `<url>/webhooks/telegram`;
  unset → long polling (local dev). Only one process may poll a bot.
- `PUBLIC_SITE_URL` — customer site address for links/buttons (default
  `http://localhost:5173`; Telegram rejects localhost button URLs).
- `TELEGRAM_API_BASE` — tests only (point the bot at a fake Bot API).
The API reads `.env` via Prisma at startup — a change needs an API restart
(touching a source file makes `tsx watch` restart it).

## Auth & sessions

Bcrypt (`auth.service.ts`) + DB-backed sessions (`identity_sessions`, cookie
= session id). No JWT anywhere in this system.

## File storage

Local disk (`apps/api/src/platform/uploads.ts`), served via
`@fastify/static` at `/uploads/*`. No cloud storage account — deliberate,
not an oversight; revisit only if that becomes an actual deployment
requirement. Client-side, a relative `/uploads/...` path needs
`resolveUploadUrl()` (defined identically in both `apps/admin/src/lib/api.ts`
and `apps/client/src/lib/api.ts`) to become a full URL for `<img src>`.

## Type-checking quirks worth knowing

- `tsconfig.web.json` (extended by both SPA `tsconfig.json`s) is deliberately
  `strict: false` (migrated Figma code) but explicitly turns
  **`strictNullChecks` back on** — without it, zod (and therefore every tRPC
  procedure's inferred type) silently marks required object fields as
  optional, which is a real correctness bug, not a style nit. Expect
  `T | null` (not `T | undefined`) when reading a nullable Prisma column
  through a tRPC-typed query.
- Prisma's `omit` API isn't reliably available even on a recent
  `@prisma/client` version in this setup — the generated `index.d.ts` had no
  `*Omit` types even after `prisma generate` on 5.22.0. Use an explicit
  `select` to strip a sensitive column instead of assuming `omit` works;
  verify by grepping the generated client before depending on it.
- Vite build uses esbuild only (no type checking during `vite build`) — `pnpm
  typecheck` (→ `tsc --noEmit` per package) is the actual correctness gate,
  always run alongside `build`.

## The one true "done" gate

```bash
pnpm turbo run typecheck lint build
```
17 tasks total across every package; must be 17/17 green (cache hits count)
before any change is considered finished. **Live browser verification is
also required for any UI change** — a green gate proves the code compiles
and lints, not that the feature actually works when clicked through.

## Local dev

```bash
pnpm install
docker compose up -d postgres                 # era-postgres on :5435
pnpm --filter @era/api prisma:generate        # required before api typecheck/dev
pnpm --filter @era/api prisma:migrate         # needs Postgres reachable
pnpm --filter @era/api db:seed                # DESTRUCTIVE full reset+reseed — see warning below
pnpm --filter @era/api db:seed:about          # safe, idempotent — About-page CMS content only

pnpm client   # :5173
pnpm admin    # :5174
pnpm api      # :4000
```

**"I can't log in" → check the API first.** The admin login page is served by
Vite on :5174 and loads fine with the API down; only the sign-in request
fails. `curl localhost:4000/health` should return `{"status":"ok"}`. A dev
server started in a terminal dies with that terminal session (seen
2026-09-24). A server started by an agent's preview tools dies with the agent
session instead — and must not run alongside the user's own copy (port
clash on :4000; Telegram rejects a second poller with 409).

**`db:seed` (`prisma/seed.ts`) is a full destructive wipe-and-recreate** — it
deletes essentially every table and rebuilds from `@era/mock-data/erp`'s
static fixture. Its `assertSafeToReset()` guard refuses (exit 1) when
Inventory holds anything beyond the demo dataset's own rows; `--force` /
`SEED_FORCE=1` overrides it — never pass that against real data. Any new
one-off content seed should be its own **separate, idempotent** script (see
`prisma/seed-about.ts` for the pattern: `count() === 0` guards, upsert for
singletons) — never added into `seed.ts`'s destructive path.

CI (`.github/workflows/ci.yml`): `pnpm install → prisma:generate → turbo run
typecheck lint build`.

## Database changes: `prisma migrate dev` refuses here

Run non-interactively (as an agent does), `prisma migrate dev` refuses to
create a migration. What works, used for every 2026-09-24 schema change:

```bash
cd apps/api
URL="$(grep '^DATABASE_URL=' ../../.env | cut -d= -f2- | tr -d '"')"
mkdir -p prisma/migrations/<timestamp>_<name>
pnpm exec prisma migrate diff --from-url "$URL" --to-schema-datamodel prisma/schema --script \
  > prisma/migrations/<timestamp>_<name>/migration.sql   # or hand-write it
pnpm exec prisma migrate deploy && pnpm exec prisma generate
pnpm exec prisma migrate diff --from-url "$URL" --to-schema-datamodel prisma/schema --script
# ↑ must print "-- This is an empty migration."
```

Hand-write the SQL instead of using the diff whenever data must survive
(column type changes, enum → text, backfills) — the generated diff drops and
re-adds columns. If a migration fails, Postgres rolled it back: fix it,
`prisma migrate resolve --rolled-back <name>`, deploy again.

## Testing without a UI

- **Backend procedures**: a scratch `.mts` script under `apps/api/src/` that
  builds the real modules and calls `createAppRouter(ctx).createCaller({...
  user: { capabilities: [...] } })` with fake users per role; run with
  `pnpm exec tsx --env-file=../../.env <file>` from `apps/api`. The logger
  stub needs `child`. Delete the script and every test row afterwards.
- **The Telegram bot**: set `TELEGRAM_BOT_TOKEN` to any fake value and
  `TELEGRAM_API_BASE` to a local `http.createServer` that answers `getMe`/
  `getUpdates`/`sendMessage`/`sendPhoto`/`answerCallbackQuery`, then
  `buildApp()` and feed updates — the real engine, real Claude, real DB, no
  real Telegram. Uses real Anthropic credit (cents).

## Environment gotcha: git repo root

This project's own `.git` was missing for a long stretch of its history; git
commands run from inside it were silently resolving to an **unrelated**
repository rooted at the machine's home directory. If `git status`/`log`
ever look wrong (everything untracked, or history for a different project
entirely), run `git remote -v` immediately — don't assume commands are
operating on this repo just because the cwd is right. As of 2026-09-21 this
project has its own correct `.git` pointed at
`github.com/vannak070/AI-Real-Estate-System`, in sync with `origin/main`.

## Root-cause investigation method: "what ran a destructive command against
## this DB" (used 2026-09-21 for the real-Inventory-wipe incident)

When something got destroyed and the *how* isn't obvious from the current
state, this is the check order that actually narrows it down, cheapest and
most conclusive first:

1. **Docker container `Created` timestamp**, not just "is it running":
   `docker inspect <container> --format '{{.Created}}'`. If it still reads
   the original setup date, the named volume was never recreated — rules
   out `docker compose down -v` / `docker volume rm` / a prune entirely,
   regardless of what the data itself looks like now. (era-postgres's own
   volume is named, not a bind mount — see `docker-compose.yml` — so a
   plain `docker compose down` without `-v` was never a suspect either;
   only removing the volume itself would matter.)
2. **Local Claude Code session transcripts for this exact project**, if any
   exist: `~/.claude/projects/<url-encoded-project-path>/*.jsonl` — one
   file per top-level session, `<sessionId>/subagents/*.jsonl` for anything
   spawned via the Agent tool underneath it. These are plain JSONL, one
   `{"timestamp", "type", "message": {"content": [...]}}` object per line;
   `tool_use` entries with `"name": "Bash"` have the exact command in
   `input.command`. Grep/parse these directly (Python's `json.loads` per
   line handles it fine) for the specific command(s) suspected — don't
   trust a substring match on the whole file for anything file-content or
   prose-wrapped; extract `tool_use`/`Bash` entries specifically and check
   their `command` field, and check subagent files too, since a spawned
   Explore/general-purpose agent's own Bash calls don't show up in the
   parent session's tool_use list at all.
3. **The user's own shell history** (`~/.zsh_history`, `~/.bash_history`) —
   only useful if the destructive command was typed by a human in a
   terminal that writes to one of those files; a lot of real usage (GUI
   tools, other terminal apps, Claude Code's own Bash tool subprocess)
   never touches them.
4. **Hidden automatic triggers**: `postinstall`/`preinstall`/`prepare` in
   every `package.json`, and each Turborepo task's `dependsOn` chain in
   `turbo.json` — confirm nothing routine (like `pnpm install` or `pnpm
   dev`) could silently cascade into the destructive command.

For the 2026-09-21 incident (a full reset of the real 637-project Inventory
scrape back to the demo seed, see `progress.md`'s Incidents section), steps 1 and 4 came back clean, and step 2
found exactly which session had the real data intact vs. reverted (bracketing
the reset to sometime within one specific ~9-day-long continuous session)
but never found the literal command — searched every `Bash` tool_use in
both local sessions and all 12 subagents spawned from the relevant one, for
`db:seed` (the destructive form), `prisma migrate reset` without
`--skip-seed`, and any Docker volume/`TRUNCATE`/`DELETE` pattern. None
turned up. **Conclusion when this happens: don't keep digging indefinitely
once steps 1–4 are exhausted — the more productive move is removing the
*ability* to repeat the mistake** (see `prisma/seed.ts`'s `assertSafeToReset()`
guard, added as the actual resolution here) rather than fully explaining a
gap in the available logs.
