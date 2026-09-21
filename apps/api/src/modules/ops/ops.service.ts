import { TRPCError } from '@trpc/server';
import type { ApprovalRefType, ApprovalStatus, ApprovalType, DocRefType, DocType } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';

export function createOpsService({ db }: ModuleContext) {
  return {
    /* ── Approvals ── */

    listApprovals(filter?: { status?: ApprovalStatus }) {
      return db.approvalRequest.findMany({
        where: { status: filter?.status },
        orderBy: { createdAt: 'desc' },
      });
    },

    /** Cross-module entry point (`modules.ops.createApproval`) — a sibling module
     * (e.g. Sales, gating an over-threshold discount) raises a PENDING request
     * for a human to decide on `/approvals`; nothing here interprets `refType`. */
    createApproval(input: {
      type: ApprovalType;
      refType: ApprovalRefType;
      refId: string;
      requestedBy: string;
      amount?: number;
      pct?: number;
      reason: string;
    }) {
      return db.approvalRequest.create({ data: { ...input, status: 'PENDING' } });
    },

    /** True while a ref has a request that isn't (yet, or ever going to be) APPROVED —
     * PENDING blocks until decided, REJECTED blocks permanently (the caller must raise
     * a fresh request against a revised ref, e.g. a new quotation with a smaller discount). */
    async hasUnresolvedApproval(refType: ApprovalRefType, refId: string) {
      const count = await db.approvalRequest.count({
        where: { refType, refId, status: { in: ['PENDING', 'REJECTED'] } },
      });
      return count > 0;
    },

    /** Batched form of `hasUnresolvedApproval`, for annotating a whole list (e.g. every
     * quotation row) with one query instead of one round-trip per row. */
    async listUnresolvedRefIds(refType: ApprovalRefType) {
      const rows = await db.approvalRequest.findMany({
        where: { refType, status: { in: ['PENDING', 'REJECTED'] } },
        select: { refId: true },
      });
      return rows.map((r) => r.refId);
    },

    async decideApproval(id: string, decision: 'APPROVED' | 'REJECTED', decidedBy: string) {
      const approval = await db.approvalRequest.findUniqueOrThrow({ where: { id } });
      if (approval.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'approval_already_decided' });
      }
      return db.approvalRequest.update({
        where: { id },
        data: { status: decision, decidedBy, decidedAt: new Date() },
      });
    },

    /* ── Documents ── */

    listDocuments(filter?: { type?: DocType; refType?: DocRefType; refId?: string }) {
      return db.documentFile.findMany({
        where: { type: filter?.type, refType: filter?.refType, refId: filter?.refId },
        orderBy: { uploadedAt: 'desc' },
      });
    },
  };
}

export type OpsService = ReturnType<typeof createOpsService>;
