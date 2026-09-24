/**
 * Shared RBAC. Roles are DB-backed and fully custom (`identity_roles` — see
 * `apps/api/prisma/schema/identity.prisma`): an admin can rename a role, change
 * which capabilities it grants, and create new roles from `apps/admin`'s
 * Settings → Roles tab. `Capability` stays a fixed, code-defined set — it's
 * literally the set of `withCapability(cap)` checks that exist in `apps/api`'s
 * routers, so it can't be invented from the UI.
 *
 * `can()` therefore just checks a capabilities array — no role lookup — because
 * the session (`AuthUser`, minted in `auth.service.ts`'s `getSessionUser`)
 * already carries its role's resolved `capabilities`.
 */

export type Capability =
  | 'crm:read'
  | 'crm:write'
  /** See every agent's contacts/leads, not just your own — see crm.router.ts's scoping. */
  | 'crm:read:all'
  | 'inventory:read'
  | 'inventory:write'
  | 'sales:read'
  | 'sales:write'
  | 'sales:sign'
  /** See every agent's quotations/reservations/contracts, not just your own — see sales.router.ts's scoping. */
  | 'sales:read:all'
  | 'finance:read'
  | 'finance:write'
  | 'commission:approve'
  | 'approvals:decide'
  | 'marketing:read'
  | 'marketing:write'
  | 'reports:read'
  | 'documents:read'
  | 'settings:write';

export const ALL_CAPABILITIES: Capability[] = [
  'crm:read',
  'crm:write',
  'crm:read:all',
  'inventory:read',
  'inventory:write',
  'sales:read',
  'sales:write',
  'sales:sign',
  'sales:read:all',
  'finance:read',
  'finance:write',
  'commission:approve',
  'approvals:decide',
  'marketing:read',
  'marketing:write',
  'reports:read',
  'documents:read',
  'settings:write',
];

// Plain `.endsWith(':read')` would miss the `:read:all` capabilities (three
// segments) — add them explicitly so Viewer's "read-only access everywhere"
// actually means everywhere.
const READ_ONLY: Capability[] = [
  ...ALL_CAPABILITIES.filter((c) => c.endsWith(':read')),
  'crm:read:all',
  'sales:read:all',
];

/**
 * Bootstrap data only — read by `apps/api/prisma/seed.ts` to create the initial
 * `identity_roles` rows. Once seeded, the DB rows are the source of truth; a
 * role's capabilities can diverge from this list after an admin edits it here
 * in the app.
 */
export interface DefaultRole {
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  capabilities: Capability[];
}

export const DEFAULT_ROLES: DefaultRole[] = [
  { key: 'ADMIN', name: 'Admin', description: 'Full access to every module.', isSystem: true, capabilities: ALL_CAPABILITIES },
  {
    key: 'SALES_MANAGER',
    name: 'Sales Manager',
    description: 'Runs a sales team: CRM, inventory, sales, and approvals.',
    isSystem: true,
    capabilities: [
      'crm:read',
      'crm:write',
      'crm:read:all',
      'inventory:read',
      'inventory:write',
      'sales:read',
      'sales:write',
      'sales:sign',
      'sales:read:all',
      'approvals:decide',
      'finance:read',
      'reports:read',
      'marketing:read',
      'documents:read',
    ],
  },
  {
    key: 'AGENT',
    name: 'Agent',
    description: 'Works contacts, leads, and their own reservations.',
    isSystem: true,
    capabilities: ['crm:read', 'crm:write', 'inventory:read', 'sales:read', 'sales:write', 'reports:read', 'documents:read'],
  },
  {
    key: 'FINANCE',
    name: 'Finance',
    description: 'Invoices, payments, commissions, and approvals.',
    isSystem: true,
    capabilities: [
      'finance:read',
      'finance:write',
      'commission:approve',
      'approvals:decide',
      'crm:read',
      'crm:read:all',
      'sales:read',
      'sales:read:all',
      'inventory:read',
      'reports:read',
      'documents:read',
    ],
  },
  {
    key: 'MARKETING',
    name: 'Marketing',
    description: 'Campaigns and channel performance.',
    isSystem: true,
    capabilities: ['marketing:read', 'marketing:write', 'crm:read', 'crm:read:all', 'reports:read'],
  },
  { key: 'VIEWER', name: 'Viewer', description: 'Read-only access everywhere.', isSystem: true, capabilities: READ_ONLY },
];

export function can(capabilities: Capability[] | undefined, cap: Capability): boolean {
  return !!capabilities?.includes(cap);
}
