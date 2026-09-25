# Progress

Stable narrative of what's built and how it got there. `activeContext.md` is
the "right now" companion to this — update that one for a shift in focus,
move work here once it's done and verified. Detail that only mattered while
debugging lives in git history, not here.

## What works (all real, not mock)

- **Identity/RBAC**: DB-backed roles/capabilities, full Users & Roles CRUD,
  real auth (bcrypt + DB sessions), temporary-password issuance.
- **CRM**: Contacts, Pipeline (Leads with real auto-assignment to the
  least-loaded agent), Tasks — per-agent ownership scoping, a real
  "Edit contact" form, Lead editing covering every field the schema supports,
  a Campaign picker on leads. Lead/contact **Source** is a key into the
  editable channel list (below).
- **Inventory**: real listings scraped from `eracambodia.com` and
  `pointerasia.com` (`apps/api/scripts/`) — **667 projects / 684 units** as
  of 2026-09-24 (45 ERA developer condos, re-scraped fresh that day + 592
  Pointer Asia + ~30 other ERA villas/rentals/commercial). The number moves
  with what's seeded locally; if it ever comes back ~6, that's the demo seed,
  not this data — read the Incidents below before re-scraping. Full CRUD on
  projects/blocks/units/unit-types/price-lists, structured Cambodia location
  picker, photo upload with cropping, searchable pickers. One shared
  New/Edit property form (`ProjectForm.tsx` + `projectFormState.ts`).
  - **"Show on website"** (`Project.isPublished`, default **false** for new
    listings) + bulk Publish / Make private.
  - **Development vs individual** (`Project.isDevelopment`) decides whether
    a listing lives on the admin's Projects page or Sales/Rent.
- **Sales**: Quotations (sequential discount tiers, discount-approval gate
  above 15%, DRAFT-only editing, PDF), Reservations (manual creation, deposit
  editing, configurable hold, saga-based HELD→CONFIRMED, expiry sweep),
  Contracts (Sign Contract form + schedule preview, auto milestones,
  Terminate/Complete).
- **Finance**: Invoices, Payments, Receipts, Commissions.
- **Marketing**: Campaigns with create/edit/delete, a permanent ad-link
  code (`?utm_campaign=<code>` on the website, `t.me/<bot>?start=<code>` on
  Telegram) that auto-links the resulting leads, server-side stats
  (leads/deals/revenue/CPL/ROI). **Channels are an admin-editable list**
  (create, rename, hide, delete-when-unused) — no enum, no migration for a
  new channel. Capability `marketing:write` (ADMIN, MARKETING).
- **Settings**: Company profile, Tax rates, Number sequences, Payment Plan
  CRUD, About-page CMS.
- **AI assistant** (`modules/assistant/`, Claude Haiku 4.5 via the Anthropic
  API, tool use over real Inventory/CRM only): the website chat
  (`ChatPage.tsx`) and the **Telegram bot** (`modules/messaging/`,
  @ERACambodiaAI_bot) share one engine. Search by type/area (with spelling
  aliases)/budget/bedrooms/size/name; saves and corrects leads; on Telegram
  sends numbered photo cards with "More details"/"Book a viewing" buttons and
  understands swipe-replies. **Inbox** (`/inbox`, 2026-09-25): staff see bot
  chats, take one over (the AI goes quiet), reply as themselves through the
  bot and hand back; the AI flags chats where a customer wants a person, and
  a handled chat returns to the AI automatically if the customer waits 30 min
  (or after 12 h idle). **AI Knowledge** (admin page, `/ai-knowledge`) —
  company answers written by ERA staff, given to the AI on every chat.
  Returning customers with a saved lead are never asked for their details
  again. Website chat: formatted replies, compact photo cards (price/month,
  beds, m²), starter buttons, New chat, Khmer/Chinese-safe Enter.
- **Online demo** (2026-09-25): https://demo.yarvorax.com +
  https://admin.demo.yarvorax.com on one DigitalOcean droplet, deployed with
  `Dockerfile` + `deploy/` (Caddy + HTTPS, nightly backups, hidden from Google),
  Telegram bot on its webhook. Guide: `deploy/README.md`.
- **`apps/client`**: Properties list (tabs Exclusive Property / For Sale /
  For Rent, client-side pagination 21/51/99) + detail pages, a real
  lead-capture enquiry form, a real About page (Contact tab static by
  design), the AI chat, campaign attribution from ad links.

## What's explicitly not real, and why

- **Some listing photos and all team photos** — the upload pipeline exists
  everywhere; 30 published listings and every About-page team member simply
  have no real photo yet. Placeholder/initials rendering is deliberate.
- **Listing data gaps** the AI can't work around: amenities are empty on all
  667 listings, 217 have no bedroom data, there's no description field.

## How some non-obvious decisions were reached

### Inventory & the customer site
- **`isPublished`** — before it, every Inventory row was on the website the
  moment it was created. Migration `20260924042659_add_project_is_published`
  set all 667 existing rows to `true` so nothing changed for customers.
  Enforced server-side in the three public reads (`listPublicProjects`,
  `getPublicProject` → null for hidden, `listPublicUnits`), which also covers
  the AI. Every import/seed script sets `isPublished: true` explicitly.
  Sold Out/Completed are **not** auto-hidden (user agreed).
- **`isDevelopment`** replaced the old "more than 1 unit row = project" rule,
  which filed the 45 real ERA developer towers (1 sample unit each) under
  Sales. Backfilled `true` where `developer IS NOT NULL` (exactly those 45).
  When the user said "remove the 8 multi-unit" listings from Projects, they
  were **moved to Sales/Rent, not deleted** (the user was told; say so again
  if deletion was meant).
- **Customer tabs**: Exclusive Property = published development projects
  (first) + EXCLUSIVE-badged listings; For Sale / For Rent = individual
  listings only, newest first (107 / 193 / 429 on 2026-09-24). The 45
  development projects were re-created on 2026-09-24, so they're the newest
  rows — that's why they're *excluded* from For Sale, not just re-sorted.
  A CONDO/BOREY "Project" bucket was tried and rejected by the user — don't
  re-introduce it without asking. Page sizes 21/51/99 (multiples of 3 for
  the 3-column grid).
- **ERA re-scrape (2026-09-24)**: "delete the existing Project" would also
  have destroyed the 592 Pointer Asia listings (different source, no
  recovery trail), so the user chose to replace only the ERA-sourced rows.
  `scripts/refresh-era-sale-condos-2026-09-24.ts` + its JSON (kept, reusable)
  recreated the 45 still-live projects with current name/location/price/
  photo, carried developer/tenure/floors forward, and dropped the 2 no longer
  live. Sales/CRM were left untouched by instruction — old demo transactions
  pointing at deleted unit ids are dangling, an accepted tradeoff.
- **Add/Edit form unification**: the two drawers had drifted (Add couldn't
  set an EXCLUSIVE badge). Fields can now be cleared (`projectInput` takes
  `.nullable()`, form sends `null`). A "Phase 2" (price/bed/bath on Add,
  auto-creating the first unit) was proposed, not approved.

### Marketing
- **Campaign attribution rule**: each ACTIVE/COMPLETED contract is credited
  to exactly one campaign — the contact's latest campaign-linked lead
  created on/before the contract — so no double counting and no credit for
  sales made before the customer saw the ad. Computed server-side so the
  Marketing role sees real revenue without Sales access.
- **Campaign code is immutable** (changing it would break running ads). A
  campaign with linked leads can't be deleted — set it to Ended. The 8 demo
  campaigns were deleted on request (their leads kept, unlinked). Website
  attribution: `?utm_campaign=` stored 30 days, last click wins.
- **Channels as data, not an enum** (migration
  `20260924080000_editable_channels`, hand-written, data-preserving): each
  channel has a permanent `key` stored on leads/contacts/campaigns, so a
  rename never touches old records. WEBSITE is `isSystem` (renamable, never
  hidden/deleted — the site writes it). The old enum's `CAMPAIGN` source got
  a **hidden** channel so its 6 leads/6 contacts keep a label. A channel in
  use can only be hidden. The old hand-ticked "connected" flag was dropped;
  bot connection is read live from `messaging.status`.

### AI assistant
- **Tier 0 → Tier 1** were separate, explicitly approved decisions: Tier 0
  (2026-09-21) put the old scripted chat on real data; Tier 1 (2026-09-24)
  made it a real Claude conversation. Model **Haiku 4.5** for the $5 demo
  budget; Sonnet 5 (~2× price) is the next lever if comprehension is weak —
  not changed without the user.
- **Tools go through `ctx.modules.inventory`/`ctx.modules.crm`** — same
  module rule as everything else; no new data path.
- **Cost guardrails**: 40 messages per conversation, 2,000 characters per
  message, 20 requests/minute per IP (website) or per chat (Telegram), at
  most 4 tool rounds per reply, 8 search results, 5 photo cards.
- **Guarantees live in code, not the prompt** (see Incidents): a rejected
  save makes the server write the reply itself; chat-app replies are
  stripped of markdown (`toPlainText`); a property id from the model is
  checked against real published projects before it's stored or shown.
- **Website chat is stateless server-side** (browser keeps history in
  `sessionStorage`); a correction updates the same lead via an HMAC-signed
  `leadToken` (`CHAT_TOKEN_SECRET`). **Chat apps are not** — platforms send
  only the newest message, so `messaging_conversations`/`messaging_messages`
  store history (last 20 sent to the model), the lead link and a dedupe key.
- **Telegram transport**: long polling when `PUBLIC_API_URL` is unset (works
  on localhost, no tunnel), signed webhook when it's set. Photos are local
  `/uploads` files Telegram can't fetch from localhost, so they're uploaded
  from disk once and re-sent by `file_id`. The stored transcript replaces
  each link with "[Photo card N shown: …]" so "the second one" resolves.
- **AI Knowledge is injected whole** into the instructions (no retrieval
  step that could miss the right entry), capped at 40,000 active characters,
  prompt-cached. Answers are written by ERA staff — none were pre-written,
  because legal/process facts must be ERA's own.
- **Location aliases**: listings use romanised Khmer ("Boeng Keng Kang",
  "Tuol Kouk"), customers type "BKK1"/"Toul Kork" — `LOCATION_ALIASES` in
  `inventory.service.ts` maps them (common Phnom Penh areas + Sihanoukville).

- **Returning customers**: only the last 20 messages reach the model, so the
  server looks up the conversation's lead (Telegram `leadId`, website verified
  `leadToken`) and tells the AI the details are on file (`onFileNote`) —
  never ask again, book with them.
- **Website chat shows cards under the text**, so the prompt makes the model
  summarise (count + 1–2 highlights + one question) instead of listing every
  property twice.

### Inbox & human handoff
- **Visibility follows CRM ownership**: `crm:read:all` sees every chat;
  others only chats whose lead they own or that they're handling; a chat with
  no lead yet is managers-only ("unassigned means restricted").
- **While staff handle a chat the AI is silent** (an AI reply already in
  flight is dropped); staff replies go out through the bot as "<First name>: …".
- **Auto hand-back**: customer waiting 30 min with no staff reply → AI
  answers and the chat stays flagged; 12 h with no activity → quiet return.
  Conditional updates so a staff reply at the same moment wins.
- **`request_agent`** (chat apps only) lets the AI flag "wants a person" —
  it may only say someone was notified after calling it.

### Deployment
- **One VPS, everything same-origin**: Caddy serves both SPAs and forwards
  `/trpc /uploads /health /webhooks` to the API on each site's own address —
  no CORS, no separate API domain, one build works for IP or domain.
- **Behind the proxy** the API must set `TRUST_PROXY` (else one shared chat
  rate limit for every visitor) and `COOKIE_SECURE` only with HTTPS.
- **$6 / 1 GB droplet** runs the stack (~350–540 MB) but can't build it →
  `push.sh --build-on-mac` (buildx linux/amd64 on the Mac, `docker save | ssh
  docker load`), with `--force-recreate` (Compose missed a reloaded image) and
  image pruning (disk is 25 GB).
- **A laptop never takes the bot from a server**: polling copies refuse when
  a webhook points elsewhere (they used to delete it silently).
- **Never deploy to the Yarvora-X droplet (159.223.84.89)** — it runs the
  live yarvorax.com website (nginx, 512 MB).

### Sales, CRM, other
- **Payment Plans** became full CRUD gated `settings:write` (admin
  configuration, not day-to-day sales).
- **A quotation's contact/unit/owner are excluded from its edit input** —
  "changing the customer or unit isn't editing, it's a different quotation."
  Same for a reservation's unit/contact/agent; only its deposit can change.
- **`completeContract` is manual on purpose** — completion tracks handover,
  not payment-in-full; the "Post-handover 50/50" plan would leave a
  handed-over contract ACTIVE for years under a payment trigger. User chose
  to keep it manual (2026-09-21). Don't re-flag it as missing.
- **Ownership checks** (fetch record → `<module>:read:all` or owner, else
  `FORBIDDEN`) are the convention for mutations on owned rows — all of CRM
  and Sales. Inventory, Finance and Marketing don't need them: their rows
  have no per-agent owner and their write capabilities are held only by
  roles meant to see everything. A null `ownerId` means restricted, not open.
- **`apps/client` has no TanStack Query** — plain `useEffect`/`useState` was
  enough for its few pages.
- **No stock photos for real people or properties** — a real upload or an
  honest placeholder, never a stand-in.

## Earlier completed work (2026-09-21 and before), in brief

- Public Listings Plan: client Properties pages + enquiry form on
  `inventory.public.*` / `crm.public.submitLead`.
- About-page CMS (`AboutPageContent`/`AboutMilestone`/`AboutTeamMember`/
  `AboutAward`, `prisma/seed-about.ts`, idempotent).
- Reservation & Contract lifecycle overhaul; reservation form polish.
- CRM ownership-check audit (commit `fc0a846`).
- Contacts/Pipeline default to "Everyone" for `crm:read:all` holders (chat
  leads auto-assign to agents, so admins saw an empty "My" tab).
- `ChatPage.tsx` (pre-Tier-1) fixes: quick-reply stale closure, malformed
  phone/email silently dropping leads, conversation persistence.
- `prisma/seed.ts` `assertSafeToReset()` guard (refuses to wipe non-demo
  Inventory without `--force` / `SEED_FORCE=1`).
- `identity.users.*` `passwordHash` leak fixed (explicit `select`).

## Incidents worth remembering

- **The Inbox's reply box was invisible** (user on the demo, 2026-09-25: "take over, but cannot
  chat"). A long thread in a fixed-height flex/grid panel grew to its full height (flex/grid
  children default to `min-height: auto`) and pushed the composer below the clipped edge — it
  was never tested with a long conversation because the agent can't sign in to the admin. Fixed
  with `min-h-0` on the scroll area and its parents + `grid-rows-[minmax(0,1fr)]`; verified by
  rebuilding the same structure with 40 messages on the signed-out admin page (composer 2,123 px
  → 673 px, panel bottom 740). **Lesson:** any scrolling list inside a fixed-height flex/grid
  panel needs `min-h-0`; when a screen can't be opened signed-in, reproduce its layout with a
  long fake list.
- **The real Inventory was silently wiped back to the demo seed** (found and
  recovered 2026-09-21). `prisma/seed.ts` had run on top of the scraped
  637-project dataset and deleted it. Recovery worked only because the
  downloaded photos were still on disk under their old project ids: the
  orphaned folders' cuid order recovered each dataset's creation order, and
  `scripts/recover-era-project-images.ts` + `recover-pointer-asia-listings.ts`
  (kept) re-attached them. Those orphaned folders were then deleted — **if
  Inventory is ever reset again, there's no trail left; the only path back is
  re-scraping both sites.** The trigger was never found (Docker volume ruled
  out; not in any session transcript — see `techContext.md`'s investigation
  method). Resolved by making it impossible: the `assertSafeToReset()`
  guard. **Lesson:** a memory-bank figure that doesn't match the live DB is a
  signal something may have been lost, not staleness to silently correct.
- **The AI claimed to have saved a lead without calling `submit_lead`**
  (2026-09-24, caught by checking Postgres). A friendly reply and a 200 are
  not proof an action happened. Fixed by prompt rule; the related
  "claimed an update after the server rejected it" case is now a server
  guarantee. The same pass caught the model passing a property *name* as
  `preferredProjectId` — now validated server-side.
- **Telegram replies came out with literal `**asterisks**`** despite a
  "no markdown" rule — now stripped in code. Rule of thumb: an instruction
  the model must never break gets enforced in code.
- **The AI copied an internal history label into a customer reply** and
  **showed photos from an older search that didn't match the new budget**
  (2026-09-25, both caught by the auto hand-back test before any customer
  saw them) — fixed in code (`stripHistoryMarkers`; this-turn-only cards
  after a lookup). Same lesson again: whatever we write into the model's
  history, it may echo back.
- **Telegram photos silently vanished** (user report, 2026-09-24): cards were
  built only for properties a tool returned in the same turn, but links were
  stripped regardless, so a follow-up sent "here is the link:" and nothing.
  Fixed by re-looking-up linked ids. **Lesson:** when you strip something
  from output, check the replacement always exists.
- **"BKK1" search found 5 listings instead of 93** — area spelling mismatch
  (see Location aliases). Found only by counting results against the DB.
- **A hand-written migration failed midway** (editable channels): an INSERT
  ran before the old NOT NULL column was dropped. Postgres ran it in one
  transaction, so nothing was half-applied — fix the SQL,
  `prisma migrate resolve --rolled-back <name>`, `migrate deploy` again.
  Check `\d <table>` before assuming a partial state.
- **A stray git repo at the home directory acted as this project's repo**
  (this project's `.git` was missing). Fixed; see `techContext.md` for the
  check to run if `git status` looks wrong.
- **`identity.users.list`/`.get` returned `passwordHash`** for an unknown
  period — always check what a query selects.
- **`ChatPage.tsx`'s quick-reply buttons were silently broken** (stale
  closure read the old `input` state). Typecheck and a code read didn't
  catch it; clicking through did.
- **A hand-off checkpoint's "already done" list wasn't done** — a function
  was defined but never called. Verify a checkpoint against the code before
  building on it.
- **A Telegram bot token and an Anthropic key were pasted into chat** by the
  user. Both are only in the git-ignored `.env`; the Telegram token still
  needs `/revoke` + re-set before real customers use the bot.
