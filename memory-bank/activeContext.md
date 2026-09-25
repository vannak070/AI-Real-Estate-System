# Active Context

**What's true right now.** Edit in place when the focus shifts; move
finished work into `progress.md` (short summary + the *why*), keep only the
last few items here. Verify any claim against the code before relying on it.

## Where things stand (2026-09-25)

**Ready for the management review.** Code on the Mac, GitHub (`origin/main`
= `9af00bb`, 2026-09-25) and the online demo all match; nothing uncommitted.

**The demo: https://demo.yarvorax.com (customer site) +
https://admin.demo.yarvorax.com (back office)** — DigitalOcean droplet
`Demo-RealEstate`, **157.245.148.58**, SGP1, $6 plan (1 vCPU / 961 MB / 25 GB),
Ubuntu 24.04, ufw 22/80/443, 2 GB swap, Docker. Code in `/opt/era`, settings in
`/opt/era/deploy/.env` (the Mac's `deploy/.env` is the source copy, git-ignored).
Let's Encrypt HTTPS via Caddy; hidden from Google (`X-Robots-Tag`). The
**Telegram bot @ERACambodiaAI_bot runs on the demo** (webhook
`https://demo.yarvorax.com/webhooks/telegram`); its token is commented out in
the Mac's `.env`, so the local API runs without a bot. Nightly backup at 02:00
Phnom Penh (`0 19 * * *` UTC) → `/var/backups/era`. DNS at GoDaddy: A records
`demo`, `admin.demo` → 157.245.148.58; `@`/`www` point at the **Yarvora-X
droplet 159.223.84.89 = the live yarvorax.com website — never deploy there.**
**The demo's database is its own copy** (imported from the Mac once): changes in
the demo's back office stay there; re-running `import-data.sh` would overwrite
them.

**Updating the demo:** on the Mac with Docker Desktop running,
`deploy/push.sh root@157.245.148.58 --build-on-mac` (code only — the demo's
data, photos and settings are untouched). SSH from this Mac works with the
user's key; a push takes ~2–3 min. **The Mac has only 8 GB total RAM**,
Docker Desktop is allocated 4 GB of it (`docker info` to check) — deliberately
left there, not raised, per the user (2026-09-25): the emulated `linux/amd64`
build (Apple Silicon → Intel) can sit silent for several minutes on a single
layer under that little memory and looks hung even when it isn't; `push.sh`
now passes `--progress=plain` to both `docker buildx build` calls so it
streams continuously instead. If a push ever looks stuck, that's the known
cause — let it keep running rather than assuming failure; a fresh
`docker ps`/`curl https://demo.yarvorax.com/health` on/against the droplet
confirms whether the previous attempt actually landed before retrying.

**Git:** the user commits on `main` themselves most of the time. The agent's
shell has **no GitHub credentials** — `git push` must be run by the user
(VS Code / GitHub Desktop, or after `gh auth login`); never type credentials.

**Local dev servers:** started from the **Claude app's preview panel**
(client :5173, admin :5174, api :4000) — don't start them in terminal tabs
(port clash). Docker Desktop must be running first (Postgres `era-postgres`
on :5435).

## Recent work (full reasoning in `progress.md`)

000000. **Home page: invented figures removed (2026-09-25, local only —
   needs a push)** — user asked to make the "Proven Results & Performance"
   band "like About page". Its four template stats (1,247+ leads qualified,
   94.5% AI accuracy, <1 min response, 40% conversion boost) were never real;
   replaced with four non-numeric highlights in the About page's pattern
   (`HIGHLIGHTS` const in `HomePage.tsx`: Real Listings Only / Answers
   Anytime / Matched to Your Needs / Real People on Hand — each a true
   statement about the platform), band retitled "What You Can Count On" (not
   "Why Choose ERA Cambodia" — the features section above already uses that
   label). Same pass removed the page's other figures: "94.5% matching
   accuracy", "100% verified listings", "Our 10 experienced sales
   professionals". Verified desktop + 375 px. **Still on the home page, not
   touched (user to decide)**: feature bullets that describe things the site
   doesn't do — "Secure payment processing" (no online payment exists),
   "Real-time market analysis" / "Price trend predictions", "Smart reminder
   system" / "Auto-scheduling viewings".
00000. **Admin click-through of the last untested screens (2026-09-25,
   live on the demo — pushed 06:05 UTC, commit `82c7724`)**. Worked, verified
   against Postgres and the customer site:
   - **Campaign ad link end to end**: new campaign → its
     `/?utm_campaign=<code>` link → visitor enquiry on a property → the
     Lead carries that `campaignId`, Marketing shows Leads 1 / cost-per-lead
     $30; date validation; delete refused while a lead is linked, allowed
     after. (Telegram link hidden locally — no bot on the Mac, by design.)
   - **Bulk Publish / Make private**: exactly the selected rows change; a
     private listing is "Property not found" by direct link and absent from
     `inventory.public.projects.list`; publishing restores it.
   - **Add/Edit property form**: every field saves; new property defaults to
     Private and is invisible to customers; Edit pre-fills everything;
     blanked fields save as `null`, untouched ones are kept.
   Fixed (admin, typecheck clean, verified live):
   - `AdminLayout.tsx` main column lacked `min-w-0` → below ~1190 px window
     width every page with a wide table scrolled sideways and **drawers were
     cut off on the right** (Campaign drawer lost Status/Spend/End date).
     Same lesson as the Inbox `min-h-0` incident, horizontal this time.
   - `CampaignsPage.tsx` copy button: `clipboard.writeText` failure (refused,
     or absent on plain-http LAN addresses) was an unhandled rejection with
     no feedback → now selects the link + shows "press ⌘C / Ctrl+C"; button
     got an `aria-label`.
   - Wording: "1 campaigns" → singular; Sales/Rent subtitles said
     "projects" → "properties" (Projects page still says "projects").
   Not fixed / for the user:
   - **No way to delete a property** (no API procedure, no UI) — a mistaken
     one can only be made Private. Possibly deliberate; ask before adding.
   - Two unexplained HTTP 500s appeared in the admin tab's console during the
     Marketing-page steps; couldn't reproduce with the same steps (all 200).
     The local API belongs to another session (watch mode), so its logs
     weren't readable — likely a restart mid-request, unconfirmed. Watch for
     it on the demo.
   - `sales.reservations.list` polls every 4 s wherever it's mounted
     (including property pages) — by design for the reservation saga.
0000. **"Failed" deploy was actually a slow build, not a failure
   (2026-09-25)** — user reported `deploy/push.sh --build-on-mac` failing;
   investigated live (SSH to the droplet, checked `deploy/docker-compose.yml`
   — not the unrelated root `docker-compose.yml`, which is dev-Postgres-only
   and has no `api`/`web` service, a dead end I hit first): `era-api-1`/
   `era-web-1`/`era-postgres-1` were all already up, freshly built minutes
   earlier, migrations applied, no errors in `docker compose logs api`, both
   sites returning 200, disk at 28%. **The deploy had actually succeeded —
   nothing was actually broken.** Root cause of the *appearance* of failure:
   `docker buildx build --platform linux/amd64` cross-builds for Intel via
   emulation on this Apple-Silicon Mac, and Docker Desktop's VM only has
   4 GB RAM (the Mac has 8 GB total) — a single layer (`pnpm install`/build)
   can run silent for minutes with the default collapsing terminal UI,
   reading as hung. Fixed by adding `--progress=plain` to both `buildx
   build` calls in `push.sh` (streams continuously instead). Asked the user
   about raising Docker's memory allocation given the 8 GB ceiling — they
   chose to leave it at 4 GB (correctly: this machine can't spare more
   without risking system-wide swapping during a build). **Lesson:** when a
   deploy "fails" with no pasted error, check the actual server state first
   (containers, logs, live health check) before assuming the failure is
   real — `set -euo pipefail` in `push.sh` means a truly failed run would
   leave stale/missing images, which this run didn't.
000. **About page wording (2026-09-25, live on the demo)** — user direction:
   **no numbers on the About page; describe ERA's experience in general
   terms; mention the CEO.** paragraph2 (CMS) is now "Under the leadership
   of Chairman and CEO Kungkea Khorn, ERA Cambodia has built a trusted
   reputation…" (local DB, demo DB — backup
   `/var/backups/era/about-content-before-paragraph2.dump` — and
   `prisma/seed-about.ts`). The stats row (template figures 5 / 1,247+ /
   94.5% / 10) was replaced in `AboutPage.tsx` by four non-numeric
   highlights (Trusted Local Experts, Wide Property Portfolio, 24/7 AI
   Assistant, End-to-End Support); the `stat*` CMS fields are no longer
   shown anywhere (still editable in Manage About). **Template content
   cleaned up (local only, not yet on the demo):** History = four undated
   stages (Today / Going Digital / Growing Together / The Beginning — `year`
   is free text; admin placeholder now "Year or stage"), the template's
   unverifiable dates/figures dropped; the four made-up Awards deleted
   (local backup in the agent scratchpad) and the Awards section hidden
   everywhere while none exist (`app/useAboutSections.ts` for header /
   mobile / footer, tab filter + `?tab=awards` → overview on the page);
   the Unsplash "ERA Cambodia Office" photo replaced by an ERA brand panel.
   `seed-about.ts` matches (no awards seeded). **Verified on the demo
   2026-09-25**: `settings_about_milestones` holds the same four undated
   stages as local and `settings_about_awards` is empty on both — nothing
   left to apply there.
00. **About menu made usable (2026-09-25, live on the demo)** —
   every About menu item (and every footer "About ERA" link) pointed at plain
   `/about`, so "Our History"/"Our Team"/… just showed Company Overview; the
   hover menu also stayed open over the page after a click and snapped shut
   crossing the `mt-2` gap. Now: `app/aboutSections.ts` is the single list
   (page tabs, header menu, mobile menu, footer); the open section is in the
   URL (`/about?tab=history`, `useSearchParams`, tab clicks `replace`), with a
   scroll-into-view when switched from outside the tabs; header menu =
   About link + separate chevron button (touch/keyboard, `aria-expanded`),
   hover-intent close (180 ms), `pt-2` bridge instead of a margin gap, closes
   on item click / navigation / Esc / outside click, current section
   highlighted; mobile menu lists the sections. Verified with real DOM events
   (desktop + 375 px). Noticed: the About Overview text (CMS) still says "a
   portfolio of 5 premium projects" and "10 sales professionals".
0. **Footer + Odoo wording (2026-09-25, live on the demo)** — footer bottom
   row: "© 2026 ERA Cambodia · Powered by AI Agent" left, Facebook / Call
   (tel:+85523123456) / Telegram (fixed: was the wrong `@ERAcambodia_bot`,
   now `@ERACambodiaAI_bot`) icons right; "Connect With Us" block and
   Messenger/LinkedIn/WhatsApp icons removed. All "Odoo" wording removed from
   the customer site (footer, HomePage ×3, AboutPage highlight → "Integrated
   CRM & Sales") and from the About CMS content (paragraph1, 2024 milestone,
   2024 award) — edited in the local DB, `prisma/seed-about.ts`, **and the
   demo DB directly** (backup of those 3 tables before the edit:
   `/var/backups/era/about-before-odoo-edit.dump` on the demo). User still to
   confirm the real ERA phone number and Facebook page URL.
1. **Returning customers aren't re-asked for details** — the assistant adds
   the lead's saved contact (`onFileNote`, via `CrmApi.listLeadSummaries`) to
   the per-visitor prompt block for Telegram (`leadId`) and website
   (`leadToken`) chats. Verified both; live on the demo.
2. **Inbox reply box fix** (`min-h-0` in the flex/grid panel) — the user
   took over a chat on the demo and couldn't reply. Live.
3. **Website chat polish** (`ChatPage.tsx`): safe formatter, compact photo
   cards, starter buttons, New chat, IME-safe Enter, no stock photos; the
   website prompt summarises instead of listing. Live.
4. **Deployment** (`Dockerfile`, `deploy/`, `deploy/README.md`), the demo
   set-up above, `push.sh --build-on-mac` + `--force-recreate` + prune.
5. **Inbox + human handoff + auto hand-back** (`modules/messaging/inbox.ts`,
   `/inbox`), `request_agent` tool.

## Checks still to do

- **Management review feedback** — collect and work through it.
- **Footer contact details** — the user hasn't yet confirmed that
  +855 23 123 456 (Call icon, also the header/Contact Info number) and
  facebook.com/eracambodia are ERA's real phone and Facebook page; both were
  in the Figma export, not supplied by ERA.
- The user has now used the Inbox on the demo (take over, reply). **AI
  Knowledge page clicked through locally 2026-09-25**: suggested-topic
  prefill, create, edit, Active→Hidden (counter drops to 0, and
  `promptSection()` confirmed the AI no longer receives it), two-click
  delete — all correct, no console errors; the 40k cap was proven
  server-side (5th 8,000-char entry rejected with the "knowledge is full"
  message; a hidden one still saves). Test rows removed. **Campaign links,
  bulk Publish/Private and the Add/Edit property form were clicked through
  too (2026-09-25, local)** — see Recent work 00000. Every admin screen on the
  earlier "never clicked" list has now been exercised at least once.

## Known open items

- **Rotate the exposed secrets before production**: the demo's Anthropic key
  and the Telegram bot token were pasted into chat (the demo uses them
  knowingly); the Mac's older Anthropic key still works — delete it in the
  console. Telegram: `/revoke` in @BotFather → new token into the server's
  `deploy/.env` → `push.sh`.
- **AI Knowledge is empty** — ERA staff need to write answers (ideally before
  the review).
- **Listing data gaps**: 30 published listings have no photos; amenities
  empty on all 667; 217 without bedroom data; no description field.
- **AI can still claim a save it never attempted** — prompt rule only
  (rejected saves are a server guarantee). Re-test whenever the prompt changes.
- **Inbox gaps**: website chats aren't stored (not in the Inbox); customer
  photos/stickers show as a placeholder; visibility filtered in code over the
  latest 200 conversations; no push/sound alert, only the badge.
- **Single-instance assumptions**: chat rate limiter, Telegram photo
  `file_id` cache and card→property map are in memory.
- **No automated tests** (`pnpm test` is empty); every check so far was a
  throw-away harness script.
- **Name search** misses spelling variants / run-together words;
  `LOCATION_ALIASES` covers only common Phnom Penh areas + Sihanoukville.
- **Customer site fetches the full catalog** (fine at 667 listings).
- **Decorative UI** on the customer site (Share, Favorite, unused `featured`).
- **`ImageGallery.tsx` file-picker → crop flow** untested end-to-end.
- **`DRAFT`/`PENDING_SIGNATURE` contract statuses** unused.
- **About-page team members** have no real photos.

## If asked "what's next" with no other steer

1. Work through the management review's feedback.
2. Rotate the secrets; staff write AI Knowledge; fill listing data gaps.
3. Staff alerts (e.g. a Telegram message to the team when a customer asks
   for a person) so the Inbox works without the page open.
4. **Facebook Messenger, then WhatsApp** on the `messaging` module (Meta app
   review is slow — start the paperwork early; a privacy-policy page on the
   client site is required).
5. Automated tests from the harness patterns in `techContext.md`.
