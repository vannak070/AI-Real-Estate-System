# Active Context

**What's true right now.** Edit in place when the focus shifts; move
finished work into `progress.md` (short summary + the *why*), keep only the
last few items here. Verify any claim against the code before relying on it.

## Where things stand (2026-09-25)

**The demo is live: https://demo.yarvorax.com + https://admin.demo.yarvorax.com**
(DigitalOcean droplet `Demo-RealEstate`, **157.245.148.58**, SGP1, $6 plan: 1 vCPU / 961 MB
RAM / 25 GB, Ubuntu 24.04, ufw 22/80/443, 2 GB swap, Docker 29). Code in `/opt/era`, settings in
`/opt/era/deploy/.env`; deployed with `deploy/push.sh root@157.245.148.58 --build-on-mac` (the
1 GB box can't build). Caddy got Let's Encrypt certs for both names; `X-Robots-Tag: noindex,
nofollow`. Data imported from the Mac (667 projects, 47 leads, 13 active users, 682 photo
folders — identical); AI chat verified over HTTPS; **the Telegram bot now runs on the demo via
webhook** (`https://demo.yarvorax.com/webhooks/telegram`) and the token is commented out in the
Mac's `.env`. Nightly backup cron `0 19 * * *` UTC = 02:00 Phnom Penh → `/var/backups/era`
(first run: 204 KB db, 198 MB photos). RAM ~540/961 MB in use. DNS: GoDaddy A records `demo`,
`admin.demo` → 157.245.148.58 (the `@`/`www` records still point at the Yarvora-X website
droplet 159.223.84.89 — never deploy there). **The Mac's local DB is now a separate copy** —
changes made in the demo's back office don't flow back, and re-running import-data.sh on the
server would overwrite demo changes.

Every screen in `apps/admin` and `apps/client` runs on the real API; nothing
uses `@era/mock-data` except `apps/api/prisma/seed.ts`. The AI assistant
(Claude Haiku 4.5) answers on the **website chat** and on **Telegram**
(@ERACambodiaAI_bot, live, polling from this machine), grounded in real
published Inventory, saving leads into CRM, and using staff-written
**AI Knowledge** for questions about ERA itself.

**Dev servers:** the user starts them from the **Claude app's preview
panel** (client + api, 2026-09-25) — so `preview_list` shows them, and a
`pnpm api` in a terminal will crash with EADDRINUSE (it happened). Admin
(:5174) moved there too (a terminal copy the agent had opened blocked the
panel's start — stopped it). Don't start dev servers in terminal tabs. Docker Desktop
must be running first (it was off on the morning of 2026-09-25 — the api
preview then failed every DB call until Postgres came up). Only one API
process may run (port :4000, one Telegram poller).

## Recent work (newest first — full reasoning in `progress.md`)

000. **Production deployment kit (2026-09-25; rehearsed end to end on the
   Mac, not yet on a real server)** — user chose: one cloud VPS in
   Singapore, **IP address first (no domain yet)**, user runs the commands
   with step-by-step guidance. `Dockerfile` (targets `api` = migrate deploy
   + `node --import tsx`, `web` = Caddy with both SPA builds), `deploy/`:
   `docker-compose.yml` (postgres with no published port, api, web on
   80/443/8080; volumes pgdata/uploads/caddy_data), `Caddyfile` (per-site
   `/trpc /uploads /health /webhooks` → api, SPA fallback; site addresses
   from env: `:80`/`:8080` now, domains later = automatic HTTPS),
   `.env.example`, `push.sh` (rsync code only + `up -d --build`),
   `export-local-data.sh`, `import-data.sh` (pg_restore --clean + photo
   volume), `backup.sh` (nightly cron, 14 d db / 7 d photos), `README.md`
   (the user's guide). Code: `TRUST_PROXY` (Fastify `trustProxy` — without
   it every visitor shares Caddy's IP and one per-IP chat rate limit),
   `COOKIE_SECURE` (session cookie `secure`; must stay false on plain HTTP),
   SPAs accept `VITE_API_BASE_URL=same-origin`. Rehearsal: built both
   images (~70 s), imported the real data (counts identical: 667 projects,
   46 leads, 14 users, 20 migrations, 682 photo files), customer site +
   photos + AI chat through Caddy, foreign-origin CORS refused, db port not
   published, admin deep links served; rehearsal containers/volumes/data
   deleted. **Demo target (user, 2026-09-25): https://demo.yarvorax.com +
   https://admin.demo.yarvorax.com**, hidden from search engines
   (`ROBOTS_TAG` → Caddy `X-Robots-Tag`, default "noindex, nofollow"),
   DNS at GoDaddy (A records `demo`, `admin.demo`). `deploy/.env` was
   pre-filled for it (addresses, COOKIE_SECURE=true, PUBLIC_API_URL →
   webhook, generated POSTGRES_PASSWORD/CHAT_TOKEN_SECRET; user pastes the
   two keys). ⚠ The user's existing droplet **Yarvora-X 159.223.84.89 runs
   the live yarvorax.com site (nginx) and has 512 MB** — told not to use it;
   a new 4 GB Singapore droplet is needed. Safety fix: a polling copy now
   checks `getWebhookInfo` and refuses to take a bot whose webhook points
   elsewhere (it used to `deleteWebhook`, silently cutting off the server's
   bot); `TELEGRAM_TAKE_OVER_WEBHOOK=true` overrides. User chose the **$6 / 1 GB droplet** → `deploy/push.sh <server>
   --build-on-mac` builds linux/amd64 images on the Mac (buildx, ~2 min)
   and ships them (`docker save | gzip | ssh docker load`; compose now names
   them `era-api:latest`/`era-web:latest`, server runs `up -d --no-build`).
   Measured: amd64 api image started under emulation, served the catalog,
   ~207 MB RAM (whole stack ≈ 350 MB). 2 GB swap recommended on 1–2 GB.
   **Next:** user creates the droplet and follows deploy/README.md.
00. **Inbox auto hand-back (2026-09-25; verified with a fake clock, UI hint
   not yet seen signed-in)** — `inbox.sweep()` runs every 60 s (module
   `start`/`stop`): a staff-handled chat whose latest message is the
   customer's and is older than `INBOX_AUTO_HANDBACK_MINUTES` (default 30)
   goes back to the AI — notice to the customer ("our team is busy…"), chat
   stays flagged (`needsAgent` + reason), and the AI answers the waiting
   message(s) via the bot's new `answerPending()` (the AI step was extracted
   from `processMessage` into `replyWithAi()`; per-chat queue via
   `enqueue()`); no activity for `INBOX_IDLE_RELEASE_HOURS` (default 12) →
   quiet return to AI. Both are conditional updates (`updateMany` where still
   AGENT + same handler) so a concurrent staff reply/hand-back wins; 0
   disables either. Inbox header shows the rule. **Two real bugs found by the
   test and fixed in code**: (1) the AI copied the history label "[ERA staff
   member replied:]" into its reply → `stripHistoryMarkers()` cleans replies
   before they're sent *and* stored; (2) after a new "under $900" search the
   AI re-linked $1,600 listings from an earlier turn → a turn that looked
   properties up may only show cards for what it found (history re-lookup
   only for turns with no lookup).
0. **Admin Inbox + human handoff, Telegram first (2026-09-25; backend
   verified end to end, admin page not yet clicked through signed-in)** —
   migration `20260925020000_messaging_inbox`: `MessagingMode {AI, AGENT}`,
   `MessagingRole.AGENT` + `MessagingMessage.agentId`, conversation
   `handledById/handledSince`, `needsAgent/needsAgentReason`, `unreadCount`.
   `modules/messaging/inbox.ts` (`MessagingApi.inbox`, lives in the module
   because it sends through the running bot): list/summary/get/markRead/
   takeOver/handBack/send. Visibility = CRM rule: `crm:read:all` sees all;
   others see chats whose lead they own or they're handling (no lead yet →
   managers only); take over/reply need `crm:write`; taking over someone
   else's chat needs `:all`. In AGENT mode the bot stores messages and stays
   silent (an AI reply already in flight is dropped if a takeover lands
   meanwhile); staff replies go out as "<First name>: …", takeover/hand-back
   send a one-line notice; staff messages reach the AI's history marked
   "[ERA staff member replied:]". New AI tool **`request_agent`** (chat apps
   only) sets `needsAgent` + reason. CRM gained `CrmApi.listLeadSummaries`.
   Admin: `/inbox` (CRM nav, red badge = chats needing a person, polls 15s),
   tabs Needs attention / Handled by team / All, thread rendering photo-card
   notes, swipe-replies and button taps as what the customer saw, Take over /
   Hand back, composer (Enter sends). Harness: ask for a person → flagged,
   badge 1; agent without the lead refused; reply before takeover refused;
   AI silent while handled; reply delivered "Sokha: …"; after hand-back the
   AI recalled what staff promised.
1. **AI Knowledge + bedroom/size search** — `assistant_knowledge` table
   (`assistant.prisma`) + `modules/assistant/knowledge.ts`: CRUD, 40,000-char
   cap on active entries enforced on save, `promptSection()` injected into
   every chat. The system prompt is two blocks: [fixed rules + knowledge,
   `cache_control`] + [per-visitor note], so the big block can cache across
   customers — **caching isn't active yet** (the `assistant.usage` log shows
   `cacheRead: 0`; the prefix, ~2.9k tokens, is under Haiku's minimum and
   will start caching by itself as knowledge grows). tRPC
   `assistant.knowledge.*` (marketing:read / marketing:write); admin page
   `/ai-knowledge` with 10 suggested topics — no answers pre-written.
   Search: `listPublicProjects` takes `bedrooms` (exact, 0 = studio),
   `minBedrooms`, `minAreaSqm`, matched on the same AVAILABLE unit; public
   projections include `bedrooms[]` and `sizeSqm {min,max}`
   (`availableUnitSummary()`). Verified with a real conversation; test rows
   removed.
2. **Telegram AI bot** — `modules/messaging/` (`telegram.ts` client,
   `telegram-bot.ts`), tables in `messaging.prisma`. Asks the assistant via
   `AssistantApi.replyToMessage` (shared `converse()` loop with the website
   chat). Leads get `source: 'TELEGRAM'`. Photo cards (numbered, with
   callback buttons `d:<id>` details / `v:<id>` viewing), swipe-reply
   context, `/start <campaign-code>`, `/new`, share-contact keyboard,
   plain-text replies (`toPlainText`), per-chat serialization, dedupe on the
   platform message id. `searchPublicProjects` gained `minPrice`/`maxPrice`,
   photos-first ranking and `{ total, results }`; `LOCATION_ALIASES` fixed
   area-spelling misses. Env: `TELEGRAM_BOT_TOKEN`, `PUBLIC_API_URL`,
   `PUBLIC_SITE_URL`, `TELEGRAM_API_BASE` (tests). Tested with a local fake
   Bot API + real Claude + real DB, then by the user on their phone (search,
   photos, buttons, swipe-replies, lead "Vannak" created).
3. **Editable channels** — `LeadSource`/`ChannelPlatform` enums replaced by
   text keys into `marketing_channels`; CRUD in marketing module, CRM
   validates sources via `MarketingApi.isActiveChannel`; admin
   `useChannelOptions()` drives every Source/Channel picker.
4. **Campaigns rebuilt** — `Campaign.code`, `marketing:write`, server-side
   stats, website/Telegram auto-attribution (`apps/client/src/lib/
   attribution.ts`).

## Checks still to do

- **Admin screens I haven't clicked through myself** (the browser pane
  isn't signed in; I never type passwords): AI Knowledge page; Channels tab
  + channel drawer; campaign drawer (ad link + Telegram bot link); Leads/
  Contacts Source pickers; property Publish/Private + bulk select;
  Development/Individual listing type; the unified Add/Edit property form.
  The user has used the Channels tab and channel drawer (screenshot,
  2026-09-24). Do one signed-in pass together.

## Known open items

- **Rotate the exposed secrets** before production: the demo's Anthropic key and the Telegram
  bot token were both pasted into chat (the demo uses them knowingly); the Mac's older Anthropic
  key still works — delete it in the console once no longer needed. Earlier note: `/revoke` in @BotFather + re-set
  `TELEGRAM_BOT_TOKEN` (a hidden-input command was given to the user); make
  a new Anthropic key in the console and replace `ANTHROPIC_API_KEY`.
- **AI Knowledge is empty** — ERA staff need to write the answers.
- **Listing data gaps**: 30 published listings have no photos (incl. the 5
  demo BKK1 rentals J Tower 1/2, M Residence, Le Condé BKK1 (For Rent),
  Navikah Residence); amenities empty on all 667; 217 without bedroom data;
  no description field. Content fixes in Inventory.
- **AI can still claim a save it never attempted** — only the prompt stops
  "noted/updated" without a `submit_lead` call (rejected saves are a server
  guarantee). Re-test whenever the prompt changes.
- **Inbox gaps**: website chats aren't stored, so they're not in the Inbox;
  photos/stickers a customer sends show only as a placeholder; visibility is
  filtered in code over the latest 200 conversations (fine now, needs a
  query-level filter at scale); no push/sound notification, only the badge.
- **Single-instance assumptions**: the chat rate limiter, the Telegram
  photo `file_id` cache and the card→property map are in memory (reset on
  restart, not shared across instances). Polling means only one API process
  may run the bot at a time.
- **Name search misses** spelling variants ("Picasso" vs "Piccasso") and
  run-together words ("timesquare"); `LOCATION_ALIASES` covers only the
  common Phnom Penh areas + Sihanoukville.
- **Customer site fetches the full catalog** (`PropertiesPage.tsx` loads all
  667, `PropertyDetailPage.tsx` loads it again for 3 "related" items). Fine
  now; fix = server-side filter + paging. Not approved yet.
- **Decorative UI on the customer site**: Share button, Favorite heart,
  unit `featured` flag unused, `disclosedUnitCount`/`sitePlanUrl` fetched
  but not shown. No decision yet.
- **`ImageGallery.tsx` file-picker → crop flow is untested end-to-end** (no
  agent can drive a native file dialog); the upload API behind it works.
- **`DRAFT`/`PENDING_SIGNATURE` contract statuses are unused** —
  `signContract` goes straight to ACTIVE; changing it touches when invoices
  generate.
- **About-page team members have no real photos** (content not supplied).

## If asked "what's next" with no other steer

1. Rotate the two exposed secrets; one signed-in pass over the admin
   screens above; staff start writing AI Knowledge.
2. Try the Inbox with a real phone chat (ask the bot for a person → Take
   over → reply → Hand back; also leave a taken-over chat unanswered 30 min
   to see the auto hand-back).
3. **Facebook Messenger, then WhatsApp** on the same `messaging` module
   (one Meta webhook; Messenger needs App Review for `pages_messaging`,
   WhatsApp a Business account + number; both have a 24h reply window; a
   privacy-policy page on the client site is a Meta prerequisite). Start the
   Meta approvals early — they're slow.
4. Deploying the API publicly (`PUBLIC_API_URL`) unlocks the Telegram
   webhook, "View on website" buttons and Meta webhooks.
