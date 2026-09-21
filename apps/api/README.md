# @era/api — modular monolith

One deployable process today, nine modules with hard boundaries so any of them
can become its own service later without rewriting callers.

```
src/
  main.ts                 process entrypoint (listen + signals)
  app.ts                  compose modules, wire the bus, cors/cookies, mount tRPC
  platform/               infrastructure — no business logic
    config.ts             env parsing/validation (zod) — incl. corsOrigins
    db.ts                 PrismaClient singleton
    http.ts               Fastify factory + error handler + /health
    module.ts             AppModule / ModuleContext / ModuleApis contracts
    event-bus/
      types.ts            EventBus interface + delivery contract
      in-process-bus.ts   monolith transport (default)
      nats-bus.ts         post-split transport (stub — implement on first extraction)
      index.ts            createEventBus(config) picks one
  trpc/
    context.ts            per-request context — resolves the session cookie into ctx.user
    trpc.ts                publicProcedure / protectedProcedure / withCapability(cap)
    root.ts                createAppRouter(ctx) — the ONE static router tree; exports AppRouter
  modules/
    registry.ts           the list of modules this process runs (startup wiring: events, /health)
    identity/             User, Team, Session, roles; auth.router.ts (login/logout/me) + identity.router.ts (users/teams CRUD, settings:write)
    crm/                  Contact, Lead, Activity — crm.router.ts (contacts/leads/activities CRUD)
    inventory/            Project, Block, UnitType, Unit, PriceList — inventory.router.ts (+ reservation saga participant)
    sales/                Quotation, PaymentPlanTemplate, Reservation, SalesContract, ContractMilestone — sales.router.ts
    finance/              Invoice, Payment, Receipt, Commission — schema only, CRUD is Phase 4
    ops/                  ApprovalRequest, DocumentFile, Notification — schema only, Phase 5
    marketing/            Channel, Campaign — schema only, Phase 6
    settings/             CompanyProfile, NumberSequence, TaxRate — nextNumber() is real (Phase 0 #4); rest is Phase 6
    analytics/            event-fed read models — analytics.router.ts
prisma/schema/            one *.prisma file per module (prismaSchemaFolder)
```

The model is reconciled with `packages/mock-data/src/erp/types.ts` — the static
back office's data shape is the spec every module's Prisma models follow.

## App↔API contract: tRPC, not hand-written REST

The old per-module `*.routes.ts` (plain Fastify handlers) are gone. Every
module's HTTP surface is now a **tRPC router** (`*.router.ts`), composed once
in `src/trpc/root.ts` into a single statically-typed `AppRouter`. `@era/api-client`
imports that type only (`import type { AppRouter } from '@era/api/trpc'`) — no
codegen, no drift: change a procedure's input/output and every caller fails to
typecheck until it's fixed. `/health` is the one deliberate exception (infra,
checked before the app can even authenticate).

A module's router still wraps the SAME service factory (`create<X>Service(ctx)`)
it always has — `root.ts` just builds a second instance of each for the static
object-literal composition tRPC needs for full type inference. Cheap (a closure
over the shared `db`/`bus`), not a second connection.

## Auth & RBAC

Session-based, not JWT: `identity/auth.service.ts` hashes passwords (bcrypt),
and a login creates an `identity_sessions` row whose id IS the httpOnly cookie
value (`era_sid`) — so revoking a session is one `DELETE`. `trpc/context.ts`
resolves that cookie into `ctx.user` on every request.

- `publicProcedure` — no auth required (e.g. `auth.login`).
- `protectedProcedure` — requires `ctx.user`; narrows it to non-null.
- `withCapability(cap)` — requires `cap` to be in `ctx.user.capabilities`.

Roles are **DB-backed and fully custom** (`identity_roles`, `User.roleId` —
not a fixed enum): `key`/`name`/`description`/`capabilities: String[]`/
`isSystem`. `Capability` itself stays a fixed union in `@era/contracts`
(`permissions.ts`) — it's the set of `withCapability(cap)` checks that exist in
this codebase, so it isn't something the UI can invent. `DEFAULT_ROLES` there
is bootstrap data only, consumed by `prisma/seed.ts` to create the 6 starter
roles (`isSystem: true` — can't be deleted, capabilities still editable).
`getSessionUser`/`auth.login` resolve a user's role and return its
`capabilities` array directly on `AuthUser`, so `can()` (also in
`permissions.ts`) is a plain `capabilities.includes(cap)` check — no role
lookup at request time. `identity.roles.{list,get,create,update,delete}`
(`identity.router.ts`) manage roles; `identity.users.{list,get,create,update}`
take `roleId`. Both are exposed in `apps/admin` at `/users` (Users & Roles).

Dev login after seeding: whatever `db:seed` prints (all seeded users share one
dev password).

## Numbering sequences

`settings.nextNumber(prefix)` issues doc numbers (`RSV-2026-0029`, …) with a
single `UPDATE settings_number_sequences SET "nextNumber" = "nextNumber" + 1
WHERE prefix = $1 RETURNING ...` — Postgres's row lock makes this atomic under
concurrent callers with no explicit transaction needed. Looked up by `prefix`
(the short code), not `doc` (the human label) — seed one row per document type
before anything calls it (see `prisma/seed.ts`).

## What's actually implemented (Phase 1)

- `identity.users.{list,get,create,update}`, `identity.teams.{list,create,update}`
  — reads are open to any signed-in user (need the directory to assign owners),
  writes require `settings:write` (ADMIN only in `ROLE_CAPS`).
- `crm.contacts.{list,get,create,update,verifyKyc}` — `list` takes an optional
  `q` (case-insensitive name/email/phone search).
- `crm.leads.{list,get,create,changeStage,update}`.
- `crm.activities.{list,create,toggleDone}` — the task/note/call feed for a
  lead or contact.

Still schema-only / not yet built: `finance`, `ops`, `marketing` CRUD (Phases
4–6), and `settings` beyond `nextNumber` (CompanyProfile/TaxRate CRUD, Phase 6).

`apps/admin` is wired to `auth` + `crm.{contacts,leads,activities}` (its
Contacts, Pipeline, and Tasks screens — Phase 8); everything else in
`apps/admin` is still on `@era/mock-data`.

## The rules that keep it split-ready

1. **No module imports another module.** The only cross-module call path is
   `ctx.modules.<name>` (typed by `ModuleApis`) or an event.
2. **No cross-module DB access.** Each module touches only the tables in its own
   `prisma/schema/<module>.prisma`. Cross-module references are plain id columns,
   no foreign keys.
3. **A module's public API is a projection**, hand-written in its `index.ts` — never
   its Prisma rows. That interface is the future network contract.
4. **All messages use `@era/contracts`.** Event/command type strings and payload
   schemas live there, versioned; nothing is published with a raw string literal
   defined in a module.
5. **Handlers are idempotent.** The in-process bus already delivers async and
   isolated; a broker will additionally retry.

## Run

```bash
pnpm install
cp .env.example .env                      # (repo root) DATABASE_URL already points at the compose Postgres
docker compose up -d postgres             # era-postgres on :5435 — see docker-compose.yml
pnpm --filter @era/api prisma:generate    # needed before typecheck/run
pnpm --filter @era/api prisma:migrate     # creates the schema
pnpm --filter @era/api db:seed            # loads the full @era/mock-data/erp dataset
pnpm --filter @era/api dev
```

`apps/api/.env` is a symlink to the repo-root `.env` — Prisma's CLI reads `.env`
relative to its own cwd, not the workspace root, so don't delete the symlink.

`GET /health`. Everything else is under `POST/GET /trpc/<router>.<procedure>`
— call it through `@era/api-client`, not raw HTTP, to keep the types.

## Extracting a module into its own service

1. Move `modules/<m>/` and `prisma/schema/<m>.prisma` into a new `apps/<m>-svc`
   (it already has no imports from siblings).
2. Give it its own `DATABASE_URL`; run its migrations against the new DB.
3. Implement `NatsEventBus` (or RabbitMQ) once; set `EVENT_BUS=nats` in every
   service. Module event code is unchanged.
4. Replace the extracted module's entry in other services' `ModuleApis` with an
   HTTP/gRPC client exposing the same interface. Call sites don't change.
5. Remove its line from the monolith's `registry.ts`, and its router from
   `trpc/root.ts` (the new service gets its own tRPC instance, or an HTTP proxy).
