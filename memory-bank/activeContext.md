# Active Context

**What's true right now.** Edit in place when the focus shifts; move
finished work into `progress.md` (short summary + the *why*), keep only the
last few items here. Verify any claim against the code before relying on it.

## Where things stand (2026-09-24)

Every screen in `apps/admin` and `apps/client` runs on the real API; nothing
uses `@era/mock-data` except `apps/api/prisma/seed.ts`. The AI assistant
(Claude Haiku 4.5) answers on the **website chat** and on **Telegram**
(@ERACambodiaAI_bot, live, polling from this machine), grounded in real
published Inventory, saving leads into CRM, and using staff-written
**AI Knowledge** for questions about ERA itself.

## Recent work (newest first — full reasoning in `progress.md`)

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

- **Rotate the exposed secrets**: the Telegram bot token and the Anthropic
  API key were both pasted into chat. `/revoke` in @BotFather + re-set
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
- **No admin view of bot conversations** — Telegram history is stored
  (`messaging_messages`) but there's no Inbox yet; website chats aren't
  stored at all.
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
2. **Admin Inbox + human handoff** for bot conversations.
3. **Facebook Messenger, then WhatsApp** on the same `messaging` module
   (one Meta webhook; Messenger needs App Review for `pages_messaging`,
   WhatsApp a Business account + number; both have a 24h reply window; a
   privacy-policy page on the client site is a Meta prerequisite). Start the
   Meta approvals early — they're slow.
4. Deploying the API publicly (`PUBLIC_API_URL`) unlocks the Telegram
   webhook, "View on website" buttons and Meta webhooks.
