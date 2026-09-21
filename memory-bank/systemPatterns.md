# System Patterns

Architecture and recurring design patterns. See [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
for the canonical module-boundary rules and the worked reservation-saga
example — this file is the condensed, pattern-level view plus things learned
building on top of it.

## Backend: modular monolith, split-ready

- A module (`apps/api/src/modules/<m>/`) **never imports another module
  directly.** Cross-module calls go through `ctx.modules.<name>` (a lazy
  Proxy) or the event bus.
- A module owns its own tables only (`apps/api/prisma/schema/<m>.prisma`).
  **No foreign keys across modules** — a cross-module reference (e.g.
  `Lead.preferredProjectId`, `Reservation.agentId`) is a bare id column,
  resolved at read time through the other module's own API. This means a
  deleted/renamed row on the other side just becomes an unresolvable id — the
  UI falls back to showing the raw id (`userLabel()` etc.), it doesn't crash.
- A module's public cross-module API (`index.ts`) is a **hand-written
  projection**, never a raw Prisma row type — it exposes exactly the fields
  another module needs and nothing else (see `identity/index.ts`'s
  `getAgentDocument`, deliberately excluding `passwordHash` even though
  `identity.service.ts`'s *own* queries once leaked it — see Durable Lessons).
- Every event/command uses a `defineMessage` entry in `@era/contracts` — no
  raw type strings. Bump `version` on an incompatible payload change. Handlers
  must be idempotent (a re-delivered "unit reserved" event for an
  already-reserved unit is a success, not an error).

## HTTP: tRPC end to end, no REST

- Every module gets a `*.router.ts` composed in `src/trpc/root.ts`. `/health`
  is the only plain REST endpoint, on purpose.
- **`withCapability(cap)`** gates a protected procedure server-side against
  `@era/contracts`'s `ROLE_CAPS` — the same map `apps/admin` uses to gate its
  own UI, so a hidden button and a blocked request are backed by the same rule.
- **`publicProcedure`** (no capability check) is how `apps/client` talks to
  the backend with no auth — used for read-only public projections
  (`inventory.public.projects/units`, `settings.public.about`) and the one
  real write path a stranger can trigger (`crm.public.submitLead`). A public
  procedure's result must be a **hand-written safe projection**, same
  discipline as a cross-module `index.ts` — explicitly list what's exposed,
  don't just return the Prisma row (see `listPublicProjects` excluding
  `gdv`/`soldValue`/`priceLists`).
- **Ownership scoping**: a caller without `<module>:read:all` is silently
  scoped to their own record set. The reusable helper is
  `apps/api/src/trpc/scoping.ts`'s `scopedOwnerId(user, allCap, requested)`,
  used on `list`/`create` inputs; a `get`/mutation on a *specific* id does its
  own explicit check (`!can(ctx.user.capabilities, allCap) && row.ownerId
  !== ctx.user.id` → `FORBIDDEN`). **This ownership check on mutations is not
  yet applied uniformly everywhere** — see `progress.md` for exactly where
  it's confirmed present vs. still missing.

## RBAC: DB-backed, not a fixed enum

`identity_roles` holds `key`/`name`/`description`/`capabilities: String[]`;
`User.roleId` points at one. An admin can rename a role, edit its
capabilities, or create a new one from `/users` → Roles — no code change or
migration. `Capability` itself is a fixed union in `@era/contracts` (it's
literally the set of `withCapability(cap)` checks that exist in code);
`DEFAULT_ROLES` there is bootstrap-only, read by `prisma/seed.ts`, and does
**not** retroactively update already-seeded role rows in a live database.

## Auth

Bcrypt password hashes, DB-backed sessions (cookie = session id, no JWT).
Credentials are never chosen by an admin — `generateTemporaryPassword()`
returns a plaintext once in the create/reset-password response; only the hash
persists. `resetPassword` also kills every existing session for that user.

## Document numbering

Always through `ctx.modules.settings.nextNumber(prefix)` — an atomic
`UPDATE ... RETURNING` against `settings_number_sequences`. Never format a
document number any other way; Postgres's row lock on the sequence row is
what makes concurrent callers safe without an explicit transaction.

## Recurring frontend patterns

- **Validation**: a `missing: string[]` array + inline red `Required: …`
  text + `disabled={missing.length > 0}` on submit. Applied uniformly across
  every create/edit form built or touched this project.
- **Searchable picker over a flat `<select>`**: `ProjectPicker`,
  `UnitPicker`, `ContactPicker` in `apps/admin/src/app/components/` — a text
  filter narrowing a capped (~50) result list via `@era/ui`'s `Combobox`
  primitive. `UnitPicker` composes `ProjectPicker` (with an optional
  `category` filter) rather than duplicating project-search logic.
- **Per-row local-state components for editable lists**, not a shared
  drawer/toggle. When a list of records (milestones, team members, awards,
  reservations in a table) each need their own inline edit form, give each
  row its **own** component instance keyed by the row's id
  (`<MilestoneRow key={m.id} .../>`) with its own `useState` seeded from
  props. This is deliberate: a single shared component whose *props* change
  as the user switches between records, without remounting, does **not**
  reset a plain `useState(props.x)` initializer — React only uses that as an
  *initial* value. Getting this wrong is the single most common bug in this
  codebase's edit UIs — see Durable Lessons below.
- **Singleton settings row**: `id: String @id @default("default")`
  (`CompanyProfile`, `AboutPageContent`). Read with `findUnique` (or a lazy
  "create if missing" wrapper for content that shouldn't need a manual seed
  to exist), write with `update` or `upsert`.
- **Single-slot image upload** (`User.photoUrl`, `AboutTeamMember.photoUrl`,
  `Project.sitePlanUrl`): `saveImage`/`deleteImage` from
  `platform/uploads.ts`, delete the old file before saving the new one. The
  shared `ImageGallery` admin component (crop-to-aspect, upload, remove) is
  reused across every place a photo gets attached, single-slot or gallery.

## Durable lessons — apply before repeating a mistake

1. **`useState(someProp)` is an *initializer*, not a live binding.** A
   component that's toggled open/closed via a prop (`open={!!selected}`)
   rather than conditionally *mounted* keeps its first render's state forever
   unless you either (a) give each distinct record its own component instance
   (preferred — see pattern above), or (b) explicitly track "last seen id" and
   re-seed state during render when it changes (the fallback used in
   `UnitDetailDrawer` and `PaymentPlanDrawer` before the per-row pattern
   became the default). This bug has recurred multiple times across this
   project's history — check for it explicitly in any new drawer/editor.
2. **A mutation whose `.error`/`.isPending` is shared across multiple rows or
   records** (one `useMutation()` instance reused for "confirm this
   reservation" across every row in a list) can show a *previous* record's
   error message on the next one you open. Call `.reset()` on every such
   mutation at the point you switch which record is active.
3. **Never close a drawer/dialog unconditionally right after firing a
   mutation.** Close only in `onSuccess`. (Found and fixed at least twice:
   Record Payment, Reservation's "Convert to contract".)
4. **Prisma's `omit` API may not actually be available even on a recent
   client version** — check the generated `index.d.ts` for the `*Omit` type
   before relying on it; an explicit `select` listing every wanted column is
   the reliable fallback (used to strip `passwordHash` from `identity`
   queries).
5. **A stray git repo can shadow this project's real one.** If `git status`
   ever looks bizarrely wrong (everything untracked, or tracked files that
   don't exist here), check `git remote -v` before assuming this project's
   `.git` is broken — a parent directory's unrelated `.git` can silently
   become the effective repo root if this one is ever missing. It happened
   once; see `progress.md`.
6. **Before trusting any "X is done" claim in this file or `progress.md`**
   for an area not touched recently, verify against the actual code
   (`grep`, open the router/service). These files describe a point in time
   and can go stale exactly like `CLAUDE.md` did once.
