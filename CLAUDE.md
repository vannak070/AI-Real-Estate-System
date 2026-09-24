# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"ERA – AI Integrated Real Estate System": a real estate platform for Cambodia
(customer-facing site + admin portal) that owns its CRM, inventory, and sales.

pnpm workspace monorepo:

```
apps/client         @era/client — customer website (React 18 + Vite SPA), :5173
apps/admin          @era/admin  — back-office SPA, :5174
apps/api            @era/api    — split-ready modular monolith backend, :4000
packages/contracts   @era/contracts   — versioned event & command schemas (zod)
packages/shared      @era/shared      — ids, logger
packages/api-client  @era/api-client  — tRPC client typed against @era/api's AppRouter (no REST, no codegen)
packages/ui          @era/ui          — shared React primitives (Button, Card, DataTable, Drawer, StatCard, Badge, …)
packages/mock-data   @era/mock-data   — legacy fixtures. No longer used by apps/client or apps/admin (every screen in both is on the real API) — the only remaining consumer is apps/api's prisma/seed.ts, which seeds demo data from @era/mock-data/erp.
packages/theme       @era/theme       — shared brand tokens (theme.css)
```

`apps/client` and `apps/admin` are **separate Vite apps / deployments**. Both
started as one Figma Make export; the split moved the `/admin` routes into their
own app rooted at `/`. The customer site does **not** link to the back office;
the back office links back to the customer site via `VITE_CLIENT_URL` (a plain
`<a href>`, not React Router).

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for the backend's module boundaries,
the event bus, and the reservation-saga example. Team task specs live in
[`claude/`](claude/README.md) (not `.claude/`). **Read
[`memory-bank/activeContext.md`](memory-bank/activeContext.md) and
[`memory-bank/progress.md`](memory-bank/progress.md) before starting
non-trivial work** — this file is the stable reference; the memory bank is
the continuously-updated record of what's actually been built, what's still
open, and lessons already learned the hard way.

## Commands

**pnpm workspace** (pnpm 9, pinned via `packageManager`). If `pnpm` isn't on
PATH: `corepack enable` (needs write access to the Node bin dir) or
`corepack enable --install-directory ~/.local/bin pnpm`.

```bash
pnpm install
docker compose up -d postgres             # era-postgres on :5435 (docker-compose.yml) — see below
pnpm --filter @era/api prisma:generate    # REQUIRED before api typecheck/dev — @prisma/client won't exist otherwise
pnpm --filter @era/api prisma:migrate     # needs a Postgres at DATABASE_URL
pnpm --filter @era/api db:seed            # optional demo data — WIPES nearly every table first;
                                           # refuses (exit 1) if Inventory holds anything beyond the
                                           # demo dataset's own rows. Add `-- --force` to override.

pnpm client         # customer site dev server  :5173
pnpm admin          # back office dev server     :5174
pnpm api            # backend dev server         :4000

pnpm typecheck      # turbo → tsc --noEmit, every package
pnpm lint           # turbo → eslint
pnpm format         # prettier --write .
pnpm build          # turbo → vite build for every app
pnpm test           # turbo → (no test runner wired yet)
```

Task running goes through **Turborepo** (`turbo.json`). CI (`.github/workflows/ci.yml`)
runs `pnpm install → prisma:generate → turbo run typecheck lint build`.

**Database:** `docker-compose.yml` runs a dedicated `era-postgres` container on
**:5435** (not :5432/5433/5434 — those are other projects' Postgres containers
on this machine). `apps/api/.env` is a symlink to the repo-root `.env`; Prisma's
CLI reads `.env` relative to its own cwd, so don't delete the symlink.

`.env` at the repo root feeds `apps/api` (see [`.env.example`](.env.example)).
Each SPA also reads `VITE_*` from its own `.env`.

`node-linker=hoisted` is set in `.npmrc` (flat `node_modules`, friendliest to the
Vite/Tailwind toolchain).

## apps/admin — the back office (fully wired to the real API)

`apps/admin` is a full Odoo-replacement back office. **Every screen is wired
to the real `apps/api` backend** — CRM, Inventory, Sales, Finance,
Approvals, Documents, Marketing, Settings, Users & Roles, and the
About-page CMS. There is no local-state fallback store left in this app
(the old `erp-store.tsx`/`useErp()` mock-data provider and its
`selectors.ts` were deleted once the last screen migrated off them) and no
`@era/mock-data` imports remain anywhere in `apps/admin/src`. If you find a
screen that still looks unwired, treat that as a regression to investigate,
not an expected gap.

- **RBAC is fully DB-backed, not a fixed enum.** `identity_roles`
  (`apps/api/prisma/schema/identity.prisma`) holds `key`, `name`, `description`,
  and a `capabilities: String[]` column; `User.roleId` points at one. An admin
  can rename a role, change its capabilities, or create an entirely new role
  from `/users` → Roles tab (`apps/admin/src/pages/UsersPage.tsx`) — no code
  change or migration needed. `Capability` itself stays fixed in
  `@era/contracts` (`packages/contracts/src/permissions.ts`) since it's
  literally the set of `withCapability(cap)` checks that exist in `apps/api`'s
  routers; `DEFAULT_ROLES` there is bootstrap data only, read by
  `prisma/seed.ts` to create the 6 starter roles (ADMIN/SALES_MANAGER/AGENT/
  FINANCE/MARKETING/VIEWER, `isSystem: true` — can't be deleted, capabilities
  still editable). `can(capabilities, cap)` is a plain array `.includes()`
  check — no role lookup — because the session (`AuthUser`) already carries
  its role's resolved `capabilities` array (`auth.service.ts`'s
  `getSessionUser`/`auth.login`).
- **`/users` has full CRUD on both Users and Roles**, all `settings:write`-gated
  server-side (`identity.users.*` / `identity.roles.*` in `identity.router.ts`;
  reads stay open to any signed-in user so other screens can populate "owner"
  dropdowns):
  - **Users** — list with search + role/team/status filters, create, update
    (role, team, active/disabled), and a real **delete** (`users.delete`) for
    cleaning up a mistaken account. Delete is a genuine hard delete (sessions
    then the row), guarded against deleting your own account and against
    deleting the last active user who holds `settings:write` (no admin
    lockout). Prefer `active: false` over delete once a user has real history —
    `Contact.ownerId`/`Lead.ownerId`/`Reservation.agentId`/etc. are plain id
    columns (no FK, per the no-cross-module-FK rule), so a deleted user's id
    lingers on old records and `userLabel()` just falls back to the raw id.
  - **Credentials are never chosen by an admin.** `users.create` and the new
    `users.resetPassword` both call `auth.service.ts`'s
    `generateTemporaryPassword()` (random, `base64url`) server-side and return
    the plaintext exactly once in the mutation's response — only the bcrypt
    hash is ever persisted. `UsersPage.tsx`'s `CredentialReveal` shows it in a
    copy-once panel; there's no way to retrieve it again after that, by design.
    `resetPassword` also deletes every existing session for that user (forces
    sign-out everywhere) — self-service "change my own password" isn't built
    yet, so a user who wants a new password needs an admin to reset it.
  - **Roles** — list with search + system/custom filter, create a custom role,
    edit any role's name/description/capabilities (a checkbox grid grouped by
    module, with per-group "Select all"/"Clear"), and delete — blocked for
    `isSystem` roles and for any role still assigned to a user, both enforced
    server-side in `identity.service.ts` (not just hidden in the UI).

- **Auth is real**: `apps/admin/src/store/auth.tsx` calls `api.auth.{me,login,logout}`
  (session cookie, no JWT) via TanStack Query — no more client-side email
  matching. `isLoading` (the initial `auth.me` round trip) is handled in
  `app/guards.tsx`'s `RequireAuth` before it decides to redirect to `/login`.
  There is no `loginAs()` impersonation shortcut against the real backend.
- **Every screen** reads/writes via typed React Query hooks, one file per module
  in `apps/admin/src/data/` (`crm.ts`, `identity.ts`, `inventory.ts`, `sales.ts`,
  `finance.ts`, `ops.ts`, `marketing.ts`, `settings.ts`, …) — e.g. `useContacts`,
  `useLeads`, `useChangeLeadStage`, `useUsers`, `useProjects`, `useUnits`,
  `useQuotations`, `useReservations`, `useContracts`, `useInvoices`,
  `usePaymentPlans`, `useAboutContent`, and their mutation counterparts — all
  built on `apps/admin/src/lib/api.ts` (`createApiClient`, LAN-aware baseUrl)
  and `apps/admin/src/lib/query-client.ts`. Local enum string-unions live in
  `apps/admin/src/data/types.ts` (no `@era/mock-data` dependency).
- Formatters live in `apps/admin/src/lib/format.ts` — `relDays(iso, now?)` takes
  an optional `now` so pages can pass `Date.now()` instead of a frozen mock
  "today" (a holdover from when some pages still read frozen mock timestamps;
  now just the normal convention).
- Screens in `apps/admin/src/pages/` (one per nav item); nav is grouped in
  `AdminLayout`. Screens are `PageHeader` + `DataTable`/`Drawer` from `@era/ui`.

## apps/client and apps/admin — shared SPA conventions

Same stack, same conventions; `admin` adds `chart.js`/`react-chartjs-2`, `client`
adds `react-slick`.

- **Typecheck + lint exist** (`tsconfig.json` per app extends `../../tsconfig.web.json`,
  which is deliberately loose — `strict: false` — because this is migrated Figma
  code; ratchet it up over time). `tsconfig.web.json` turns **`strictNullChecks`
  back on** despite `strict: false`: zod (and therefore every tRPC procedure's
  inferred input/output type) silently marks required object fields as optional
  under `strictNullChecks: false` — a real bug, not a style choice — so this one
  flag stays on for both SPAs even though the rest of `strict` doesn't. Expect
  `T | null` to need explicit narrowing/`??` when reading tRPC-typed data (Prisma
  nullable columns come through as `T | null`, not `T | undefined`). No test
  runner yet. Vite build stays esbuild (no type checking); `pnpm typecheck` is
  the gate.
- **Both apps are fully wired to the real backend** — every screen in
  `apps/admin`, and in `apps/client` the Properties list/detail pages, the
  About page, and `ChatPage.tsx`, via `apps/client/src/lib/api.ts` (same
  `createApiClient` pattern as admin, but plain `useEffect`/`useState`
  around the tRPC client's promises — `apps/client` has no TanStack Query
  dependency, kept that way deliberately rather than adding one for a
  handful of pages). **`ChatPage.tsx` is a real Claude-backed AI assistant**
  (Tier 1, 2026-09-24) — it calls `assistant.public.chat`
  (`apps/api/src/modules/assistant/`), which uses the Anthropic API with
  tool use (`search_properties`/`get_property`/`submit_lead`, each backed
  by real `ctx.modules.inventory`/`ctx.modules.crm` calls) so it can only
  ever discuss real listings and only ever create a real Lead — never a
  hardcoded or model-fabricated response. Requires `ANTHROPIC_API_KEY` in
  `apps/api/.env` (optional — the API starts fine without it; only the chat
  endpoint itself errors clearly when called with no key set). See
  `memory-bank/activeContext.md` for the full build and two real bugs
  (a false "I submitted your details" claim with no tool call; a project
  *name* passed instead of its id) caught and fixed during live testing.
  The typed client for the real backend is **`@era/api-client`**
  (`createApiClient({ baseUrl })`, tRPC, zero codegen) — see
  `apps/admin/src/data/` and `apps/client/src/lib/api.ts` for the pattern if
  wiring up anything new. `@era/mock-data` has no consumers left in either
  SPA; it remains a workspace package only because `apps/api/prisma/seed.ts`
  uses `@era/mock-data/erp` to seed demo data.
- **`@era/ui`** holds shared primitives (`cn`, `Button`, `Card` so far). Grow it
  by extracting repeated inline-styled patterns; each app's `tailwind.css` already
  `@source`s it.
- **Entry:** `src/main.tsx` → `src/app/App.tsx` (`<RouterProvider>`) →
  `src/app/routes.tsx`. Both routers are rooted at `/` — the admin app has **no
  `/admin` prefix**, it's its own deployment.
- **Routing:** React Router v7 via **`react-router`** (not `react-router-dom`).
  One layout per app (`CustomerLayout` / `AdminLayout`) owns the chrome and
  renders `<Outlet />`; pages in `src/app/pages/` (flat).
- **Cross-app links** (only admin → customer site, via `VITE_CLIENT_URL`) use
  `<a href>`, not `<Link>` — the other app is a separate origin. The customer
  site has no link into the back office.
- **Components:** hand-rolled with Tailwind + `lucide-react` + `motion`; **no
  component library** (the Figma export's unused shadcn/ui folder was removed).
  App components in `src/app/components/`; `ImageWithFallback` is duplicated into
  both apps at `components/figma/`.
- **Path alias:** `@` → that app's `src` (in `vite.config.ts` and mirrored in
  `tsconfig.json` `paths`).
- **`figma:asset/<hash>.png`** imports resolve to that app's `src/assets/` via the
  `figmaAssetResolver` plugin. Keep that import form; each app carries only the
  logo files it uses.
- **Brand palette** comes from `@era/theme/theme.css` (`@import`ed in
  `src/styles/index.css`) — `--primary` = `#001F5B`, `--era-navy` / `--era-red` /
  `--era-maroon`, wired to Tailwind v4 via `@theme inline`. Most pages instead
  hard-code the hex inline (`#001F5B`, `#EF2D2C`, `#8B0A1C`) via `style={{}}` or
  `bg-[#001F5B]`. Match the file you're editing; don't refactor this wholesale.
- **Tailwind v4**, no config file. Per-app CSS chain: `src/styles/index.css` →
  `fonts.css` (empty) → `tailwind.css` (`source(none)` + `@source '../**/*.{js,ts,jsx,tsx}'`)
  → `@era/theme/theme.css`.
- `vite.config.ts`: keep the `react()` and `tailwindcss()` plugins; only add
  non-code extensions to `assetsInclude`.

## apps/api — the backend

Rules are in [`ARCHITECTURE.md`](ARCHITECTURE.md) and
[`apps/api/README.md`](apps/api/README.md). The load-bearing ones:

- A module (`apps/api/src/modules/<m>/`) never imports another module — cross-
  module calls go through `ctx.modules.<name>` or an event.
- A module touches only its own tables (`apps/api/prisma/schema/<m>.prisma`); no
  foreign keys across modules.
- A module's public API in `index.ts` is a hand-written projection, never a Prisma
  row type.
- Every bus message is a `defineMessage` entry in `@era/contracts`; bump `version`
  on an incompatible payload change; handlers must be idempotent.
- Prisma uses the multi-file schema folder `apps/api/prisma/schema/`.
- **HTTP is tRPC, not REST** — every module gets a `*.router.ts` composed in
  `src/trpc/root.ts`; there are no more `*.routes.ts` files. `/health` is the
  only plain REST endpoint, on purpose.
- **Auth is real**: bcrypt password hashes, DB-backed sessions (`identity_sessions`,
  cookie = session id, no JWT). `withCapability(cap)` in `trpc/trpc.ts` enforces
  `@era/contracts`' `ROLE_CAPS` server-side — the same map `apps/admin` uses to
  gate its UI.
- **Document numbers** come from `ctx.modules.settings.nextNumber(prefix)` — an
  atomic `UPDATE ... RETURNING` against `settings_number_sequences`. Never
  generate a document number any other way.
- **Customer-facing Inventory reads must filter `Project.isPublished = true`** ("Show on
  website" — new properties default to hidden). Today that's `listPublicProjects`,
  `getPublicProject` and `listPublicUnits` in `inventory.service.ts`; the AI assistant reuses
  them. Any new public read of projects/units needs the same filter. Scripts that import real
  listings set `isPublished: true` explicitly.
- **`modules/assistant/`** is the odd one out: it has no Prisma tables of its
  own and its cross-module `AssistantApi` is deliberately empty (nothing
  calls back into it) — it only ever calls OUT to `ctx.modules.inventory`/
  `ctx.modules.crm` and the Anthropic API. It's what powers `apps/client`'s
  `ChatPage.tsx`; see `memory-bank/activeContext.md` for the full design
  (tool use, rate limiting, why it's stateless server-side).
