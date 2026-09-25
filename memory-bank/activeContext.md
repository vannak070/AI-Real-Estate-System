# Active Context

**What's true right now.** Edit in place when the focus shifts; move
finished work into `progress.md` (short summary + the *why*), keep only the
last few items here. Verify any claim against the code before relying on it.

## Where things stand (2026-09-25, checked against git and the server)

**Git:** Mac = GitHub (`origin/main` = `f355809`), nothing uncommitted. The
user commits and pushes on `main` themselves; the agent's shell has **no
GitHub credentials** — never type credentials.

**The demo runs the current code, staff alerts included** (deployed
2026-09-25 06:52 UTC; migration `20260925090000_messaging_staff_alerts`
applied, bot webhook re-set). Still to test there: a staff member clicks
"Turn on Telegram alerts" in the Inbox → Open Telegram → linked (0 links so
far).

**The demo: https://demo.yarvorax.com + https://admin.demo.yarvorax.com** —
DigitalOcean droplet `Demo-RealEstate`, **157.245.148.58**, SGP1, $6 plan
(1 vCPU / 961 MB / 25 GB), Ubuntu 24.04, ufw 22/80/443, 2 GB swap. Code
`/opt/era`, settings `/opt/era/deploy/.env` (source copy: the Mac's git-ignored
`deploy/.env`). Caddy + Let's Encrypt; hidden from Google. **Telegram bot
@ERACambodiaAI_bot runs on the demo** (webhook); the Mac's `.env` has its
token commented out. Nightly backup 02:00 Phnom Penh → `/var/backups/era`
(plus one-off content backups there: `about-*.dump`). DNS at GoDaddy: `demo`,
`admin.demo` → 157.245.148.58. **Never deploy to Yarvora-X (159.223.84.89) —
the live yarvorax.com site.** The demo's database is its own copy; CMS/content
edits there are made directly (with a backup), and re-running
`import-data.sh` would overwrite them.

**Updating the demo:** Mac, Docker Desktop running →
`deploy/push.sh root@157.245.148.58 --build-on-mac` (code only; ~2–5 min).
The Mac has 8 GB RAM, Docker 4 GB (leave it): the emulated build can be
silent for minutes — not a failure. **Don't edit code while a push runs**
(it builds from the live working tree). After a push, check `/health` and
grep the served bundle for the change.

**Local dev:** servers run from the Claude app's **preview panel** (client
:5173, admin :5174, api :4000) — never in terminal tabs. Docker Desktop
first (Postgres `era-postgres` :5435). No bot locally, by design.

## Recent work (details and reasons in `progress.md`)

1. **Staff alerts on Telegram** (live on the demo) —
   `modules/messaging/staff-alerts.ts`; staff link their own Telegram from the
   Inbox; alerts for "customer wants a person", a customer writing in a chat
   they handle, the 30-min auto hand-back, and a new lead assigned to them.
   Harness 20/20. Only the real "Open Telegram → linked" step is untested.
2. **Honesty pass on the customer site** (live): home page figures and
   claims rewritten to what the site does; stock photos replaced by ERA brand
   panels / "Photos coming soon"; Share works, Favorite removed; wording
   fixes on property, Properties, About → Team/Contact, footer.
3. **About page** (live): CEO-led paragraph, no numbers; four highlights
   instead of the template stats; History as four undated stages; made-up
   Awards deleted and the section hidden until real ones exist; menu items
   open their own section (`/about?tab=…`).
4. **Admin click-through** (live): campaign ad link → lead attribution, bulk
   Publish/Private, Add/Edit property form all verified; fixed drawers cut off
   (`min-w-0`) and the campaign copy button.
5. **Footer**: "© 2026 ERA Cambodia · Powered by AI Agent", Facebook / Call /
   Telegram icons; all "Odoo" wording removed site-wide.

## Checks still to do

- **Link a staff Telegram on the demo** and send a test alert (see above).
- **Management review feedback** — collect and work through it.
- **ERA must confirm the contact details** (all from the Figma export): phones
  +855 23 123 456 and +855 12 345 678 (the second looks like a placeholder),
  info@ / sales@eracambodia.com, "Street 240, BKK1" (drives the Maps link),
  business hours, facebook.com/eracambodia.
- **"Real ERA listings" claims**: 592 of the 667 demo listings were scraped
  from pointerasia.com (another brokerage) — only true once the inventory is
  ERA's own.
- CMS wording still from the template ("Leading the future…", "pioneering",
  "revolutionizing") — editable in Manage About; flagged for ERA.

## Known open items

- **Rotate the exposed secrets before production** (the demo's Anthropic key
  and the Telegram token were pasted into chat; the Mac's older Anthropic key
  still works — delete it).
- **AI Knowledge is empty** — ERA staff need to write answers.
- **Listing data gaps**: 30 listings without photos; amenities empty on all
  667; 217 without bedroom data; no description field.
- **No way to delete a property** (only make it Private) — ask before adding.
- **AI can still claim a save it never attempted** (prompt rule only).
- **Inbox gaps**: website chats aren't stored; customer photos show as a
  placeholder; visibility filtered in code over the latest 200 conversations.
- **Single-instance assumptions**: rate limiter, Telegram caches in memory.
- **No automated tests** — every check so far was a throw-away harness.
- Name search misses spelling variants; `LOCATION_ALIASES` covers only
  common areas. Customer site loads the full catalog (fine at 667).
- Unused: `featured` flag, `DRAFT`/`PENDING_SIGNATURE` contract statuses.
- `ImageGallery.tsx` file-picker → crop flow untested; team members have no
  real photos; two unexplained admin HTTP 500s seen once locally (not
  reproduced) — watch on the demo.

## If asked "what's next" with no other steer

1. Link a staff Telegram on the demo (Inbox → Turn on Telegram alerts).
2. Management feedback; ERA confirms contact details; staff write AI
   Knowledge; fill listing data gaps; rotate secrets.
3. **Facebook Messenger, then WhatsApp** on the `messaging` module (start
   Meta's app review early; needs a privacy-policy page).
4. Automated tests from the harness patterns in `techContext.md`.
