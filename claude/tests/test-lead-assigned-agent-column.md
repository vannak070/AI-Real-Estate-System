# Test: Assigned-agent name on the Admin Leads table

`<name>`: lead-assigned-agent-column
Type: API script + manual UI check

## Flow under test

`GET /crm/leads` returns each lead with the assigned agent's name, and the Admin
Leads table renders it.

## Preconditions / seed data

- `pnpm --filter @era/api db:seed` (creates "Demo Agent")
- Create two leads: one assigned to the seeded agent, one with `assignedToId` null
- Signed in as: ADMIN

## Steps

1. `POST /crm/leads` with `assignedToId` = seeded agent id → 201
2. `POST /crm/leads` with no `assignedToId` → 201
3. `GET /crm/leads` → 200

## Assertions

- API: lead 1 has `assignedAgentName: "Demo Agent"`; lead 2 has
  `assignedAgentName: null`
- API: response shape is exactly `CrmLeadView` (no leaked Prisma fields)
- Code: `apps/api/src/modules/crm/` contains no `import` from `../identity`
- Code: `apps/admin/src/app/pages/LeadsPage.tsx` renders the new column
- Code: no Prisma query in `crm` references `identity_users`
- UI: Leads table shows "Demo Agent" and "Unassigned" in the new column

## Eventual-consistency notes

None — this is a synchronous read path, no events involved.

## Cleanup

Delete the two created leads and their contacts.

## How to run

```bash
pnpm --filter @era/api dev          # terminal 1
# terminal 2:
curl -s localhost:4000/crm/leads | jq
```
