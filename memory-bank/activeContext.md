# Active Context

**This file changes often — treat it as "what's true right now," and update
it (don't just append to it) whenever the current focus shifts.**
`progress.md` is the longer-lived companion: what's done, in a stable
narrative form.

## Where things stand (2026-09-21)

**Every screen in both `apps/admin` and `apps/client` is now backed by the
real API — including `apps/client`'s `ChatPage.tsx`**, whose Tier 0 fix
(2026-09-21) made it read real inventory and submit real leads instead of
`@era/mock-data`. It is still a scripted decision tree, not an actual
LLM/AI — that's a separate, not-yet-approved product decision (Tier 1).
`@era/mock-data` now has zero consumers in `apps/client` or `apps/admin`;
confirm that's still true before assuming so (`grep -rl "@era/mock-data"
apps/*/src`).

Most recent work, newest first:

1. **`prisma/seed.ts` now refuses to wipe non-demo data — safety guard added
   (2026-09-21)**, closing the loop on item 2 below. New `assertSafeToReset()`
   runs before `reset()`: if `Project` holds any row whose id isn't one of
   `erpSeed.projects`' own ids (i.e. anything this seed script didn't itself
   create — the real 637-listing dataset, or any other real/richer data),
   it prints a clear explanation + the exact incident it's guarding against
   and exits 1 without touching anything. `--force` (CLI arg) or
   `SEED_FORCE=1` (env var) overrides it for a genuinely intended wipe.
   Verified live: ran `tsx prisma/seed.ts` with no flag against the real
   669-project Inventory — refused, exit code 1, `select count(*) from
   inventory_projects` confirmed still 669 afterward. Root cause of the
   original wipe (item 2) was never conclusively found (see that entry) —
   this guard makes the actual mechanism not matter: nothing running
   `db:seed`, deliberately or accidentally, through any channel, can repeat
   it without explicitly opting in. `CLAUDE.md`'s Commands section updated
   to describe the guard instead of just "optional demo data."
2. **Real 637-project scraped dataset recovered after a DB reset wiped it
   (2026-09-21)** — Inventory is now the real, previously-scraped dataset
   again, not the small demo seed. What happened: `apps/api/scripts/`
   contains a real scraping pipeline (`reseed-inventory-real-data.ts`,
   `rescrape-era-projects-v2.ts`, `seed-pointer-asia-listings.ts`,
   `seed-blocks-and-pricelists.ts` + their JSON source files —
   `era-projects-detail.json`, `era-projects-image-manifest.json`,
   `pointer-asia-seed-data.json`) that had, at some earlier point, replaced
   the placeholder demo inventory with 637 real listings scraped from
   `eracambodia.com` (45 sale/condo projects with real per-unit data +
   2 real images each) and `pointerasia.com` (592 listings with a real
   cover photo each) — this is where the "637 real projects" figure in
   this memory bank came from; a prior sweep of this file had wrongly
   treated that as stale/wrong and rewritten it around whatever the DB
   held at the time. At some point since, a full DB reset (`prisma migrate
   reset` or equivalent) dropped that real data and re-ran the small
   `prisma/seed.ts` demo seed (the 6-project placeholder set this memory
   bank was describing right up until this entry) — **but the actual
   downloaded photo files were never deleted**, since a DB reset never
   touches the filesystem; they sat orphaned under their old (now
   nonexistent) project ids in `apps/api/uploads/projects/`.
   Recovery (no re-scraping needed — verified live, not assumed):
   1. Captured the 45 ERA-image and 592 Pointer-Asia-image orphaned upload
      folders' names, sorted (Prisma's default `cuid()` sorts
      lexicographically = chronologically — confirmed against file mtimes)
      — this recovers each dataset's original creation order.
   2. Ran `reseed-inventory-real-data.ts` as-is (deletes+recreates all
      Inventory; 77 real ERA-sourced projects: 45 sale/condo + villas/
      flat-houses/rentals/commercial — the demo prj-1..prj-6 and their 1,044
      units are gone, and any demo Sales/CRM rows that pointed at those unit
      ids are now dangling references, same accepted tradeoff the script's
      own docstring documents).
   3. Wrote `recover-era-project-images.ts` (new, kept) — matches each
      fresh ERA project to its `era-projects-detail.json` record by
      normalized/fuzzy name (handles diacritics, apostrophe-curl variants,
      suffix differences, and one real typo — "Piccasso City Garden" in the
      seed script vs "Picasso City Garden" scraped — via a duplicate-letter-
      collapsing fuzzy fallback), then copies that record's 2 images from
      its matched orphaned folder (by recovered order-index) into the new
      project's uploads folder. All 45/45 matched correctly (verified by
      printing and reading the full match report); the 2 hand-added
      projects with no scrape record ("The Bridge - Soho Units", "Olympia
      City") correctly got no images, not a wrong image.
   4. Wrote `recover-pointer-asia-listings.ts` (new, kept) — recreates all
      592 Pointer Asia listings (didn't exist yet post-reseed) from
      `pointer-asia-seed-data.json`, pairing record `i` with recovered
      folder `i` (order-index, no name-matching needed/possible here).
      592/592 images attached, 0 missing.
   5. Ran `seed-blocks-and-pricelists.ts` (idempotent, unchanged) for
      sample blocks/price lists across all 669 resulting projects.
   6. Deleted the now-redundant old orphaned upload folders (copies exist
      under the new ids) — freed ~177MB — and the temporary recovery
      manifests.
   Final state (verified via `psql` + live browser network trace on
   `/properties`, not just the script's own success log): 669 total
   projects (77 ERA-sourced + 592 Pointer Asia), 637 of them with real
   photos (682 images total — the other 32 are villas/rentals/commercial
   listings that were never part of the photo scrape, same as before the
   reset), 688 units. `/properties` now shows genuinely distinct real
   photos per listing instead of one repeated stock fallback.
   **If this ever needs redoing**: the two new recovery scripts only work
   because the orphaned upload folders existed — if inventory ever gets
   reset again *after* this recovery, there is no more orphan trail to
   recover from (the old-id folders were deleted in step 6). At that point
   the only path back is re-running the original three scripts, which
   requires re-scraping both source sites (their staging image folders were
   deleted by design after their first run, per each script's own
   docstring). The actual trigger for this reset was investigated (git
   history + both local Claude Code session transcripts for this project +
   their subagents + shell history — see `techContext.md`'s "Root-cause
   investigation method" note for how) but never conclusively identified;
   the Docker volume itself was ruled out (container never recreated since
   day one), and no `db:seed`/`migrate reset` invocation could be found in
   any traceable log, so it likely happened through some channel outside
   what's inspectable here. Rather than keep hunting, item 1 above closes
   this by making the mechanism not matter — `prisma/seed.ts` now refuses
   to run against non-demo data at all.
3. **`ChatPage.tsx` quick-reply buttons were silently broken — fixed
   (2026-09-21)** — found while verifying the customer site's DB
   connectivity end-to-end (see `techContext.md`'s browser-verification
   note for the general method). `handleOptionClick` called `setInput(option)`
   then, 100ms later, `handleSend()` — but that `handleSend` reference was a
   stale closure capturing `input` from the render *before* the click, so it
   still saw the old (usually empty) `input` and its `if (!input.trim())
   return;` guard silently no-op'd. Reproduced live: clicking any quick-reply
   button (Buy/Rent, budget, location, unit type, timeline — 6 of the
   conversation's 9 steps) populated the text box but sent nothing, with no
   visible error — a real user tapping the suggested buttons (the flow's
   primary designed interaction) would see the conversation appear to freeze
   after the first question. Fixed by giving `handleSend` an optional
   `overrideText` param so callers can pass the value explicitly instead of
   relying on `input` state timing; `handleOptionClick`'s
   `handleSend()` → `handleSend(option)`. Caught and fixed a second bug this
   introduced: the Send button was wired as `onClick={handleSend}`, which
   after the signature change would pass the click `SyntheticEvent` as
   `overrideText` — changed to `onClick={() => handleSend()}`. Verified live:
   walked the full 9-step flow via buttons only (no manual Send clicks) for
   both a Buy and a Rent path, confirmed `crm.public.submitLead` still fires
   and a correct Contact/Lead/NOTE lands in Postgres, then deleted the test
   rows. The two option-branches that don't route through `handleSend`
   (property-specific quick actions, and the post-summary follow-up options)
   were never affected — they push messages directly.
4. **"Auto-complete contract on all-invoices-paid" investigated and rejected**
   (2026-09-21) — this was on the open-items list as a missing automation,
   but `sales.service.ts`'s `completeContract` already has a deliberate
   comment explaining why it's manual-only: a contract can be COMPLETED
   before the last instalment clears (handover-driven, not payment-driven).
   Confirmed against real seed data — the "Post-handover 50/50" payment
   plan spreads 50% of payment across 3 years *after* handover, so
   auto-completing on "all invoices paid" would leave a handed-over
   contract stuck ACTIVE for years. Asked the user how to proceed
   (notify-only on Handover-milestone-done, auto-complete on
   Handover-milestone-done, or leave manual) — user chose to leave it
   manual. No code changed; this closes the open item as "already correct
   by design," not "still needs doing."
5. **CRM ownership-check audit** (2026-09-21, commit `fc0a846`) — closed the
   gap flagged below: `crm.router.ts`'s `contacts.update`, `leads.update`,
   `contacts.verifyKyc`, `leads.changeStage`, and `activities.toggleDone` now
   all fetch the record first and throw `FORBIDDEN` unless the caller holds
   `crm:read:all` or owns it — the same fetch-then-check shape
   `sales.router.ts`'s `quotations.update` established. `activities.create`
   was also missing `scopedOwnerId()` on its `ownerId` field (unlike
   `contacts.create`/`leads.create`, it passed the input straight through,
   letting a plain agent assign a task to someone else) — fixed to match.
   New `crm.service.ts` `getActivity(id)` supports the toggleDone check,
   mirroring the existing `getContact`/`getLead`. Null-owned records (e.g. an
   auto-logged `STATUS_CHANGE` activity, or a contact created before an owner
   was assigned) require `crm:read:all` to touch, same rule `contacts.get`/
   `leads.get` already applied — not a new behavior, just extended
   consistently. A follow-up pass the same day audited Inventory, Finance,
   and Marketing for the same gap and found none apply — see "Known open
   items" below for why. The ownership-check audit is now complete
   module-by-module; no more modules are queued for it.
6. **Documentation consistency sweep** — after the Tier 0 fix below shipped,
   corrected every file in this session that still claimed `ChatPage.tsx`
   was "the only remaining mock screen, zero backend" (this file,
   `progress.md`, `productContext.md`, `CLAUDE.md`, `claude/config.md`, and
   this assistant's own private memory) to instead say it's connected to
   real data but still not a real AI. Pure doc correction, no code changed.
7. **`ChatPage.tsx` Tier 0 fix** — the "AI Property Assistant" widget was
   auditing as fully disconnected: hardcoded `@era/mock-data` properties
   (stale `P001`-style ids that no longer matched real project ids after
   the Public Listings Plan), a false "securely stored in Odoo CRM" claim,
   and fabricated booking-confirmation text. Fixed to fetch real projects/
   units from `inventory.public.*` and submit real leads via
   `crm.public.submitLead`; removed the `@era/mock-data` dependency from
   `apps/client/package.json` entirely (it was the last consumer). Still
   no LLM — free text is matched with simple heuristics, not understood.
   Tier 1 (real LLM integration) was explicitly scoped out and not done.
8. **`ManageAboutPage` CMS** — was pure decorative `useState`, is now a real
   backend (new Prisma models: `AboutPageContent`/`AboutMilestone`/
   `AboutTeamMember`/`AboutAward`) + full admin editor + the client's
   `AboutPage.tsx` Overview/History/Team/Awards tabs reading real data.
   Content was seeded from what used to be hardcoded on the client page
   (`prisma/seed-about.ts`, idempotent, safe to re-run). Team photos are
   deliberately blank (initials avatar) rather than carrying over the mock's
   fake stock photos.
9. **Public Listings Plan** — `apps/client`'s Properties list/detail pages
   and a real lead-capture form, wired to new `inventory.public.*` and
   `crm.public.submitLead` endpoints. Full loop verified: a public enquiry
   really lands as a Lead the admin Pipeline shows.
10. **Reservation form polish** — deposit auto-suggest, configurable hold
   duration, required payment plan + schedule preview on Sign Contract, a
   search box on the Reservations list.
11. **Reservation & Contract lifecycle overhaul** — manual reservation
    creation (previously only reachable via accepting a quotation), a real
    Sign Contract form, auto-generated milestones at signing (previously
    never created outside the seed script), Terminate/Complete contract
    actions, ownership checks added to every sales write mutation that
    lacked them.
12. **`identity.users.list`/`.get` passwordHash leak** — fixed (explicit
    `select`, not Prisma `omit` — see `techContext.md` for why `omit` didn't
    work here).
13. **This memory bank + `CLAUDE.md`/`claude/config.md` refresh** — both rule
    files had drifted (still describing an old "Phase 8, partially wired"
    state); corrected to match the above.

## Known open items (not yet done)

- **`ChatPage.tsx` is not a real AI** — it's connected to real data (Tier 0,
  done 2026-09-21) but is still a scripted decision tree with no LLM/NLP.
  Building an actual AI-backed version (Tier 1) is a separate product
  decision, not a task to pick up casually.
- ~~Real photos (Inventory)~~ — **closed 2026-09-21.** What looked like "no
  photos ever uploaded" turned out to be a wiped-then-recovered real
  dataset — see item 1 in "Where things stand" above for the full story.
  669 real projects now exist, 637 with real recovered photos (682 images).
  Not closed: **About-page team members still have no real photo** — that
  one really is "content not supplied yet," a separate, unrelated code path
  (`AboutTeamMember`, not `Project`), with no equivalent orphaned-file trail
  to recover from.
- **File-picker photo upload's `<input type=file>` UI flow specifically is
  still untested** — the backend it calls (`inventory.projects.addImage`/
  `.removeImage`: auth, capability check, disk write via `saveImage`, DB
  update, `/uploads/` static serving) was verified live and works correctly
  (2026-09-21, tested directly against the tRPC endpoint with a 1×1 test PNG,
  then cleaned up). What's *not* been driven end-to-end by an agent is the
  actual `ImageGallery.tsx` click → native file picker → `CropModal` → confirm
  flow, because no browser-automation toolset available in these sessions can
  select a file in a native OS file dialog. If a user reports "Add photo"
  not working despite this backend check passing, the bug is almost
  certainly in that UI chain (`apps/admin/src/app/components/ImageGallery.tsx`),
  not the API.
- ~~Ownership checks on mutations are not universal~~ — **closed 2026-09-21.**
  Full sweep now done across every module: CRM (`contacts.update`/
  `.verifyKyc`, `leads.update`/`.changeStage`, `activities.create`/
  `.toggleDone`) and Sales (quotations, reservations/contracts/milestones)
  both needed and now have the fetch-then-check pattern. Inventory,
  Finance, and Marketing were audited and need **no** change: Inventory's
  models carry no `ownerId`/`agentId` at all (shared company assets, gated
  by a single `inventory:write` held only by SALES_MANAGER/ADMIN — no agent
  ever shares that capability with a peer whose rows they shouldn't touch);
  Marketing has no write capability in the `Capability` union at all (only
  `channels.list`/`campaigns.list` reads exist); Finance's `Commission.
  agentId` is descriptive data, not an access boundary — `finance:write`/
  `commission:approve` are flat capabilities (no `:all` split) held only by
  FINANCE/ADMIN, both meant to see every commission company-wide. The
  pattern only ever applied where a capability is shared across many
  row-owners without an `:all` escape hatch (CRM/Sales' `AGENT` role) — no
  other module has that shape.
- **`DRAFT`/`PENDING_SIGNATURE`** remain unused `ContractStatus` values —
  `signContract` creates straight into `ACTIVE`. Fixing this properly means
  changing when Finance's invoice generation fires (currently tied to the
  same creation event), judged out of scope for the pass that flagged it.
- ~~No automatic "all invoices paid → COMPLETED"~~ — **investigated
  2026-09-21, not a gap.** `completeContract` is manual by deliberate
  design (see the comment at `sales.service.ts`'s `completeContract`):
  completion tracks handover, not payment-in-full, and the "Post-handover
  50/50" payment plan proves why — auto-completing on "all invoices paid"
  would leave a handed-over contract stuck ACTIVE for years while its
  post-handover instalments trickle in. User confirmed: leave manual.
  Don't re-flag this as a missing feature without re-reading that comment.

## If asked "what's next" with no other steer

The remaining known-gap categories above are either a **content problem**
(upload real photos) or a **product decision someone else needs to make**
(whether `ChatPage.tsx` gets real LLM integration) — the ownership-check
audit is now fully closed across every module. There is no obvious next
*engineering* task queued; ask what area of the system to look at next.
