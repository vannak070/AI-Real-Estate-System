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
- **Inventory**: 637 real projects / 893 real units, projects/blocks/units/
  unit-types/price-lists all real CRUD, structured Cambodia location picker,
  photo upload with cropping, a searchable unit/project/contact picker
  pattern used everywhere a long list needs picking from.
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
