import { can, ALL_CAPABILITIES, type Capability } from '@era/contracts';

export { can, ALL_CAPABILITIES };
export type { Capability };

/**
 * Capability required to open a route path (prefix match). Dashboard needs
 * none. This mapping is admin-UI-specific (which screen needs which server
 * capability) — it stays here, not in the shared package.
 */
export const ROUTE_CAPS: { prefix: string; cap: Capability }[] = [
  { prefix: '/reports', cap: 'reports:read' },
  { prefix: '/contacts', cap: 'crm:read' },
  { prefix: '/leads', cap: 'crm:read' },
  { prefix: '/tasks', cap: 'crm:read' },
  { prefix: '/inventory', cap: 'inventory:read' },
  { prefix: '/quotations', cap: 'sales:read' },
  { prefix: '/reservations', cap: 'sales:read' },
  { prefix: '/contracts', cap: 'sales:read' },
  { prefix: '/approvals', cap: 'approvals:decide' },
  { prefix: '/invoices', cap: 'finance:read' },
  { prefix: '/payments', cap: 'finance:read' },
  { prefix: '/commissions', cap: 'finance:read' },
  { prefix: '/campaigns', cap: 'marketing:read' },
  { prefix: '/agents', cap: 'reports:read' },
  { prefix: '/documents', cap: 'documents:read' },
  { prefix: '/users', cap: 'settings:write' },
  { prefix: '/settings', cap: 'settings:write' },
  { prefix: '/about', cap: 'settings:write' },
];

export function canOpen(capabilities: Capability[] | undefined, path: string): boolean {
  const rule = ROUTE_CAPS.find((r) => path === r.prefix || path.startsWith(r.prefix + '/'));
  return rule ? can(capabilities, rule.cap) : true; // '/' and unknowns: allowed
}
