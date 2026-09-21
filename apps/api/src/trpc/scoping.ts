import { can, type Capability } from '@era/contracts';
import type { AuthUser } from '../modules/identity/auth.service.js';

/**
 * Row-level ownership scoping, shared by every module that gates "see/assign
 * everyone's records" behind its own `<module>:read:all`-style capability
 * (CRM's `crm:read:all`, Sales' `sales:read:all`, …). Without that
 * capability, the caller is silently forced to their own id — they can't
 * even request someone else's data by passing a different id, or assign a
 * new record to someone else.
 */
export function scopedOwnerId(user: AuthUser, allCap: Capability, requested?: string | null): string | undefined {
  return can(user.capabilities, allCap) ? (requested ?? undefined) : user.id;
}
