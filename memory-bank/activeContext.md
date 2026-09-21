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

1. **`ChatPage.tsx` quick-reply buttons were silently broken — fixed
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
2. **"Auto-complete contract on all-invoices-paid" investigated and rejected**
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
3. **CRM ownership-check audit** (2026-09-21, commit `fc0a846`) — closed the
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
4. **Documentation consistency sweep** — after the Tier 0 fix below shipped,
   corrected every file in this session that still claimed `ChatPage.tsx`
   was "the only remaining mock screen, zero backend" (this file,
   `progress.md`, `productContext.md`, `CLAUDE.md`, `claude/config.md`, and
   this assistant's own private memory) to instead say it's connected to
   real data but still not a real AI. Pure doc correction, no code changed.
5. **`ChatPage.tsx` Tier 0 fix** — the "AI Property Assistant" widget was
   auditing as fully disconnected: hardcoded `@era/mock-data` properties
   (stale `P001`-style ids that no longer matched real project ids after
   the Public Listings Plan), a false "securely stored in Odoo CRM" claim,
   and fabricated booking-confirmation text. Fixed to fetch real projects/
   units from `inventory.public.*` and submit real leads via
   `crm.public.submitLead`; removed the `@era/mock-data` dependency from
   `apps/client/package.json` entirely (it was the last consumer). Still
   no LLM — free text is matched with simple heuristics, not understood.
   Tier 1 (real LLM integration) was explicitly scoped out and not done.
6. **`ManageAboutPage` CMS** — was pure decorative `useState`, is now a real
   backend (new Prisma models: `AboutPageContent`/`AboutMilestone`/
   `AboutTeamMember`/`AboutAward`) + full admin editor + the client's
   `AboutPage.tsx` Overview/History/Team/Awards tabs reading real data.
   Content was seeded from what used to be hardcoded on the client page
   (`prisma/seed-about.ts`, idempotent, safe to re-run). Team photos are
   deliberately blank (initials avatar) rather than carrying over the mock's
   fake stock photos.
7. **Public Listings Plan** — `apps/client`'s Properties list/detail pages
   and a real lead-capture form, wired to new `inventory.public.*` and
   `crm.public.submitLead` endpoints. Full loop verified: a public enquiry
   really lands as a Lead the admin Pipeline shows.
8. **Reservation form polish** — deposit auto-suggest, configurable hold
   duration, required payment plan + schedule preview on Sign Contract, a
   search box on the Reservations list.
9. **Reservation & Contract lifecycle overhaul** — manual reservation
   creation (previously only reachable via accepting a quotation), a real
   Sign Contract form, auto-generated milestones at signing (previously
   never created outside the seed script), Terminate/Complete contract
   actions, ownership checks added to every sales write mutation that
   lacked them.
10. **`identity.users.list`/`.get` passwordHash leak** — fixed (explicit
    `select`, not Prisma `omit` — see `techContext.md` for why `omit` didn't
    work here).
11. **This memory bank + `CLAUDE.md`/`claude/config.md` refresh** — both rule
    files had drifted (still describing an old "Phase 8, partially wired"
    state); corrected to match the above.

## Known open items (not yet done)

- **`ChatPage.tsx` is not a real AI** — it's connected to real data (Tier 0,
  done 2026-09-21) but is still a scripted decision tree with no LLM/NLP.
  Building an actual AI-backed version (Tier 1) is a separate product
  decision, not a task to pick up casually.
- **Real photos** — most seeded projects and all About-page team members
  (except whichever get uploaded after this note is stale) have no real
  uploaded photo; the upload feature itself works fine, this is just content
  that hasn't been supplied yet.
- **File-picker photo upload was never live-tested** by the agent that built
  the About CMS (no file-upload action in that session's browser-automation
  toolset) — worth a manual click-through if anyone reports it not working.
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
