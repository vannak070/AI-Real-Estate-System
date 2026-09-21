# Architecture

ERA real estate system. A **split-ready modular monolith**: it ships as one
backend process now, but the module boundaries, the event bus, and the message
contracts are already those of a microservice system, so individual modules can
be extracted with mechanical (not structural) changes.

## Workspace layout

```
apps/
  client/               ← @era/client — customer website (React 18 + Vite SPA), :5173
  admin/                ← @era/admin  — back-office SPA, :5174
  api/                  ← @era/api    — the modular monolith backend, :4000
packages/
  contracts/            ← @era/contracts   — versioned event & command schemas
  shared/               ← @era/shared      — ids, logger interface
  api-client/           ← @era/api-client  — typed client for @era/api (REST now, tRPC later)
  ui/                   ← @era/ui          — shared React primitives
  mock-data/            ← @era/mock-data   — TEMPORARY shared fixtures for both SPAs
  theme/                ← @era/theme       — shared brand tokens (theme.css)
```

Tooling: pnpm workspace + **Turborepo** (`turbo run typecheck|lint|build|test`),
ESLint (flat config) + Prettier at the root, TypeScript everywhere
(`tsconfig.base.json` for node code, `tsconfig.web.json` for the SPAs), CI in
`.github/workflows/ci.yml`.

`client` and `admin` are independent Vite apps (separate origins/deployments),
each rooted at `/`; they cross-link by URL. Both consume `@era/mock-data` and
`@era/theme`.

pnpm workspaces tie it together (`pnpm-workspace.yaml`); the repo-root
`package.json` is the workspace root (scripts + `pnpm.overrides` only).
`tsconfig.base.json` is the shared TS config for `api` and the TS `packages/*`
(the SPAs and `@era/theme` have no tsconfig — Vite/esbuild only).

## Backend modules

Reconciled with `packages/mock-data/src/erp/types.ts` — the static back office's
data shape is the spec. `finance`, `ops`, `marketing` are still schema-only
(their `index.ts` returns an empty API); CRUD logic for each lands in the phase
noted. Every module with an HTTP surface exposes it as a **tRPC router**
(`*.router.ts`), composed once in `apps/api/src/trpc/root.ts` — see that file
and `apps/api/README.md` for how auth and the numbering sequence work.

| Module | Owns | Talks to others via |
|---|---|---|
| `identity` | `User`, `Team`, `Session`; `auth.router.ts` (login/logout/me) | exposes `getUser`, `listAgents` |
| `crm` | `Contact`, `Lead`, `Activity` | emits `crm.*` events; `crm.router.ts` |
| `inventory` | `Project`, `Block`, `UnitType`, `Unit`, `PriceList` | emits `inventory.*`; participates in the reservation saga; `inventory.router.ts` |
| `sales` | `Quotation`, `PaymentPlanTemplate`, `Reservation`, `SalesContract`, `ContractMilestone` | emits `sales.*`; drives the saga; `sales.router.ts` |
| `finance` *(Phase 4)* | `Invoice`, `Payment`, `Receipt`, `Commission` | — |
| `ops` *(Phase 5)* | `ApprovalRequest`, `DocumentFile`, `Notification` | — |
| `marketing` *(Phase 6)* | `Channel`, `Campaign` | — |
| `settings` | `CompanyProfile`, `NumberSequence`, `TaxRate` | exposes `nextNumber(prefix)` — real, atomic (Phase 0 #4 done); CompanyProfile/TaxRate CRUD is Phase 6 |
| `analytics` | `DailyMetric` read models | subscribes to everything; calls nobody; `analytics.router.ts` |

Auth/RBAC: sessions are DB rows (`identity_sessions`), the cookie is the session
id (no JWT). `trpc/trpc.ts` exposes `publicProcedure`, `protectedProcedure`, and
`withCapability(cap)`, checking `@era/contracts`' `ROLE_CAPS` — the single source
of truth for permissions, also consumed by `apps/admin` to gate its UI.

### Boundary rules (enforced by convention + review)

- A module never imports another module. Cross-module calls go through
  `ctx.modules.<name>` (typed by `ModuleApis` in `apps/api/src/platform/module.ts`).
- A module reads/writes only its own tables (`apps/api/prisma/schema/<module>.prisma`).
  Cross-module links are bare id columns — **no foreign keys across modules**.
- A module's public API in its `index.ts` is a deliberate projection, never its
  DB rows. It is the future network contract.

## Messaging

`packages/contracts` is the single source of truth for every message:

- **Events** (`events.ts`) — "something happened", fan-out, owned by one module,
  subscribable by any.
- **Commands** (`commands.ts`) — "do this", single handler.
- Each has a `type` string and a versioned zod payload `schema` via
  `defineMessage(type, version, schema)`.

The `EventBus` interface (`apps/api/src/platform/event-bus/types.ts`) is transport
-independent. Delivery contract, held constant across transports:

- `publish` resolves when the message is **accepted**, not when handlers finish.
- Handler errors never reach the publisher — logged now, retried by a real broker.
- Design every handler to be **idempotent**.

Implementations:

- `InProcessEventBus` — default (`EVENT_BUS=inprocess`). In-memory fan-out with
  broker-like async/isolated semantics.
- `NatsEventBus` — stub. Implement when the first module is extracted; set
  `EVENT_BUS=nats` everywhere. No module code changes.

## Worked example — the reservation saga

Spans three modules; there is no distributed transaction, so it runs as a saga:

```
sales.reservations.request  (tRPC mutation)
  sales:      create Reservation(HELD)
              → emit  sales.reservation_requested        {reservationId, unitId, agentId}   [correlationId = reservationId]
  inventory:  on sales.reservation_requested
              tx: Unit AVAILABLE -> RESERVED  (idempotent: already-RESERVED = ok)
              → emit  inventory.unit_reserved            {unitId, reservationId}
                 or   inventory.unit_reservation_rejected {unitId, reservationId, reason}
  sales:      on inventory.unit_reserved              → Reservation CONFIRMED
              on inventory.unit_reservation_rejected  → Reservation CANCELLED   (compensation)
  analytics:  on inventory.unit_reserved              → bump units_reserved

sales.reservations.signContract  (tRPC mutation, only when CONFIRMED)
  sales:      tx: create SalesContract(ACTIVE), Reservation -> CONVERTED
              → emit sales.contract_signed
  inventory:  on sales.contract_signed  → Unit RESERVED -> SOLD  → emit inventory.unit_sold
  analytics:  on sales.contract_signed  → bump contracts_signed, gross_sales
```

Consequence to design around: unit availability is **eventually consistent**. A
dashboard count can lag the true state by the time it takes handlers to run.

## Extraction recipe

See `apps/api/README.md` → "Extracting a module into its own service". In short:
the module folder + its `.prisma` file move out, it gets its own database,
`NatsEventBus` gets implemented once, and sibling `ModuleApis` entries become
network clients with the same TypeScript shape.
