import { z } from 'zod';
import { CommissionStatus, InvoiceStatus, PaymentMethod } from '@prisma/client';
import { router, withCapability } from '../../trpc/trpc.js';
import type { FinanceService } from './finance.service.js';

export function financeRouter(service: FinanceService) {
  return router({
    invoices: router({
      list: withCapability('finance:read')
        .input(
          z
            .object({
              status: z.nativeEnum(InvoiceStatus).optional(),
              outstandingOnly: z.boolean().optional(),
              contractId: z.string().optional(),
            })
            .optional(),
        )
        .query(({ input }) => service.listInvoices(input)),

      issue: withCapability('finance:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.issueInvoice(input.id)),
    }),

    payments: router({
      list: withCapability('finance:read')
        .input(z.object({ contractId: z.string().optional() }).optional())
        .query(({ input }) => service.listPayments(input)),

      record: withCapability('finance:write')
        .input(
          z.object({
            invoiceId: z.string(),
            method: z.nativeEnum(PaymentMethod),
            amount: z.number().positive(),
            reference: z.string().optional(),
          }),
        )
        .mutation(({ input, ctx }) => service.recordPayment({ ...input, recordedBy: ctx.user.id })),
    }),

    receipts: router({
      list: withCapability('finance:read')
        .input(z.object({ contractId: z.string().optional() }).optional())
        .query(({ input }) => service.listReceipts(input)),
    }),

    commissions: router({
      list: withCapability('finance:read')
        .input(
          z.object({ status: z.nativeEnum(CommissionStatus).optional(), contractId: z.string().optional() }).optional(),
        )
        .query(({ input }) => service.listCommissions(input)),

      approve: withCapability('commission:approve')
        .input(z.object({ id: z.string() }))
        .mutation(({ input, ctx }) => service.approveCommission(input.id, ctx.user.id)),

      markPaid: withCapability('commission:approve')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.markCommissionPaid(input.id)),
    }),

    arAging: withCapability('finance:read').query(() => service.arAging()),
    stats: withCapability('finance:read').query(() => service.stats()),

    contractBalances: withCapability('finance:read')
      .input(z.object({ contractIds: z.array(z.string()) }))
      .query(({ input }) => service.contractBalances(input.contractIds)),
  });
}
