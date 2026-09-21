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

1. **Documentation consistency sweep** — after the Tier 0 fix below shipped,
   corrected every file in this session that still claimed `ChatPage.tsx`
   was "the only remaining mock screen, zero backend" (this file,
   `progress.md`, `productContext.md`, `CLAUDE.md`, `claude/config.md`, and
   this assistant's own private memory) to instead say it's connected to
   real data but still not a real AI. Pure doc correction, no code changed.
2. **`ChatPage.tsx` Tier 0 fix** — the "AI Property Assistant" widget was
   auditing as fully disconnected: hardcoded `@era/mock-data` properties
   (stale `P001`-style ids that no longer matched real project ids after
   the Public Listings Plan), a false "securely stored in Odoo CRM" claim,
   and fabricated booking-confirmation text. Fixed to fetch real projects/
   units from `inventory.public.*` and submit real leads via
   `crm.public.submitLead`; removed the `@era/mock-data` dependency from
   `apps/client/package.json` entirely (it was the last consumer). Still
   no LLM — free text is matched with simple heuristics, not understood.
   Tier 1 (real LLM integration) was explicitly scoped out and not done.
3. **`ManageAboutPage` CMS** — was pure decorative `useState`, is now a real
   backend (new Prisma models: `AboutPageContent`/`AboutMilestone`/
   `AboutTeamMember`/`AboutAward`) + full admin editor + the client's
   `AboutPage.tsx` Overview/History/Team/Awards tabs reading real data.
   Content was seeded from what used to be hardcoded on the client page
   (`prisma/seed-about.ts`, idempotent, safe to re-run). Team photos are
   deliberately blank (initials avatar) rather than carrying over the mock's
   fake stock photos.
4. **Public Listings Plan** — `apps/client`'s Properties list/detail pages
   and a real lead-capture form, wired to new `inventory.public.*` and
   `crm.public.submitLead` endpoints. Full loop verified: a public enquiry
   really lands as a Lead the admin Pipeline shows.
5. **Reservation form polish** — deposit auto-suggest, configurable hold
   duration, required payment plan + schedule preview on Sign Contract, a
   search box on the Reservations list.
6. **Reservation & Contract lifecycle overhaul** — manual reservation
   creation (previously only reachable via accepting a quotation), a real
   Sign Contract form, auto-generated milestones at signing (previously
   never created outside the seed script), Terminate/Complete contract
   actions, ownership checks added to every sales write mutation that
   lacked them.
7. **`identity.users.list`/`.get` passwordHash leak** — fixed (explicit
   `select`, not Prisma `omit` — see `techContext.md` for why `omit` didn't
   work here).
8. **This memory bank + `CLAUDE.md`/`claude/config.md` refresh** — both rule
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
- **Ownership checks on mutations are not universal** — confirmed present on
  quotations and (as of the Reservation/Contract pass) reservations/
  contracts/milestones, but `crm.router.ts`'s `contacts.update`/
  `leads.update` still lack the explicit owner-or-`*:read:all` check that
  `quotations.update` has. Not yet audited module-by-module.
- **`DRAFT`/`PENDING_SIGNATURE`** remain unused `ContractStatus` values —
  `signContract` creates straight into `ACTIVE`. Fixing this properly means
  changing when Finance's invoice generation fires (currently tied to the
  same creation event), judged out of scope for the pass that flagged it.
- **No automatic "all invoices paid → COMPLETED"** — completion is a manual
  admin action.

## If asked "what's next" with no other steer

Both known-gap categories above are either a **content problem** (upload
real photos) or a **product decision someone else needs to make**
(whether `ChatPage.tsx` gets real LLM integration). There is no obvious next
*engineering* task queued — ask what area of the system to look at next, or
offer the ownership-check audit above as a concrete, scoped option.
