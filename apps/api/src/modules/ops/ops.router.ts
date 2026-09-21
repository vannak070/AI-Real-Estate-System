import { z } from 'zod';
import { ApprovalStatus, DocRefType, DocType } from '@prisma/client';
import { router, withCapability } from '../../trpc/trpc.js';
import type { OpsService } from './ops.service.js';

export function opsRouter(service: OpsService) {
  return router({
    approvals: router({
      list: withCapability('approvals:decide')
        .input(z.object({ status: z.nativeEnum(ApprovalStatus).optional() }).optional())
        .query(({ input }) => service.listApprovals(input)),

      decide: withCapability('approvals:decide')
        .input(z.object({ id: z.string(), decision: z.enum(['APPROVED', 'REJECTED']) }))
        .mutation(({ input, ctx }) => service.decideApproval(input.id, input.decision, ctx.user.id)),
    }),

    documents: router({
      list: withCapability('documents:read')
        .input(
          z
            .object({
              type: z.nativeEnum(DocType).optional(),
              refType: z.nativeEnum(DocRefType).optional(),
              refId: z.string().optional(),
            })
            .optional(),
        )
        .query(({ input }) => service.listDocuments(input)),
    }),
  });
}
