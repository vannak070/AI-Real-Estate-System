# Active Context

**What's true right now.** Edit in place when the focus shifts; move
finished work into `progress.md` (short summary + the *why*), keep only the
last few items here. Verify any claim against the code before relying on it.

## Where things stand (2026-09-25 afternoon, checked against git and the server)

**The user considers the build feature-complete** ("All function are
completed") — focus is now the management/investor review, not new features.

**Git:** `origin/main` = `7fae14b` (website chat in the Inbox). **Uncommitted:**
`assistant.service.ts` (the tool_use-without-tool fix, already live on the
demo) + these memory-bank files. The user commits and pushes on `main`
themselves; the agent's shell has **no GitHub credentials** — never type
credentials.

**The demo runs the current code** (last push 2026-09-25 ~08:10 UTC,
including that fix). Staff Telegram alerts are linked and tested for real
(1 link, test alert received). Website chats appear in the Inbox (0 real ones
yet — all test chats were deleted).

**Presentation for management/investors:** Slides artifact
https://claude.ai/artifact/Xj9XEdpLj1jzwTgA8NAxKM ("ERA AI Real Estate
System — Management & Investor Walkthrough", 22 slides, downloads as PDF /
PPTX; private until the user shares it). Website screenshots came from
headless Chrome (`--timeout=40000` for Properties — shorter caught
"Loading…"); back office is diagrams + one Inbox screenshot the user sent.
**Pipeline and Quotations screenshots still wanted** — the agent can't
capture signed-in screens (browser-pane screenshots aren't saved as files,
`screencapture` has no permission), so the user pastes them into chat. The
user edits the deck too (they removed the "Where we are today" slide): read
it before changing; page numbers in footers are hard-coded per slide.

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

0. **Website chat in the Inbox** (live on the demo 2026-09-25 ~08:10 UTC,
   committed as `7fae14b` except the tool_use fix below; backup before it:
   `/var/backups/era/pre-webchat-20260925-0756.dump`; migration `20260925100000_messaging_website_chat` adds
   `messaging_messages.attachments`). The website chat is now stored like
   Telegram: `modules/messaging/website-chat.ts`, public tRPC
   `messaging.web.{send,history}`; the browser keeps only a random token
   (`localStorage` `era-chat-v2`, `apps/client/src/lib/chat-storage.ts`).
   Staff see website chats in the Inbox, get the same alerts, take over and
   reply; the visitor's chat polls (4 s with the team, 15 s otherwise) and the
   site's chat button shows a dot for an unseen reply (`useChatReplyDot`).
   A property page's chat link now continues the same conversation. Old
   `assistant.public.chat` + `leadToken`/`CHAT_TOKEN_SECRET` removed. New code
   guarantee: a reply promising "a team member will reply here" without
   `request_agent` flags the chat anyway (seen once in testing). And
   `converse()` treats `stop_reason: tool_use` with no tool_use block as the
   final reply — Haiku does this often (2 of 4 tries); answering it sent an
   empty user turn → API 400 → "trouble connecting" (seen live on the demo;
   logged as `assistant.tool_use_without_tool`). Harness 10/10
   + browser click-through. Also: Inbox nav badge / header bell now count
   unread chats (grey) as well as waiting ones (red) — that part is live.
1. **Staff alerts on Telegram** (live on the demo) —
   `modules/messaging/staff-alerts.ts`; staff link their own Telegram from the
   Inbox; alerts for "customer wants a person", a customer writing in a chat
   they handle, the 30-min auto hand-back, and a new lead assigned to them.
   Harness 20/20; linked and test alert received on the demo 2026-09-25.
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

- **Pipeline + Quotations screenshots** for the deck (user pastes them).
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
- **Inbox gaps**: customer photos show as a placeholder; a website visitor
  only sees a staff reply on the same device/browser; visibility filtered in code over the latest 200 conversations.
- **Single-instance assumptions**: rate limiter, Telegram caches in memory.
- **No automated tests** — every check so far was a throw-away harness.
- Name search misses spelling variants; `LOCATION_ALIASES` covers only
  common areas. Customer site loads the full catalog (fine at 667).
- Unused: `featured` flag, `DRAFT`/`PENDING_SIGNATURE` contract statuses.
- `ImageGallery.tsx` file-picker → crop flow untested; team members have no
  real photos; two unexplained admin HTTP 500s seen once locally (not
  reproduced) — watch on the demo.

## If asked "what's next" with no other steer

1. Commit the tool_use fix + memory bank (user). Finish the deck.
2. Management feedback; ERA confirms contact details; staff write AI
   Knowledge; fill listing data gaps; rotate secrets.
3. **Facebook Messenger, then WhatsApp** on the `messaging` module (start
   Meta's app review early; needs a privacy-policy page).
4. Automated tests from the harness patterns in `techContext.md`.
