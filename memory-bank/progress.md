# Progress

Stable narrative of what's built and how it got there. `activeContext.md` is
the "right now" companion to this — update that one for a shift in focus,
update this one when a whole area of work actually completes.

## What works (all real, not mock)

- **Identity/RBAC**: DB-backed roles/capabilities, full Users & Roles CRUD,
  real auth (bcrypt + DB sessions), temporary-password issuance.
- **CRM**: Contacts, Pipeline (Leads with real auto-assignment to the
  least-loaded agent), Tasks — per-agent ownership scoping, a real
  "Edit contact" form, Lead editing covering every field the schema supports.
- **Inventory**: the real 637-listing dataset scraped from `eracambodia.com`
  and `pointerasia.com` (see `apps/api/scripts/` and this file's "Incidents"
  section below for how it got wiped by a DB reset and recovered on
  2026-09-21) — 669 real projects / 688 units as of that recovery, 637 of
  the projects carrying real photos. This number moves with whatever's
  seeded locally at the time; don't treat any figure here as fixed — check
  `docker exec era-postgres psql -U era -d era -c "select count(*) from
  inventory_projects;"` if it matters, and if it ever comes back small
  again (~6 projects), that's the demo placeholder seed, not this real
  data — see the Incidents entry before assuming it needs re-scraping.
  Full CRUD on projects/blocks/units/unit-types/price-lists, structured
  Cambodia location picker, photo upload with cropping, a searchable
  unit/project/contact picker pattern used everywhere a long list needs
  picking from.
- **Sales**: Quotations (with sequential discount tiers, a real
  discount-approval gate above 15%, DRAFT-only editing, PDF generation),
  Reservations (manual creation, deposit editing, configurable hold
  duration, the saga-based HELD→CONFIRMED flow, expiry sweep), Contracts
  (Sign Contract with a real form + schedule preview, milestones
  auto-generated at signing, Terminate/Mark completed actions).
- **Finance**: Invoices, Payments (with proper error/pending UI, fixed a
  premature-drawer-close bug), Receipts, Commissions.
- **Settings**: Company profile, Tax rates, Number sequences, Payment Plan
  CRUD (was previously read-only reference data), and the About-page CMS.
- **`apps/client`**: real Properties list + detail pages (real images,
  real availability, real filters), a real lead-capture enquiry form
  wired into the same CRM the admin reads, a real About page (Overview/
  History/Team/Awards — Contact tab is static by design, out of scope).

## What's explicitly not real, and why

- **`apps/client`'s `ChatPage.tsx` has no real AI/LLM** — its Tier 0 fix
  (2026-09-21) connected it to real inventory data and real lead
  submission, but the conversation logic itself is still a scripted
  decision tree with keyword matching, not an LLM. Building a real one is
  a distinct, larger product decision that hasn't been made, not an
  oversight.
- **Real listing/team photos** — the upload pipeline exists everywhere it's
  needed; most rows just don't have a real photo uploaded yet. Placeholder/
  initials rendering is deliberate, not a bug, until real photos exist.

## How some non-obvious decisions were reached

- **Payment Plans were "reference data, read-only" until asked to be made
  editable.** Reworked into full CRUD (`sales.paymentPlans.*`) gated
  `settings:write` (not `sales:write` — this is admin configuration, not
  day-to-day sales work), with installments validated to sum to ~100%.
- **A quotation's `contactId`/`unitId`/`ownerId` are excluded from its edit
  input entirely** (not just disabled in the UI) — the reasoning written
  into the code itself: "changing the customer or unit isn't editing, it's
  a different quotation." The same reasoning was applied to a reservation's
  unit/contact/agent when its deposit-editing was added later — deposit can
  change, identity fields can't.
- **A contract's `completeContract` is manual-only on purpose, not an
  unfinished automation** — it might look like a missing "all invoices
  paid → COMPLETED" trigger, but the code comment on it explains why that
  would be wrong: completion tracks handover, not payment-in-full. Proven
  by real seed data: the "Post-handover 50/50" payment plan pays 50% of
  the price across 3 years *after* handover, so a payment-driven
  auto-complete would leave an already-handed-over contract stuck ACTIVE
  for years. Investigated 2026-09-21 as a candidate feature, and the user
  chose to keep it manual once this was surfaced — recheck this reasoning
  before ever building payment-driven contract completion.
- **The ownership-check shape (fetch record → `can(ctx.user.capabilities,
  '<module>:read:all')` → compare `ownerId`/`agentId` → `FORBIDDEN`) is now
  the standing convention for any mutation that acts on an existing owned
  row**, proven first in `sales.router.ts` (quotations, reservations) and
  extended to all of `crm.router.ts` in the 2026-09-21 audit (`contacts.
  update`/`.verifyKyc`, `leads.update`/`.changeStage`, `activities.
  toggleDone`). A record with a null `ownerId` (never explicitly assigned)
  still requires the module's `:read:all` capability to touch — that's a
  deliberate "unassigned means restricted, not open" choice, not an
  oversight. `activities.create` was also brought in line with `contacts.
  create`/`leads.create`'s use of `scopedOwnerId()` on its `ownerId` field,
  since it was the one create-style CRM mutation letting a plain `crm:write`
  holder assign a task to someone else. A same-day follow-up audited
  Inventory, Finance, and Marketing for the same gap and found the pattern
  doesn't apply to any of them — see `activeContext.md`'s "Known open items"
  for the per-module reasoning. The audit is complete; no modules remain
  queued for it.
- **`ChatPage.tsx` was explicitly left alone** during the Public Listings
  Plan even though it was the most visible remaining piece of mock data at
  the time; it got its own separate, smaller "Tier 0" pass later
  (2026-09-21) that connected it to real data without giving it real AI —
  building actual LLM-backed conversation is scoped, non-trivial product
  work (LLM choice, conversation persistence, what it's allowed to do)
  that's still a separate, not-yet-approved decision (Tier 1).
- **`apps/client` did not get a TanStack Query dependency** when it was
  wired to the real API, even though `apps/admin` uses it everywhere — the
  scope was two pages' worth of data fetching, and adding a new dependency +
  provider for that felt like more machinery than the job needed. Plain
  `useEffect`/`useState` around the tRPC client's promises was judged
  sufficient. Revisit if `apps/client` grows enough real-data pages that the
  lack of caching/reuse starts to hurt.
- **Team member photos deliberately were not carried over from the old mock
  `AboutPage.tsx`** — those were stock Unsplash photos standing in for named,
  real people, which is a worse thing to persist as "real data" than an
  honest placeholder. Every place a real name is paired with a photo in this
  system should follow the same rule: a real uploaded photo, or an honest
  fallback (initials/icon) — never a stock photo pretending to be someone.

## Incidents worth remembering

- **A stray, unrelated git repo at the machine's home directory was
  silently acting as this project's repo** for an unknown stretch of time
  (this project's own `.git` didn't exist). Discovered via a port conflict
  (a duplicate clone's leftover dev server squatting on `apps/client`'s
  port), traced back to the missing `.git`, fixed by initializing a real one
  here pointed at the correct GitHub remote. No damage occurred (nothing had
  ever been committed from here), but it's the kind of thing that could have
  silently sent a commit to the wrong project if unnoticed. See
  `techContext.md`'s "Environment gotcha" note for the exact check to run if
  `git status` ever looks wrong again.
- **`identity.users.list`/`.get` returned `passwordHash` over the wire** for
  an unknown period before being caught and fixed — a reminder that
  "obviously it wouldn't do that" is not a substitute for actually checking
  what a query selects, especially on `db.<model>.findMany`/`findUnique`
  calls with no explicit projection.
- **`ChatPage.tsx`'s quick-reply buttons were silently broken for an unknown
  period** — `handleOptionClick` set `input` state then called `handleSend()`
  from a stale closure that still saw the old (usually empty) `input`, so
  its `if (!input.trim()) return;` guard silently swallowed the click. 6 of
  the 9 lead-qualification steps offer only buttons, so this meant most
  real chat visitors clicking the suggested options (the flow's primary
  interaction) would see the conversation appear to freeze, with nothing in
  the console to suggest why. Caught 2026-09-21 while browser-verifying the
  customer site's DB connectivity end-to-end — reading the code wouldn't
  have caught it (the write path itself, `api.crm.public.submitLead`, was
  and is fine; the bug was entirely in whether the UI ever called it). Fixed
  by having `handleSend` accept an optional `overrideText` param so
  `handleOptionClick` passes the clicked value explicitly instead of relying
  on `input` state timing. A reminder: **a passing typecheck/lint and a
  code read that "looks right" don't catch stale-closure bugs in React
  event handlers** — only actually clicking through the UI does. When a
  handler both mutates state and, soon after (via `setTimeout` or a
  callback), reads that same state back, check whether it's reading current
  state or a value closed over at definition time.
- **`prisma/seed.ts` silently wiped the real, already-scraped 637-project
  Inventory dataset back to the small demo seed** — discovered and
  recovered 2026-09-21 (see "Where things stand" for the full story).
  `apps/api/scripts/` had a real scraping pipeline (`eracambodia.com` +
  `pointerasia.com`) that already ran once and replaced the demo Inventory
  with real data; at some point `prisma/seed.ts` (the demo/mock-data seed)
  ran again on top of it, unconditionally deleting Project/Unit/etc. first,
  silently erasing the real data — this memory bank's own "637 real
  projects" note had been present the whole time but a prior session, not
  recognizing it, rewrote it to match whatever the (demo) DB held instead
  of investigating the discrepancy. **Lesson: a memory-bank figure that
  doesn't match the live DB is itself a signal something may have been
  lost, not just staleness to silently correct** — before overwriting a
  specific, oddly-precise number like "637" with "whatever's there now,"
  it's worth asking why they differ. The exact trigger for that `db:seed`
  run was investigated thoroughly (see `techContext.md`'s "Root-cause
  investigation method" note) but never conclusively found — a Docker
  volume wipe was ruled out (the container's `Created` timestamp was still
  day one), and no matching command turned up in either of this project's
  two local Claude Code session transcripts or their 12 subagents. The
  recovery itself worked only because Postgres resets don't touch the
  filesystem — the actual downloaded photos were still sitting orphaned in
  `apps/api/uploads/`. **Resolved properly, not just patched**:
  `prisma/seed.ts` now has an `assertSafeToReset()` guard (added the same
  day) that refuses to run — no matter what invokes it, or why — if
  `Project` holds any row outside the demo dataset's own ids, unless
  `--force`/`SEED_FORCE=1` is explicitly passed. The exact trigger no
  longer needs to be known for this specific failure mode to be closed.
