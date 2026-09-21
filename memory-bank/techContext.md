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

**`db:seed` (`prisma/seed.ts`) is a full destructive wipe-and-recreate** — it
deletes essentially every table and rebuilds from `@era/mock-data/erp`'s
static fixture. Never run it against a database that has any real
session/demo work you want to keep; there is no confirmation prompt. Any new
one-off content seed should be its own **separate, idempotent** script (see
`prisma/seed-about.ts` for the pattern: `count() === 0` guards, upsert for
singletons) — never added into `seed.ts`'s destructive path.

CI (`.github/workflows/ci.yml`): `pnpm install → prisma:generate → turbo run
typecheck lint build`.

## Environment gotcha: git repo root

This project's own `.git` was missing for a long stretch of its history; git
commands run from inside it were silently resolving to an **unrelated**
repository rooted at the machine's home directory. If `git status`/`log`
ever look wrong (everything untracked, or history for a different project
entirely), run `git remote -v` immediately — don't assume commands are
operating on this repo just because the cwd is right. As of 2026-09-21 this
project has its own correct `.git` pointed at
`github.com/vannak070/AI-Real-Estate-System`, in sync with `origin/main`.
