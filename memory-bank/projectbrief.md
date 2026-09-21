# Project Brief

**ERA – AI Integrated Real Estate System** — a real estate platform for
Cambodia (customer-facing site + admin back office) that owns its CRM,
inventory, and sales pipeline end-to-end, rather than bolting AI features
onto a third-party system.

## Structure

pnpm workspace monorepo, Turborepo-orchestrated:

```
apps/client         @era/client — customer website (React 18 + Vite SPA), :5173
apps/admin          @era/admin  — back-office SPA, :5174
apps/api            @era/api    — split-ready modular monolith backend, :4000
packages/contracts   @era/contracts   — versioned event & command schemas (zod)
packages/shared      @era/shared      — ids, logger
packages/api-client  @era/api-client  — tRPC client typed against @era/api's AppRouter
packages/ui          @era/ui          — shared React primitives
packages/mock-data   @era/mock-data   — legacy fixtures, now used only by ChatPage.tsx
packages/theme       @era/theme       — shared brand tokens
```

`apps/client` and `apps/admin` are separate deployments (both started as one
Figma Make export, later split). The customer site never links to the back
office; the back office links out to the customer site via a plain `<a href>`.

## Core requirement

Everything a real estate agency needs to run its business, wired together
through one backend rather than duct-taped Odoo/Excel/WhatsApp workflows:
- **CRM**: contacts, leads, a real sales pipeline with per-agent ownership.
- **Inventory**: projects, blocks, units, unit types, price lists — real data,
  not a demo dataset (637 real projects / 893 real units seeded).
- **Sales**: quotations → reservations → signed contracts, with a real
  discount-approval workflow and expiry handling.
- **Finance**: invoices, payments, receipts, commissions.
- **A public site** that actually captures leads into the same CRM, not a
  disconnected marketing page.

## Full context

This file is the stable "what is this" anchor. For what's actually true
*right now* — what's built, what's in progress, what's next — read
[`activeContext.md`](activeContext.md) and [`progress.md`](progress.md),
which are updated continuously; this file is not.
