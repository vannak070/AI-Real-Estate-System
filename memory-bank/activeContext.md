# Active Context

**What's true right now.** Edit in place when the focus shifts; move
finished work into `progress.md` (short summary + the *why*), keep only the
last few items here. Verify any claim against the code before relying on it.

## Where things stand (2026-09-25)

**Ready for the management review.** Code on the Mac, GitHub (`origin/main`
= `d694532`) and the online demo all match.

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
user's key; a push takes ~2–3 min.

**Git:** the user commits on `main` themselves most of the time. The agent's
shell has **no GitHub credentials** — `git push` must be run by the user
(VS Code / GitHub Desktop, or after `gh auth login`); never type credentials.

**Local dev servers:** started from the **Claude app's preview panel**
(client :5173, admin :5174, api :4000) — don't start them in terminal tabs
(port clash). Docker Desktop must be running first (Postgres `era-postgres`
on :5435).

## Recent work (full reasoning in `progress.md`)

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
- The user has now used the Inbox on the demo (take over, reply). Admin
  screens still not clicked through by anyone: AI Knowledge page, campaign
  drawer links, property Publish/Private + bulk select, the unified
  Add/Edit property form.

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
