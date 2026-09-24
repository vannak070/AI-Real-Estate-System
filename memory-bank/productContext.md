# Product Context

## Why this exists

A Cambodian real estate agency (ERA Cambodia) running on fragmented tools —
leads coming in over Facebook/Telegram/WhatsApp/the website with nothing
tracking them centrally, no per-agent accountability on a pipeline, sales
progress tracked ad hoc, a public website with zero connection to the actual
inventory or CRM. This system replaces all of that with one integrated
platform: a real back office for the team, and a real public site that feeds
leads straight into it.

## Who uses what

- **Agents** (`apps/admin`, role `AGENT`): work their own contacts and leads,
  request reservations, build quotations, see only their own book of business
  unless given `*:read:all`.
- **Sales managers** (`SALES_MANAGER`): see their team's full pipeline, sign
  contracts (`sales:sign`), decide discount approvals.
- **Finance** (`FINANCE`): invoices, payments, commissions, also holds
  `approvals:decide`.
- **Admin** (`ADMIN`): everything, including Users & Roles and the About-page
  CMS (`settings:write`).
- **Marketing** (`MARKETING`): manages campaigns, channels and the AI's
  company knowledge (`marketing:write`); read-only CRM.
- **Prospective buyers** (`apps/client` and Telegram, unauthenticated): browse
  published listings, ask the AI assistant, submit an enquiry or share their
  phone number — each becomes a real Lead auto-assigned to an agent.

## Product decisions already made (don't re-litigate without reason)

- **No public-facing pretty URLs.** Public project pages use the real Prisma
  `cuid`, not a slug. Revisit only if SEO becomes a stated priority.
- **The AI assistant is real AI, grounded in real data** — Claude
  (`claude-haiku-4-5-20251001`, chosen for the demo budget; a stronger model
  only with the user's say-so) with tool use over real Inventory/CRM, on the
  website chat and Telegram. It never states a property fact it didn't get
  from a tool, and answers questions about ERA itself only from the
  staff-written AI Knowledge — otherwise it offers an agent. Legal/process
  answers are written by ERA staff, never generated. `ANTHROPIC_API_KEY` /
  `TELEGRAM_BOT_TOKEN` are optional; without them the API still starts.
- **New properties are hidden from the website until published** ("Show on
  website", `isPublished`). Sold Out/Completed aren't auto-hidden.
- **Website tabs**: Exclusive Property (development projects + EXCLUSIVE
  badge) | For Sale | For Rent (individual listings, newest first). Pages of
  21/51/99. Don't bring back a CONDO/BOREY "Project" tab without asking.
- **Lead channels are an editable list**, not a fixed set — a new channel
  (TikTok, Khmer24, …) needs no developer. Renaming never changes old
  records; a channel in use can only be hidden.
- **A campaign's ad-link code never changes** once created (it's in running
  ads), and a campaign with leads can't be deleted — set it to Ended.
- **A quotation's discount above 15% needs a manager's sign-off before it can
  be *accepted* into a reservation** — it can still be freely edited/saved
  below that gate. This threshold is a business rule
  (`DISCOUNT_APPROVAL_THRESHOLD_PCT` in `sales.service.ts`), not a technical
  constraint — change it there if the business changes the policy.
- **A reservation gets a default 48-hour hold**, overridable per-request up to
  30 days. Below/above that isn't validated as a business rule beyond the cap;
  the cap itself exists so "hold" still means something.
- **Team member photos and most project photos are real uploads or nothing —
  never a fabricated stock photo standing in for a real, named person or a
  real, named property.** When there's no photo, the UI shows a plain
  initials avatar / neutral placeholder rather than inventing one. This
  precedent should hold for any future feature with a similar shape.

## UX conventions the product has settled on

- Every create/edit form validates with a `missing: string[]` array rendered
  as `Required: {missing.join(', ')}.` in red, with the submit button disabled
  while it's non-empty — not a silently-disabled button with no explanation,
  and not native HTML `required` (inconsistent styling across browsers).
- A record can usually be edited in place inside its own detail drawer (an
  "Edit" toggle switching a read-only `FieldGrid` to an editable form) rather
  than a separate modal — except where the domain has a real reason to
  restrict it (a DRAFT-only quotation edit; a reservation's unit/contact/agent
  are permanently fixed once created, only the deposit amount can change).
- Long/unbounded picker lists (units, projects, contacts) always get a
  searchable combobox capped at ~50 results with a "refine your search"
  hint — never a flat `<select>` of hundreds of options.
