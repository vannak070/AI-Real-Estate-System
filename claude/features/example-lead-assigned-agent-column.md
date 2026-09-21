# Feature: Assigned-agent name on the Admin Leads table

`<name>`: lead-assigned-agent-column
Status: example (shows the shape of a real feature file — not for implementation)

## Summary

On Admin → Leads, the "Assigned To" column currently shows nothing useful.
Show the assigned agent's **name**. Leads with no assignee show "Unassigned".

## Screens & images

- `claude/features/assets/lead-assigned-agent-column-1.png` — Leads table, new
  column between "Status" and "Score" (placeholder — attach the real mock).

## Jira

- ERA-142 — "Leads list: show assigned agent name" — <link>
  AC: name shown, not id; unassigned state; sortable by agent name.

## Figma

- <link> — frame "Admin / Leads / Table", cell style = existing table body cell.

## APIs / functions involved

- `apps/api/src/modules/identity/index.ts` → `IdentityApi.getUser()` — already exists,
  returns `{ id, name, role }`.
- `apps/api/src/modules/crm/index.ts` → `CrmApi.listLeads()` — add `assignedAgentName:
  string | null` to `CrmLeadView`; fill it by calling
  `ctx.modules.identity.getUser(assignedToId)` (batch: dedupe ids first).
- web: `apps/admin/src/api/leads.ts` → `listLeads()` type gains `assignedAgentName`.

## Base-code paths

- `apps/api/src/modules/crm/index.ts`
- `apps/admin/src/app/pages/LeadsPage.tsx`
- `claude/tests/test-lead-assigned-agent-column.md` (new)

## Acceptance criteria

- [ ] Column shows the agent name; "Unassigned" when `assignedToId` is null
- [ ] `crm` gets the name only via `ctx.modules.identity` — no import of the
      identity module, no join across `crm_*` and `identity_users`
- [ ] `CrmLeadView` stays a hand-written projection

## Out of scope

Changing assignment, filtering by agent, the customer-facing site.

## Open questions

- Sort by agent name server-side or client-side? (ERA-142 says sortable; not
  specified where.) Agent stops for an answer if this blocks.
