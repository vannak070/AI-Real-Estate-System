import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { can } from '@era/contracts';
import { router, withCapability } from '../../trpc/trpc.js';
import { scopedOwnerId } from '../../trpc/scoping.js';
import type { SalesService } from './sales.service.js';

const discountTier = z.object({ label: z.string(), pct: z.number().min(0).max(100) });

const paymentPlanInstallment = z.object({
  label: z.string().min(1),
  percent: z.number().min(0).max(100),
  dueOffsetDays: z.number().int().nonnegative().optional(),
  milestone: z.string().optional(),
});

export function salesRouter(service: SalesService) {
  return router({
    paymentPlans: router({
      list: withCapability('sales:read').query(() => service.listPaymentPlans()),

      create: withCapability('settings:write')
        .input(
          z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            installments: z.array(paymentPlanInstallment).min(1),
          }),
        )
        .mutation(({ input }) => service.createPaymentPlan(input)),

      update: withCapability('settings:write')
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            description: z.string().nullable().optional(),
            installments: z.array(paymentPlanInstallment).min(1).optional(),
          }),
        )
        .mutation(({ input: { id, ...data } }) => service.updatePaymentPlan(id, data)),

      delete: withCapability('settings:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.deletePaymentPlan(input.id)),
    }),

    quotations: router({
      list: withCapability('sales:read')
        .input(z.object({ ownerId: z.string().optional() }).optional())
        .query(({ input, ctx }) => service.listQuotations(scopedOwnerId(ctx.user, 'sales:read:all', input?.ownerId))),

      get: withCapability('sales:read')
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
          const quotation = await service.getQuotation(input.id);
          if (quotation && !can(ctx.user.capabilities, 'sales:read:all') && quotation.ownerId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This quotation belongs to another agent' });
          }
          return quotation;
        }),

      create: withCapability('sales:write')
        .input(
          z.object({
            contactId: z.string(),
            unitId: z.string(),
            leadId: z.string().optional(),
            ownerId: z.string(),
            priceListId: z.string().optional(),
            listPrice: z.number().int().positive(),
            discounts: z.array(discountTier).default([]),
            paymentPlanId: z.string(),
            validUntil: z.coerce.date().optional(),
          }),
        )
        .mutation(({ input, ctx }) =>
          service.createQuotation({ ...input, ownerId: scopedOwnerId(ctx.user, 'sales:read:all', input.ownerId) ?? ctx.user.id }),
        ),

      // Only a DRAFT quotation may be edited (enforced in the service) — contactId/unitId/
      // ownerId aren't accepted here at all, so there's no risk of silently reassigning an
      // existing quote to a different customer/unit/agent through this path.
      update: withCapability('sales:write')
        .input(
          z.object({
            id: z.string(),
            leadId: z.string().nullable().optional(),
            priceListId: z.string().nullable().optional(),
            discounts: z.array(discountTier).optional(),
            paymentPlanId: z.string().optional(),
            validUntil: z.coerce.date().nullable().optional(),
          }),
        )
        .mutation(async ({ input: { id, ...data }, ctx }) => {
          const quotation = await service.getQuotation(id);
          if (quotation && !can(ctx.user.capabilities, 'sales:read:all') && quotation.ownerId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This quotation belongs to another agent' });
          }
          return service.updateQuotation(id, data);
        }),

      schedule: withCapability('sales:read')
        .input(z.object({ id: z.string() }))
        .query(({ input }) => service.getQuotationSchedule(input.id)),

      generatePdf: withCapability('sales:read')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.generateQuotationPdf(input.id)),

      accept: withCapability('sales:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.acceptQuotation(input.id)),
    }),

    reservations: router({
      list: withCapability('sales:read')
        .input(z.object({ agentId: z.string().optional() }).optional())
        .query(({ input, ctx }) => service.listReservations(scopedOwnerId(ctx.user, 'sales:read:all', input?.agentId))),

      get: withCapability('sales:read')
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
          const reservation = await service.getReservation(input.id);
          if (reservation && !can(ctx.user.capabilities, 'sales:read:all') && reservation.agentId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This reservation belongs to another agent' });
          }
          return reservation;
        }),

      // The hold is asynchronous (saga) — the mutation resolves once the HELD
      // row exists; poll `reservations` for CONFIRMED/CANCELLED.
      request: withCapability('sales:write')
        .input(
          z.object({
            unitId: z.string(),
            contactId: z.string(),
            agentId: z.string(),
            depositAmount: z.number().nonnegative().optional(),
          }),
        )
        .mutation(({ input, ctx }) =>
          service.requestReservation({ ...input, agentId: scopedOwnerId(ctx.user, 'sales:read:all', input.agentId) ?? ctx.user.id }),
        ),

      // Ownership check mirrors quotations.update: a plain sales:write holder may only act
      // on their own reservations unless they also hold sales:read:all.
      confirmDeposit: withCapability('sales:write')
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
          const reservation = await service.getReservation(input.id);
          if (reservation && !can(ctx.user.capabilities, 'sales:read:all') && reservation.agentId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This reservation belongs to another agent' });
          }
          return service.confirmDeposit(input.id);
        }),

      updateDeposit: withCapability('sales:write')
        .input(z.object({ id: z.string(), depositAmount: z.number().nonnegative() }))
        .mutation(async ({ input, ctx }) => {
          const reservation = await service.getReservation(input.id);
          if (reservation && !can(ctx.user.capabilities, 'sales:read:all') && reservation.agentId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This reservation belongs to another agent' });
          }
          return service.updateReservationDeposit(input.id, input.depositAmount);
        }),

      cancel: withCapability('sales:write')
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
          const reservation = await service.getReservation(input.id);
          if (reservation && !can(ctx.user.capabilities, 'sales:read:all') && reservation.agentId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This reservation belongs to another agent' });
          }
          return service.cancelReservation(input.id);
        }),

      signContract: withCapability('sales:sign')
        .input(
          z.object({
            reservationId: z.string(),
            salePrice: z.number().positive(),
            paymentPlanId: z.string().optional(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const reservation = await service.getReservation(input.reservationId);
          if (reservation && !can(ctx.user.capabilities, 'sales:read:all') && reservation.agentId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This reservation belongs to another agent' });
          }
          return service.signContract(input);
        }),
    }),

    contracts: router({
      list: withCapability('sales:read')
        .input(z.object({ agentId: z.string().optional() }).optional())
        .query(({ input, ctx }) => service.listContracts(scopedOwnerId(ctx.user, 'sales:read:all', input?.agentId))),

      get: withCapability('sales:read')
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
          const contract = await service.getContractDetail(input.id);
          if (contract && !can(ctx.user.capabilities, 'sales:read:all') && contract.agentId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This contract belongs to another agent' });
          }
          return contract;
        }),

      // Gated sales:sign (same trust level as signing) rather than sales:write — ending or
      // closing a contract is a structural lifecycle change, not routine data entry.
      terminate: withCapability('sales:sign')
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
          const contract = await service.getContractDetail(input.id);
          if (contract && !can(ctx.user.capabilities, 'sales:read:all') && contract.agentId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This contract belongs to another agent' });
          }
          return service.terminateContract(input.id);
        }),

      complete: withCapability('sales:sign')
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
          const contract = await service.getContractDetail(input.id);
          if (contract && !can(ctx.user.capabilities, 'sales:read:all') && contract.agentId !== ctx.user.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'This contract belongs to another agent' });
          }
          return service.completeContract(input.id);
        }),
    }),

    milestones: router({
      complete: withCapability('sales:write')
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input, ctx }) => {
          if (!can(ctx.user.capabilities, 'sales:read:all')) {
            const agentId = await service.getMilestoneOwner(input.id);
            if (agentId !== ctx.user.id) {
              throw new TRPCError({ code: 'FORBIDDEN', message: "This milestone belongs to another agent's contract" });
            }
          }
          return service.completeMilestone(input.id);
        }),

      update: withCapability('sales:write')
        .input(z.object({ id: z.string(), dueDate: z.coerce.date().nullable() }))
        .mutation(async ({ input, ctx }) => {
          if (!can(ctx.user.capabilities, 'sales:read:all')) {
            const agentId = await service.getMilestoneOwner(input.id);
            if (agentId !== ctx.user.id) {
              throw new TRPCError({ code: 'FORBIDDEN', message: "This milestone belongs to another agent's contract" });
            }
          }
          return service.updateMilestone(input.id, input.dueDate);
        }),
    }),
  });
}
