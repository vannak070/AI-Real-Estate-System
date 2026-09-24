# Active Context

**This file changes often — treat it as "what's true right now," and update
it (don't just append to it) whenever the current focus shifts.**
`progress.md` is the longer-lived companion: what's done, in a stable
narrative form.

## Where things stand (2026-09-24)

**Every screen in both `apps/admin` and `apps/client` is now backed by the
real API — including `apps/client`'s `ChatPage.tsx`, which is now a real
LLM-backed assistant (Tier 1, shipped 2026-09-24)**, not just connected to
real data (Tier 0, 2026-09-21). `@era/mock-data` has zero consumers in
`apps/client` or `apps/admin`; confirm that's still true before assuming so
(`grep -rl "@era/mock-data" apps/*/src`).

Most recent work, newest first:

1. **Telegram AI bot (2026-09-24, built + tested against a fake Telegram
   API; needs a real bot token from the user, admin UI check pending
   sign-in)** — new `apps/api/src/modules/messaging/` module (own tables in
   `prisma/schema/messaging.prisma`: `messaging_conversations` keyed by
   (channel, externalChatId) with `leadId`/`campaignCode`, and
   `messaging_messages` with a unique (conversationId, externalId) so a
   redelivered update is skipped, not answered twice). It owns the platform
   side and asks the assistant for each reply through the new
   `AssistantApi.replyToMessage` (the assistant's tool-use loop was
   extracted into a shared `converse()`; the website `chat` and chat-app
   `replyToMessage` are thin wrappers). Chat-app specifics: server-stored
   history (last 20 msgs; leading assistant turns dropped because the API
   needs a user turn first), leads created with `source: 'TELEGRAM'`
   (`CrmApi.createLead` now takes an optional `source` — only for callers
   that verified the origin), tool results carry a website `url` per
   property (`PUBLIC_SITE_URL`), replies forced to plain text by
   `toPlainText()` (**seen live: Haiku used `**bold**` on Telegram despite
   the prompt forbidding it** — so it's stripped server-side, a guarantee
   not a request), `/start <campaign-code>` deep links
   (`t.me/<bot>?start=<code>`) attribute the lead to a campaign, a
   "📱 Share my phone number" `request_contact` keyboard (someone else's
   contact is refused), `/new` resets history, non-text → "text only",
   group chats ignored, per-chat serialization, typing indicator, never
   throws into the customer's face (`MessagingReply` result type).
   Transport: **long polling when `PUBLIC_API_URL` is unset** (works on
   localhost, no tunnel — it calls `deleteWebhook` first), **webhook at
   `POST /webhooks/telegram` when it's set** (registered via `setWebhook`
   on every boot with a random per-process `secret_token`, checked with
   `timingSafeEqual`; replies 200 at once, processes in the background).
   Webhooks are the deliberate second exception to "HTTP is tRPC" (after
   `/health`). New `AppModule` hooks `start`/`stop` (app.ts runs them;
   `stop` aborts the poll and waits ≤8s for in-flight replies).
   `messaging.status` (marketing:read) feeds the Channels tab's Telegram card
   ("AI bot on · @name" / "not set up" / error) and the campaign drawer's
   "Telegram bot link". Env: `TELEGRAM_BOT_TOKEN` (optional — nothing starts
   without it), `PUBLIC_API_URL`, `PUBLIC_SITE_URL`, `TELEGRAM_API_BASE`
   (tests only). Verified: full conversation via a local fake Bot API + real
   Claude + real DB (grounded listings with links, contact share → exactly
   one TELEGRAM lead auto-assigned, phone correction updated the same lead,
   duplicate/group/photo handled, campaign code stored), webhook mode
   (wrong/no secret → 401, right → 200 + reply). Test data cleaned up.
   **Live since 2026-09-24 as @ERACambodiaAI_bot** (user tested on their
   phone; lead "Vannak" landed with source TELEGRAM). The token was pasted
   into chat, so it's treated as exposed — user told to `/revoke` and
   re-set it (hidden-input command given) before real customers use it.
   **Photo cards (same day, user asked "image instead of link"):** the
   model still writes each recommended property's website url on its own
   line; `replyToMessage` turns those into `cards` (only ids a tool returned
   this turn, max 5) and strips the links from the sent text, while the
   stored transcript keeps them so "the first one" still resolves next turn.
   The bot sends cards first (photo + name / "From $X[/month]" / 📍 area),
   then the text. Photos are local `/uploads` files, which Telegram can't
   fetch from localhost → uploaded as multipart from disk
   (`resolveUploadPath`, traversal-safe) the first time, then re-sent by the
   returned `file_id` (in-memory cache); with `PUBLIC_API_URL` set it passes
   the URL instead. A "View details" link button is added only when
   `PUBLIC_SITE_URL` is public (Telegram rejects localhost button URLs). No
   photo / failed photo → text card fallback.
   **Bug the user hit on their phone ("photos don't show"):** cards were
   only built for properties a tool returned *in the same turn*, but the
   links were stripped regardless — so a follow-up turn where the model
   repeated a url from history (no tool call) sent "The link is right here:"
   and nothing; and a detailed get_property answer that forgot the url sent
   no photo. Fixed: `extractCards` re-looks-up any linked id via
   `getPublicProject` (published-only → invented ids yield no card), a turn
   with exactly one get_property and no url still gets that property's
   card (`ConversationState.detailedIds`), and the prompt says customers
   never see urls (never mention links/paste/browser; to re-show a photo,
   repeat the url). Re-verified: search → details → "can I see a picture?"
   each send the photo.
   **"The bot doesn't understand customer replies" (user, same day)** — the
   real transcript showed "I love this"/"This property" after 5 photos and
   "Yes" after an "A, or B?" question going round in circles. Fixes: cards
   are numbered ("2. …") and carry inline callback buttons "ℹ️ More details"
   (`d:<projectId>`) / "📅 Book a viewing" (`v:<projectId>`) — a tap
   (`callback_query`, now in `allowed_updates`) is answered at once
   (`answerCallbackQuery`) and processed as the customer's message
   ("Tell me more about "X" (property id …)", published-only lookup;
   dedupe key `cb:<callback id>`); a swipe-reply (`reply_to_message`) to a
   card is prefixed "[Replying to photo card: "X" (property id …)]" via an
   in-memory message-id → property map (caption fallback after restart);
   the stored transcript replaces each link with "[Photo card N shown: name
   — price — area — url]" so later turns know exactly what was on screen
   (lines echoing that note are stripped from sent text); prompt rules for
   brief replies (number after a budget question = budget, "2"/"the second"
   = card 2, one question at a time, viewing requests re-call submit_lead
   with the property id). Verified by replaying the user's own conversation
   in the harness. Still on Haiku 4.5 — a stronger model (Sonnet 5, ~2× the
   per-token price) is the next lever if comprehension (esp. Khmer) is still
   weak; not changed without the user's say-so.
   **Found while testing: location search missed most of the inventory.**
   Listings spell areas in romanised Khmer ("Boeng Keng Kang", "Tuol
   Kouk") while customers type "BKK1"/"Toul Kork" — "BKK1 rent" found 5
   (the photo-less demo rows) instead of 93. Fixed with `LOCATION_ALIASES` +
   `locationSpellings()` in `inventory.service.ts` (matches location, city
   and district), which also fixes the website chat. `searchPublicProjects`
   now takes `minPrice`/`maxPrice` (filtered in code — `startingPrice` is
   derived), ranks listings with photos first, and returns
   `{ total, results }` so the AI can say "36 condos under $800" truthfully. Then Messenger/WhatsApp (Meta
   app + App Review / WhatsApp Business verification — slow, start early)
   and an admin Inbox for human handoff.
2. **Channels are an editable list (2026-09-24, admin UI check pending
   sign-in)** — the `LeadSource` and `ChannelPlatform` Postgres enums are
   gone: `Contact.source`/`Lead.source` and `Campaign.channel` (renamed from
   `platform`) are plain text keys into `marketing_channels` (`key` unique &
   permanent, `name`, `description`, `active`, `isSystem`, `sortOrder`;
   `platform`/`connected`/`autoReply` dropped — `connected` was a
   hand-ticked flag; bot connection is now read live from
   `messaging.status`). Hand-written, data-preserving migration
   `20260924080000_editable_channels` (nice names, old long names →
   description, WEBSITE `isSystem`, and a **hidden `CAMPAIGN` channel** so
   the 6 leads/6 contacts with the old enum's CAMPAIGN source keep a label).
   First attempt failed on the old `platform` NOT NULL — Postgres rolled the
   whole migration back, fixed order, `migrate resolve --rolled-back`, redeploy.
   Marketing: `channels.create/update/delete` (marketing:write; key =
   UPPER_SNAKE of the name with numeric suffix on clash, never editable;
   WEBSITE can be renamed but not hidden/deleted; delete refused while any
   lead/contact (`CrmApi.countRecordsWithSource`) or campaign uses it —
   "hide it instead"); `channels.list` is now `protectedProcedure` (agents
   pick Source from it). CRM `leads.create`/`contacts.create` validate the
   source via `MarketingApi.isActiveChannel`; campaigns must pick an active
   channel (keeping a since-hidden one on edit is allowed). Admin:
   `useChannelOptions(keep?)` (active options + current value, label lookup
   with title-case fallback, `pickDefault`) drives Leads/Contacts Source
   pickers and labels, the campaign Channel picker, Reports; Channels tab has
   New channel, click-to-edit drawer (name, description, Active, shows the
   key), two-click delete, "Show hidden". Verified via harness (create/key
   suffix/permission/system/in-use refusals/hidden refusals/stats) — all test
   rows removed.
3. **Marketing / Campaigns rebuilt + ad-link auto-attribution
   (2026-09-24, admin UI check pending sign-in)** — review found the
   `/campaigns` page was display-only (backend had only `list`; no
   `marketing:write` capability existed), nothing anywhere could set
   `Lead.campaignId` (only demo seed data had it), Marketing-role users saw
   $0 revenue / −100% ROI because the page fetched `sales.contracts.list`
   which they can't read, CPL/ROI were misleading with 0 leads/deals,
   revenue double-counted, and the Channels tab showed fake "connected / AI
   auto-reply" flags. Done (user approved): **deleted the 8 demo
   campaigns** (unlinked their 13 demo leads, leads kept); migration
   `…_add_campaign_code` adds `Campaign.code` (unique; readable slug like
   `qa-facebook-promo-5af0` generated on create, **not editable** — would
   break live ads; hand-written migration backfills from id, applied with
   `migrate deploy` because `migrate dev` refuses non-interactively for a
   new required unique column); new capability **`marketing:write`**
   (contracts + DB roles ADMIN/MARKETING + UsersPage group). Marketing
   module: create/update/delete (delete refused while leads are linked →
   "set it to Ended"), date validation, server-side `campaigns.stats`
   (leads by `campaignId`; each ACTIVE/COMPLETED contract credited to one
   campaign = the contact's latest campaign lead created on/before the
   contract) and `channels.stats` (leads per source, 30 days) — reads CRM/
   Sales only via new `CrmApi.listLeadsForAttribution/countLeadsForCampaign`
   and `SalesApi.listContractsForAttribution`. New `MarketingApi`
   (`findCampaignIdByCode`, `campaignExists`) used by CRM. CRM: admin
   `leads.create/update` accept `campaignId` (validated); `createLead`
   resolves `campaignCode` (unknown code → no campaign, never an error).
   **Auto-link**: `apps/client/src/lib/attribution.ts` captures
   `?utm_campaign=` on any page (CustomerLayout effect) into localStorage
   for 30 days, last click wins; sent as `campaignCode` by the enquiry form
   and the AI chat (assistant passes it to `createLead`). Admin: new
   Campaigns page (New/edit drawer with copyable ad link, two-click delete,
   "—" for CPL/ROI until meaningful via `costPerLead`/`campaignRoiPct` in
   lib/analytics, honest Channels tab), Reports' Campaign ROI uses server
   stats; Leads: Campaign picker on New lead + lead detail (only for
   `marketing:read` holders — agents can't list campaigns). Old client-side
   `computeCampaignStats` removed. Verified with a server-side harness
   (real procedures, fake admin/marketing/agent users) + real browser:
   ad link → browse → enquiry form lead linked; AI chat lead linked; stats
   2 leads / 1 deal / $50k (pre-ad contract excluded), identical for
   Marketing-only role; delete-with-leads refused; unknown campaign
   rejected. All test rows deleted; 0 campaigns now. Gate 17/17.
4. **AI chat: visitors can now correct their contact details
   (2026-09-24)** — user report: customer updated their contact in chat but
   admin still showed the old one. Cause: system prompt said "Never call
   submit_lead more than once per conversation" and the server was
   stateless, so a correction was silently dropped (a second call would
   have created a *duplicate* contact+lead anyway). Fix: the chat response
   now returns an HMAC-signed `leadToken` (`<leadId>.<sig>`, secret
   `CHAT_TOKEN_SECRET` — new optional env var, generated into the local
   `.env`; falls back to a per-process random secret with a startup warning).
   `ChatPage.tsx` persists it in sessionStorage with the conversation and
   sends it back each turn. With a valid token, `submit_lead` calls new
   `CrmApi.updateLeadContact` (crm.service.ts) → updates that lead's own
   contact in place (blank fields never wipe values) and logs a NOTE like
   `phone 012 345 678 → 098 765 432; email (none) → …`. Forged/invalid
   token → ignored (verified: can't touch another lead). Also added server
   email/phone sanity checks in the tool. **Live finding**: after a
   rejected email, Haiku still told the visitor "I've updated your email"
   even with an explicit prompt rule — so it's now a server guarantee: if
   the turn's last save attempt was rejected, the server writes the reply
   itself ("Sorry — I couldn't save that. … nothing has changed"). Tool
   calls are logged as `assistant.tool {tool, outcome}` (no PII). Verified
   live: create → correct phone+email → same single record updated + note;
   bad email → honest reply, DB unchanged; correction still works after an
   API restart; forged token rejected. Test rows deleted. Existing leads
   from before this fix (e.g. "Vannak" 016966036) can't be matched to their
   old chats — fix those by hand in admin. Gate 17/17.
5. **Admin Projects vs Sales/Rent is now an explicit setting —
   `Project.isDevelopment` (2026-09-24, admin UI check pending sign-in)** —
   the Projects page used to mean "more than 1 unit row", which filed the 45
   real ERA developer towers (1 sample unit each) under Sales and put 8
   multi-unit rental/sale listings (J Tower 1/2, M Residence, Navikah, Le
   Condé For Rent, The Peak shops, two "2 Flat Houses") on Projects.
   Migration `20260924044547_add_project_is_development` added the column
   (default false) and backfilled `true` WHERE `developer IS NOT NULL` —
   exactly the 45 ERA condos. Result: Projects 45 / Sales 193 / Rent 429.
   User said "remove the 8 multi-unit" — implemented as *moved off
   Projects* (to Sales/Rent), **not deleted**; told them to say so if they
   meant deletion. Admin: "Listing type" select in the shared form (Add from
   Projects defaults to Development; from Sales/Rent to Individual);
   presets now use `development: boolean` instead of a unit-count
   `membership` fn; Project cards show "N units in building · N floors ·
   developer" and the grid's "Units" stat is relabelled "Listed". Website
   wording renamed Live/Draft → **Published/Private** everywhere (cards,
   filter, form checkbox, detail header button). New **bulk** action:
   "Select to publish / make private" on any Inventory list → select cards
   (or "Select all shown") → Publish / Make private, via new
   `inventory.projects.setPublished({ ids, isPublished })` (updateMany,
   `inventory:write`). Detail page "Back" with no history now returns to
   the page the property lives on. ERA import scripts + demo seed set
   `isDevelopment: true` (`reseed-inventory-real-data.ts` only for
   `SALE_CONDOS`). Gate 17/17.
   **Follow-up same day — where projects show on the website**: user first
   picked "sort projects to the top of each tab", then corrected it: put
   projects **under the Exclusive tab**, and keep Sale/Rent newest-first.
   Current rule (`inTab()` in `PropertiesPage.tsx`, needs
   `listPublicProjects` returning `isDevelopment`, which it now does):
   **Exclusive Property** = published development projects (first) +
   EXCLUSIVE-badged listings, each newest first (107 = 45 + 62);
   **For Sale / For Rent** = individual properties only (development
   projects excluded), server order = newest upload first (193 / 429 —
   same as the back office's Sales/Rent pages). Note the 45 projects were
   re-created on 2026-09-24, so they're the newest rows — that's why they
   had to be *excluded* from For Sale, not just un-sorted. Verified live.
6. **"Show on website" flag — `Project.isPublished` (2026-09-24, admin UI
   check pending sign-in)** — before this, *every* Inventory row was on the
   customer site the moment it was created (status/badge only changed
   labels). New column `isPublished Boolean @default(false)` (migration
   `20260924042659_add_project_is_published`, which also `UPDATE`d all 667
   existing rows to `true` so nothing changed for customers). Enforced
   server-side in `inventory.service.ts`'s three public reads —
   `listPublicProjects` (where `isPublished: true`), `getPublicProject`
   (`findFirst` with it, so a direct link to a hidden property returns
   null → the site's "Property not found"), `listPublicUnits` (relation
   filter) — which also covers the AI chat, since its tools wrap those same
   functions via `InventoryApi`. Verified by curl against the live API:
   hiding G.A.T.O Tower dropped the list 667→666, detail→null, units→0;
   restored after. Admin: "Show on website" checkbox in the shared form's
   Marketing section (new properties default off), Live/Draft tag on every
   Inventory card, a "Website: all / Live / Draft" filter, and a one-click
   "Publish to website" / "Hide from website" button on the detail page
   header. All six import/seed scripts (`prisma/seed.ts`,
   `scripts/*.ts` that create projects) now set `isPublished: true` —
   re-running any of them would otherwise create hidden listings.
   Sold Out/Completed are NOT auto-hidden (user agreed). Gate 17/17.
7. **Admin Add/Edit property forms unified (2026-09-24, live UI check
   pending an admin sign-in)** — `NewProjectDrawer` (ProjectsPage.tsx) and
   `EditProjectDrawer` (ProjectDetailPage.tsx) were two hand-written copies
   that had drifted: Add lacked the Property facts (developer/tenure/
   floors/units) and Marketing (badge/video/price-override) sections, so a
   new listing couldn't be badged EXCLUSIVE at creation (the badge drives
   the website's Exclusive Property tab). Both now render one shared
   `ProjectFormFields` (`apps/admin/src/app/components/ProjectForm.tsx`,
   state/helpers in `projectFormState.ts` — split so react-refresh doesn't
   warn). Same sections/labels/validation; Name required everywhere,
   Province required only when there's no existing location (all 667
   imported records have only a free-text location, no province — Edit now
   shows that "Current location" instead of an empty picker). Bugs fixed:
   (a) video link / price override / handover date / floors / units /
   developer / tenure / phase could never be cleared — `projectInput` in
   `inventory.router.ts` now takes `.nullable()` and the form sends `null`
   for blanks (omitted still = unchanged); (b) changing Province kept the
   old District/Commune/Village (form merged the picker's partial update);
   (c) Edit drawer was always-mounted and initialised once, so it could
   reopen stale — now mounted only while open. After Add it navigates to
   the new property's detail page. Wording is "New property / Edit
   property" everywhere; dropdowns show readable labels. Phase 2 (price/
   bed/bath on Add for Sales/Rent, auto-creating the first unit) proposed,
   not approved. Gate 17/17.
8. **`/properties` tabs + pagination — current shape (2026-09-24)**: tabs
   are **Exclusive Property | For Sale | For Rent** — tab *membership* was
   later changed (see item 1's follow-up: Exclusive now also holds the
   published development projects, and Sale/Rent exclude them; current
   counts 107 / 193 / 429). EXCLUSIVE-badged listings still also appear
   under For Sale/For Rent (overlap intentional). Client-side pagination with a 21/51/99 page-size selector (all multiples of 3)
   (default 21 = 7 full rows of 3), `1 … 6 [7] 8 … 12`-style page numbers, Prev/Next, scroll
   back to the results bar on page change, and any tab/filter/page-size
   change resets to page 1. Pager hides when everything fits on one page.
   **How it got here** (same day, several user iterations): label went
   "All Properties" → "All Projects" → "Exclusive Project"; then the tabs
   were briefly re-categorized by `propertyType` (Exclusive Project =
   CONDO/BOREY, 326) to "align with the back office" — the back office's
   own `totalUnits > 1` Projects rule was rejected first because only 8 of
   667 projects have >1 seeded Unit row. User then replaced that Project
   tab with the badge-based **Exclusive Property** tab above (asked via a
   layout question; they explicitly dropped the Project tab). Don't
   re-introduce a CONDO/BOREY "Project" bucket without asking.
   **Known limitation**: pagination is client-side — the page still
   fetches all 667 projects up front (see "Known open items"). Verified
   live incl. 375px width (no horizontal overflow). Gate: 17/17.
9. **ERA sale/condo listings refreshed from a live re-scrape of
   eracambodia.com/projects (2026-09-24)** — user asked to delete existing
   Inventory and re-scrape from that URL. Scoped down from a literal full
   wipe after confirming with the user: "delete the existing Project" would
   otherwise also destroy the 592 Pointer Asia listings (a different
   source, not covered by this scrape, with no recovery trail this time —
   see `progress.md`'s "Incidents worth remembering"). User chose: keep
   Pointer Asia, only replace the ERA-sourced rows. Scraped the live page
   in-browser (not via a headless fetch — the site is a client-rendered
   Squarespace page; grabbed name/location/starting-price/image URL per
   card straight from the DOM, `<img alt>` conveniently matches each
   project name) — found 45 unique Cambodia condo/apartment projects (plus
   Dubai/Australia "Oversea" listings, excluded as out of scope for this
   Cambodia-only system). Matched against the exact 47 names
   `reseed-inventory-real-data.ts`'s `SALE_CONDOS` array ever seeded from
   this same URL; captured each match's existing `developer`/`tenure`/
   `totalFloors`/`disclosedUnitCount` before deleting (this pass didn't
   re-visit each project's own detail page, so those richer facts are
   carried forward from the prior scrape rather than re-scraped). New
   script `apps/api/scripts/refresh-era-sale-condos-2026-09-24.ts` (+ its
   `era-projects-rescrape-2026-09-24.json` data file, both kept, reusable):
   deleted units/blocks/price-lists/projects for the 47 matched rows,
   recreated the 45 still-live ones with real current name/location/price
   and a real downloaded photo each, and correctly did **not** recreate the
   2 that are no longer live (`The Bridge - Soho Units`, `Olympia City` —
   already known to have "no real scrape source," per `progress.md`).
   Net: 669 → 667 projects; Pointer Asia's 592 confirmed untouched (622
   projects still have null developer/tenure/etc. — the Pointer Asia
   signature). Per the user's explicit instruction, Sales/CRM was left
   untouched — any seeded demo transaction pointing at an old unit id here
   is now a dangling reference, the same accepted tradeoff documented in
   `reseed-inventory-real-data.ts`. Verified live: Properties page and a
   project detail page (G.A.T.O Tower) both show the real current price/
   location/developer/photo. Full `pnpm turbo run typecheck lint build`:
   17/17.
10. **`ChatPage.tsx` Tier 1 — real LLM-backed AI assistant (2026-09-24)**,
   replacing the scripted decision-tree from Tier 0 with an actual
   Claude-powered conversation. New backend module
   `apps/api/src/modules/assistant/` (`assistant.public.chat`, public/
   unauthenticated like `crm.public.submitLead`) calls the Anthropic API
   (`@anthropic-ai/sdk`, model `claude-haiku-4-5-20251001`) server-side with
   **three tools, all backed by real existing module code, never
   fabricated**: `search_properties`/`get_property` (new
   `InventoryApi.searchPublicProjects`/`getPublicProject`/`listPublicUnits`
   methods in `apps/api/src/modules/inventory/index.ts`, wrapping the same
   `listPublicProjects`/etc. the public tRPC router already used —
   `listPublicProjects` gained an optional server-side filter+limit so the
   tool never dumps the full ~700-project catalog into the LLM's context)
   and `submit_lead` (new `CrmApi.createLead`, same write path
   `crm.public.submitLead` uses, `source` hardcoded `'WEBSITE'` same as
   always). Client-side `ChatPage.tsx` was simplified: the old
   `conversationFlow`/`step` state machine, `findMatchingProperties`,
   `calculateLeadScore`, and all the hardcoded response text are gone —
   it's now just "send full message history to `assistant.public.chat`,
   render whatever real reply + real property cards come back." The
   `sessionStorage` persistence finished the same day (see below) carries
   over unchanged. Config: `ANTHROPIC_API_KEY` is **optional** in
   `apps/api/.env` — the whole API still starts fine without it; only
   `assistant.public.chat` itself throws a clear error if it's called with
   no key configured, so this can't break anyone else's dev/prod setup.
   Guardrails added deliberately: a message-length cap, a 40-message
   conversation cap, and an in-process per-IP sliding-window rate limiter
   (20 req/min) — no Redis in this stack, single-instance deployment, so
   this is a pragmatic ceiling against runaway cost, not a distributed
   solution; resets on process restart.

   **Two real bugs found and fixed during live verification** (both would
   have shipped silently without actually testing against the real
   Anthropic API, not just typecheck):
   - The model would sometimes say "I've passed your details to our sales
     team" in its text reply **without having actually called the
     `submit_lead` tool** — confirmed via `psql` (no new Contact/Lead
     existed after a "confirmed" submission). This is the exact same class
     of trust violation Tier 0 was built to eliminate, just from the model
     itself instead of hardcoded fake text. Fixed by adding an explicit,
     forceful system-prompt rule: never claim an action was taken unless
     the corresponding tool was actually invoked in that same response.
     Retested 3x after the fix (two genuine submissions, correctly
     verified in Postgres each time) — reliable so far, but this is a
     probabilistic model behavior, not a hard guarantee; if it recurs, the
     next step would be detecting "claims submission but didn't call the
     tool" server-side and forcing a corrective round rather than trusting
     the prompt alone.
   - `submit_lead`'s `preferredProjectId` (a bare, unvalidated id column,
     no DB-level FK — see `crm.prisma`) got a **project's name** instead of
     its real id from the model in testing ("UC88 Wyndham Garden" instead
     of a cuid) — would have silently corrupted a real Lead record with no
     error, since nothing validates that column. Fixed in
     `assistant.service.ts`'s `submit_lead` tool handler: verify the
     claimed id against a real project (either already seen this
     conversation via `search_properties`/`get_property`, or a direct
     `getPublicProject` lookup) before trusting it; if invalid, drop it but
     fold the mentioned name into the lead's free-text message instead of
     losing the information. Also tightened the tool's own schema
     description to say "the real `id` field... NEVER the property name."
   Also fixed in the same pass: the assistant's `get_property`/unit tools
   were missing `areaSqm`/`floor`/`view` (only had bedrooms/bathrooms/
   price), so it correctly said "I don't have that" for a unit's size
   instead of guessing — safe, but an avoidable data gap; added those
   fields to `PublicUnitView`. Verified live afterward: asked the exact
   same size question fresh and got the correct real value (800 sqm).
   Full loop verified end-to-end multiple times: real search grounded in
   real inventory, real property cards with working `/properties/:id`
   links, real lead submitted and visible in Postgres, test rows cleaned
   up each time. `pnpm turbo run typecheck lint build`: 17/17.
11. **`ChatPage.tsx` conversation persistence — completed (2026-09-24)**,
   finishing a fix left mid-implementation at hand-off on 2026-09-21 (user
   reported that clicking "View Details" on a "Compare with Other
   Properties" card — or any nav away from `/chat` and back — unmounted
   `ChatPage` and lost the whole conversation, since `messages`/`step`/
   `leadData`/`schedulingData` were plain `useState` with no persistence).
   The prior session had already added the `sessionStorage`-backed
   `loadPersistedChat`/`savePersistedChat` helpers and the `initial`/
   `effectivePropertyId` restore-on-mount logic, but left two things
   unfinished: the actual save-effect was never wired up (`savePersistedChat`
   was defined but called nowhere, so nothing was ever saved to restore),
   and the property-fetch effect's dependency array still read
   `[propertyContext?.propertyId]` instead of `[effectivePropertyId]`. Fixed
   both — added the missing `useEffect` that calls `savePersistedChat(...)`
   on every `messages`/`step`/`leadData`/`schedulingData`/
   `effectivePropertyId`/`effectivePropertyName` change, corrected the
   dependency array (and added `initial` to it, since it's a stable
   `useState` value with no setter ever called — silences
   `react-hooks/exhaustive-deps` without changing behavior). `pnpm --filter
   @era/client typecheck`/`lint` both clean. Verified live in the browser
   pane: (1) a general chat survives navigating to Properties and back; (2)
   a property-specific chat survives navigating away (via the nav bar link,
   no `state`) and back, resuming the same property's conversation; (3)
   clicking a *different* property's own "Chat with AI" entry point
   correctly starts a **fresh** conversation rather than leaking the first
   property's history (confirmed via `sessionStorage`'s stored
   `propertyName` before/after); (4) walked a full property-viewing request
   through to submission — `crm.public.submitLead` still returned `200 OK`
   and a real Contact/Lead landed in Postgres, confirmed via `psql`, then
   deleted. Full `pnpm turbo run typecheck lint build` gate: 17/17.
12. **`ChatPage.tsx` silently dropped leads with a malformed phone/email —
   fixed (2026-09-21)** — user report: submitted a full chat conversation,
   got a generic "I couldn't submit your details" error, and (correctly,
   this time) found nothing in the back office. Root cause: the free-text
   phone/email steps in the main lead-qualification flow (and the
   mid-scheduling free-text flow in property-specific chat) accepted
   *any* text with zero client-side validation and stored it straight into
   `leadData`; at the very end, `crm.public.submitLead`'s zod schema
   (`email: z.string().email().optional()`) rejects a non-email string
   server-side, the mutation 400s, and the generic `.catch()` handler shows
   a vague "couldn't submit" message with no indication of which field was
   wrong — the whole profile (every answer already given) is lost, since
   nothing gets created without a successful call. Reproduced the user's
   exact input (email `"jhgfdsa"`) and confirmed no Contact/Lead exists for
   it. Fixed with two new helpers, `isValidEmail`/`isValidPhone` (plain
   regex, no new dependency — matches this file's existing style), checked
   *before* advancing past the phone/email steps in both flows: an invalid
   answer now gets an immediate, specific correction ("That doesn't look
   like a valid email address...") and the conversation stays on that step
   instead of silently accepting garbage and failing at the very end. The
   mid-scheduling free-text branch (property-specific chat) had the same
   class of bug from a different angle — it used `.includes("@")`/
   `/^\+?\d/` as loose "does this look like an email/phone" heuristics with
   no `else` fallback, so an unrecognized answer there just did nothing
   (same "conversation appears frozen" symptom as the earlier stale-closure
   bug, different cause); swapped in the same two helpers and added the
   missing fallback branch. Verified live end-to-end: garbage phone → caught
   with a retry prompt, valid phone accepted, garbage email (the user's
   exact repro) → caught with a retry prompt and **no** `submitLead` request
   fired, valid email → `200 OK` and a real Contact/Lead landed in Postgres
   with the correct phone/email. Test data cleaned up afterward.
13. **Contacts/Pipeline default view fixed for `crm:read:all` holders**
   (2026-09-21) — reported as "chat submits leads but nothing shows up in
   the back office." Investigated live: the lead/contact was landing
   correctly (`crm.public.submitLead` → 200 OK, confirmed in Postgres,
   correctly auto-assigned to the least-loaded agent) and *was* visible in
   the admin UI — just not on the tab being looked at. Both
   `ContactsPage.tsx` and `LeadsPage.tsx` default their "My X / Everyone"
   toggle to `'mine'` unconditionally; logged in as `Admin User` (or any
   Sales Manager/Finance user with `crm:read:all`), that's always empty,
   since chat/website leads auto-assign to an **agent** (`pickLeastLoadedAgent`
   in `crm.service.ts`), never to an admin account. Fixed by defaulting the
   toggle to `'all'` when the viewer holds `crm:read:all`, `'mine'`
   otherwise — a one-line `useState` initializer change in each page, safe
   because `<RequireAuth>` guarantees auth has resolved before either page
   ever renders. Verified live logged in as Admin: both pages now load
   showing the full team's data immediately (42 leads / 52 contacts) with
   no manual toggle needed. No backend change — the data was always
   correct, this is purely a "which agent does this account behave like by
   default" UX fix.
14. **`prisma/seed.ts` now refuses to wipe non-demo data — safety guard added
   (2026-09-21)**, closing the loop on item 4 below. New `assertSafeToReset()`
   runs before `reset()`: if `Project` holds any row whose id isn't one of
   `erpSeed.projects`' own ids (i.e. anything this seed script didn't itself
   create — the real 637-listing dataset, or any other real/richer data),
   it prints a clear explanation + the exact incident it's guarding against
   and exits 1 without touching anything. `--force` (CLI arg) or
   `SEED_FORCE=1` (env var) overrides it for a genuinely intended wipe.
   Verified live: ran `tsx prisma/seed.ts` with no flag against the real
   669-project Inventory — refused, exit code 1, `select count(*) from
   inventory_projects` confirmed still 669 afterward. Root cause of the
   original wipe (item 4) was never conclusively found (see that entry) —
   this guard makes the actual mechanism not matter: nothing running
   `db:seed`, deliberately or accidentally, through any channel, can repeat
   it without explicitly opting in. `CLAUDE.md`'s Commands section updated
   to describe the guard instead of just "optional demo data."
15. **Real 637-project scraped dataset recovered after a DB reset wiped it
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
16. **`ChatPage.tsx` quick-reply buttons were silently broken — fixed
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
17. **"Auto-complete contract on all-invoices-paid" investigated and rejected**
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
18. **CRM ownership-check audit** (2026-09-21, commit `fc0a846`) — closed the
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
19. **Documentation consistency sweep** — after the Tier 0 fix below shipped,
   corrected every file in this session that still claimed `ChatPage.tsx`
   was "the only remaining mock screen, zero backend" (this file,
   `progress.md`, `productContext.md`, `CLAUDE.md`, `claude/config.md`, and
   this assistant's own private memory) to instead say it's connected to
   real data but still not a real AI. Pure doc correction, no code changed.
20. **`ChatPage.tsx` Tier 0 fix** — the "AI Property Assistant" widget was
   auditing as fully disconnected: hardcoded `@era/mock-data` properties
   (stale `P001`-style ids that no longer matched real project ids after
   the Public Listings Plan), a false "securely stored in Odoo CRM" claim,
   and fabricated booking-confirmation text. Fixed to fetch real projects/
   units from `inventory.public.*` and submit real leads via
   `crm.public.submitLead`; removed the `@era/mock-data` dependency from
   `apps/client/package.json` entirely (it was the last consumer). Still
   no LLM — free text is matched with simple heuristics, not understood.
   Tier 1 (real LLM integration) was explicitly scoped out and not done.
21. **`ManageAboutPage` CMS** — was pure decorative `useState`, is now a real
   backend (new Prisma models: `AboutPageContent`/`AboutMilestone`/
   `AboutTeamMember`/`AboutAward`) + full admin editor + the client's
   `AboutPage.tsx` Overview/History/Team/Awards tabs reading real data.
   Content was seeded from what used to be hardcoded on the client page
   (`prisma/seed-about.ts`, idempotent, safe to re-run). Team photos are
   deliberately blank (initials avatar) rather than carrying over the mock's
   fake stock photos.
22. **Public Listings Plan** — `apps/client`'s Properties list/detail pages
   and a real lead-capture form, wired to new `inventory.public.*` and
   `crm.public.submitLead` endpoints. Full loop verified: a public enquiry
   really lands as a Lead the admin Pipeline shows.
23. **Reservation form polish** — deposit auto-suggest, configurable hold
   duration, required payment plan + schedule preview on Sign Contract, a
   search box on the Reservations list.
24. **Reservation & Contract lifecycle overhaul** — manual reservation
    creation (previously only reachable via accepting a quotation), a real
    Sign Contract form, auto-generated milestones at signing (previously
    never created outside the seed script), Terminate/Complete contract
    actions, ownership checks added to every sales write mutation that
    lacked them.
25. **`identity.users.list`/`.get` passwordHash leak** — fixed (explicit
    `select`, not Prisma `omit` — see `techContext.md` for why `omit` didn't
    work here).
26. **This memory bank + `CLAUDE.md`/`claude/config.md` refresh** — both rule
    files had drifted (still describing an old "Phase 8, partially wired"
    state); corrected to match the above.

## Known open items (not yet done)

- **30 published listings have no photos** (e.g. the 5 demo BKK1 rentals
  J Tower 1/2, M Residence, Le Condé BKK1 (For Rent), Navikah Residence;
  Vue Aston (For Rent); most COMMERCIAL/TOWNHOUSE sale rows) — the bots
  rank them last and send a text card instead of a photo. Content fix:
  upload photos in admin. `LOCATION_ALIASES` only covers the common
  Phnom Penh areas + Sihanoukville; add rows when a new spelling shows up.
- **Telegram token was exposed in chat** — revoke + re-set before launch.
- ~~AI chat can't look a property up by name~~ — **closed 2026-09-24.**
  `listPublicProjects` takes an optional `name`: matched in code (not
  ILIKE — no `unaccent` extension) after `normalizeName()` (lowercase,
  accents stripped, punctuation → spaces), and every typed word must *start*
  a word of the name ("odom" → Odom Tower/Living, not "Norodom"; "le conde"
  → Le Condé …). Still published-only. `search_properties` exposes `name`,
  and the prompt says to name-search before ever saying "not listed".
  Verified live: "UC88 Wyndham Garden" and "Le Conde 2" both found with
  the real prices. Known miss: spelling variants ("Picasso" vs the listing's
  "Piccasso") and run-together words ("timesquare") won't match.
- **AI chat could still *claim* a save it never attempted.** The server now
  guarantees an honest reply when a save is *rejected*, but if the model
  simply doesn't call `submit_lead` and says "noted/updated", only the prompt
  rule stops it. Verify live whenever the assistant prompt changes.

- **Customer site fetches the full catalog client-side.** `PropertiesPage.tsx`
  calls `inventory.public.projects.list` with no args (all 667 projects) and
  paginates/filters/counts in the browser; `PropertyDetailPage.tsx` fetches
  that same full list *again* just to pick 3 "related" items. Admin's
  `useProjects()` is equally unbounded. Fine at this size, but grows
  linearly. Fix = server-side filter + page params on the public list
  (the AI assistant's `searchPublicProjects` already has the filter shape)
  plus a small "related" query. Not yet approved by the user; raised
  2026-09-24.
- **Decorative/dead UI on the customer site**: property-detail Share button
  (no handler) and Favorite heart (local state only); a unit's `featured`
  flag is editable in admin (copy promises a homepage rail) but nothing on
  the client reads it; `disclosedUnitCount`/`sitePlanUrl` are fetched but
  never rendered. Raised 2026-09-24, no decision yet.
- ~~`ChatPage.tsx` is not a real AI~~ — **closed 2026-09-24.** Tier 1 shipped:
  it's now a real Claude-backed assistant with tool-use grounded in real
  inventory/CRM data (see "Where things stand" above for the full build).
  Remaining, smaller gaps from that build, not full open items: no admin-
  side visibility into chat transcripts (nothing logs a conversation
  anywhere — if a lead's `message` field looks odd, that's all there is to
  go on), the per-IP rate limiter is in-process/single-instance (fine now,
  won't survive a multi-instance deployment without moving it to
  something shared), and the "claims submission without calling the tool"
  failure mode was fixed via prompt instruction, not a hard server-side
  guarantee — re-test this specifically if `submit_lead` behavior is ever
  touched again, don't assume the prompt fix is bulletproof forever.
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

1. **Telegram bot go-live** — the user creates the bot with @BotFather and
   sets `TELEGRAM_BOT_TOKEN`; then check it end-to-end on a real phone and
   do the pending admin UI checks (Channels tab, campaign drawer links).
2. **Facebook Messenger, then WhatsApp** on the same `messaging` module
   (one Meta webhook for both; Messenger needs App Review for
   `pages_messaging`, WhatsApp needs a Business account + number; both have
   a 24h reply window). A privacy-policy page on the client site is a Meta
   prerequisite.
3. **Admin Inbox + human handoff** — agents read bot conversations
   (`messaging_messages`) and take over.
4. Content: real photos for About-page team members.
