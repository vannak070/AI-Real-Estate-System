import type { ApprovalRefType, ApprovalType } from '@prisma/client';
import type { AppModule, ModuleContext } from '../../platform/module.js';
import { createOpsService } from './ops.service.js';

/**
 * Approvals + Documents CRUD lives in ops.service.ts/ops.router.ts, composed
 * in src/trpc/root.ts (not registered here — see ARCHITECTURE.md).
 *
 * `createApproval`/`hasUnresolvedApproval` are exposed to siblings — Sales
 * raises a `DISCOUNT` request here when a quotation's discount exceeds its
 * threshold, and checks `hasUnresolvedApproval` before letting that
 * quotation be accepted. No event subscriptions otherwise: both are pure
 * reads + an admin decide action, no saga participation.
 *
 * `Notification` has a schema (ops.prisma) but no service/router yet — no
 * admin screen reads or writes it (the header bell is still a static icon),
 * so there's nothing to build against. Add it when a real notification UI
 * shows up rather than speculatively now.
 */
export interface OpsApi {
  createApproval(input: {
    type: ApprovalType;
    refType: ApprovalRefType;
    refId: string;
    requestedBy: string;
    amount?: number;
    pct?: number;
    reason: string;
  }): Promise<{ id: string }>;
  hasUnresolvedApproval(refType: ApprovalRefType, refId: string): Promise<boolean>;
  listUnresolvedRefIds(refType: ApprovalRefType): Promise<string[]>;
}

export const opsModule: AppModule<OpsApi> = {
  name: 'ops',
  register(ctx: ModuleContext) {
    const service = createOpsService(ctx);
    const api: OpsApi = {
      createApproval: (input) => service.createApproval(input),
      hasUnresolvedApproval: (refType, refId) => service.hasUnresolvedApproval(refType, refId),
      listUnresolvedRefIds: (refType) => service.listUnresolvedRefIds(refType),
    };
    return { api };
  },
};
