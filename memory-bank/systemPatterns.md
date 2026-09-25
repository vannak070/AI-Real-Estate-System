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
- **A cross-module value that isn't an id is still a bare key, validated
  through the owner's API** — e.g. lead/contact `source` and campaign
  `channel` are `marketing_channels.key` strings; CRM checks them with
  `ctx.modules.marketing.isActiveChannel(key)`, never a join.
- **Background work** (the Telegram poller) uses the `AppModule` `start`/
  `stop` hooks (`platform/module.ts`, run by `app.ts` after every module has
  registered / on shutdown) — `ctx.modules.*` is only safe from `start` on.

## HTTP: tRPC end to end, two deliberate exceptions

- Every module gets a `*.router.ts` composed in `src/trpc/root.ts`. The only
  plain REST endpoints are `/health` and chat-platform webhooks
  (`POST /webhooks/telegram`, in `modules/messaging/index.ts`'s `routes`) —
  platforms post their own payload format. A webhook verifies the platform's
  secret before doing anything, answers 200 at once and works in the
  background, and dedupes on the platform's message id (retries happen).
- **`withCapability(cap)`** gates a protected procedure server-side against
  `@era/contracts`'s `ROLE_CAPS` — the same map `apps/admin` uses to gate its
  own UI, so a hidden button and a blocked request are backed by the same rule.
- **`publicProcedure`** (no capability check) is how `apps/client` talks to
  the backend with no auth — used for read-only public projections
  (`inventory.public.projects/units`, `settings.public.about`) and the write
  paths a stranger can trigger: `crm.public.submitLead` and
  `messaging.web.send`/`.history` — the website chat (whose `submit_lead`
  tool creates/updates leads; rate-limited per IP; a conversation is reached
  only by its random token). Public reads of Inventory **must filter
  `isPublished: true`** — new listings are hidden by default. A public
  procedure's result must be a **hand-written safe projection**, same
  discipline as a cross-module `index.ts` — explicitly list what's exposed,
  don't just return the Prisma row (see `listPublicProjects` excluding
  `gdv`/`soldValue`/`priceLists`).
- **Ownership scoping**: a caller without `<module>:read:all` is silently
  scoped to their own record set. The reusable helper is
  `apps/api/src/trpc/scoping.ts`'s `scopedOwnerId(user, allCap, requested)`,
  used on `list`/`create` inputs; a `get`/mutation on a *specific* id does its
  own explicit check (`!can(ctx.user.capabilities, allCap) && row.ownerId
  !== ctx.user.id` → `FORBIDDEN`). Applied across all of CRM and Sales
  (audit completed 2026-09-21); Inventory, Finance and Marketing don't need
  it — see `progress.md` for why.

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
6. **Anything an LLM must never get wrong is enforced in code, not asked for
   in the prompt.** Seen three times: the model claimed a save after the
   server rejected it (server now writes that reply), used markdown on
   Telegram (stripped by `toPlainText`), and passed a name where an id was
   required (ids are checked against real published projects). Prompts steer;
   code guarantees. And verify an AI "done" against the database, not its
   reply.
7. **When you remove something from output, make sure its replacement
   always exists.** Property links were stripped from Telegram replies but a
   photo card was only built in some cases — the customer got "here is the
   link:" and nothing.
8. **Count results against the database when testing search.** "BKK1"
   quietly matched 5 listings instead of 93 (spelling variants) — nothing
   errored, the answers just looked plausible.
9. **Before trusting any "X is done" claim in this file or `progress.md`**
   for an area not touched recently, verify against the actual code
   (`grep`, open the router/service). These files describe a point in time
   and can go stale exactly like `CLAUDE.md` did once.
