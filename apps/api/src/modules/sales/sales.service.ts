import { TRPCError } from '@trpc/server';
import { SalesEvents } from '@era/contracts';
import type { ModuleContext } from '../../platform/module.js';
import { saveBuffer } from '../../platform/uploads.js';
import { renderQuotationPdf } from './quotation-pdf.js';

const RESERVATION_TTL_MS = 1000 * 60 * 60 * 48; // 48h hold
const QUOTE_DEPOSIT_PCT = 2;
const ACTIVE_RESERVATION_STATUSES = ['HELD', 'CONFIRMED'] as const;
/** Above this combined discount, a quotation needs a manager's sign-off before it can be accepted. */
const DISCOUNT_APPROVAL_THRESHOLD_PCT = 15;

export interface PaymentPlanInstallment {
  label: string;
  percent: number;
  dueOffsetDays?: number;
  milestone?: string;
}

export interface DiscountTier {
  label: string;
  /** percent taken off the price remaining after the prior tier, e.g. [{label:'1st discount', pct:10}, {label:'2nd discount', pct:5}] stacks 10% then 5% off the reduced price. */
  pct: number;
}

export interface ScheduleRow {
  label: string;
  milestone?: string;
  /** null when the installment has no fixed offset (e.g. a milestone-only row like "Handover") */
  date: Date | null;
  netAmount: number;
  cumulativeAmount: number;
}

/** Applies each discount tier in sequence against the running price — matches how agents actually stack promotions. */
export function applyDiscountTiers(listPrice: number, discounts: DiscountTier[]) {
  let price = listPrice;
  for (const d of discounts) {
    price -= Math.round((price * d.pct) / 100);
  }
  return { netPrice: price };
}

/**
 * Projects a payment plan's installments into real dollar amounts + a running
 * total, from a chosen start date. The last installment absorbs whatever cent
 * rounding drift accumulated across the earlier rows, so the schedule always
 * reconciles exactly to `netPrice` — a customer-facing document with a
 * running total that doesn't add up to the final price undermines trust in
 * the whole quotation.
 */
export function projectPaymentSchedule(
  installments: PaymentPlanInstallment[],
  netPrice: number,
  startDate: Date,
): ScheduleRow[] {
  let cumulative = 0;
  return installments.map((inst, i) => {
    const isLast = i === installments.length - 1;
    const netAmount = isLast ? netPrice - cumulative : Math.round((netPrice * inst.percent) / 100);
    cumulative += netAmount;
    return {
      label: inst.label,
      milestone: inst.milestone,
      date: inst.dueOffsetDays != null ? new Date(startDate.getTime() + inst.dueOffsetDays * 86_400_000) : null,
      netAmount,
      cumulativeAmount: cumulative,
    };
  });
}

/**
 * `installments` is a Prisma `Json` column — its generated type is a deeply
 * recursive union that blows up tRPC's client-side type inference
 * ("Type instantiation is excessively deep") once it round-trips through
 * `@era/api-client`. Cast it to a concrete shape at the service boundary so
 * every procedure that returns a payment plan gets a flat, inferable type.
 */
function projectPaymentPlan<T extends { installments: unknown }>(plan: T) {
  return { ...plan, installments: plan.installments as unknown as PaymentPlanInstallment[] };
}

/** Same rationale as `projectPaymentPlan` — cast the `discounts` Json column to a flat, inferable shape. */
function projectQuotation<T extends { discounts: unknown }>(q: T) {
  return { ...q, discounts: q.discounts as unknown as DiscountTier[] };
}

/** A plan whose installments don't sum to 100% would silently under- or over-bill a customer across the schedule. */
function validateInstallments(installments: PaymentPlanInstallment[]) {
  if (installments.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'payment_plan_needs_installments' });
  }
  const total = installments.reduce((sum, i) => sum + i.percent, 0);
  if (Math.round(total) !== 100) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'payment_plan_percent_mismatch' });
  }
}

export function createSalesService({ db, bus, logger, modules }: ModuleContext) {
  async function createReservation(input: {
    unitId: string;
    contactId: string;
    agentId: string;
    depositAmount?: number;
    quotationId?: string;
    /** Overrides the default 48h hold — e.g. a manager granting a buyer more time to arrange a deposit. */
    holdHours?: number;
  }) {
    const holdMs = input.holdHours != null ? input.holdHours * 60 * 60 * 1000 : RESERVATION_TTL_MS;
    const reservation = await db.reservation.create({
      data: {
        number: await modules.settings.nextNumber('RSV'),
        unitId: input.unitId,
        contactId: input.contactId,
        agentId: input.agentId,
        quotationId: input.quotationId,
        depositAmount: input.depositAmount ?? 0,
        status: 'HELD',
        expiresAt: new Date(Date.now() + holdMs),
      },
    });

    await bus.publish(
      SalesEvents.ReservationRequested.type,
      {
        reservationId: reservation.id,
        unitId: input.unitId,
        contactId: input.contactId,
        agentId: input.agentId,
      },
      { correlationId: reservation.id },
    );
    return reservation;
  }

  return {
    /* ── Payment plans (reference data, shown read-only in Settings) ── */

    async listPaymentPlans() {
      const rows = await db.paymentPlanTemplate.findMany({ orderBy: { name: 'asc' } });
      return rows.map(projectPaymentPlan);
    },

    async createPaymentPlan(input: { name: string; description?: string; installments: PaymentPlanInstallment[] }) {
      validateInstallments(input.installments);
      const row = await db.paymentPlanTemplate.create({
        data: { ...input, installments: input.installments as unknown as object },
      });
      return projectPaymentPlan(row);
    },

    async updatePaymentPlan(
      id: string,
      input: { name?: string; description?: string | null; installments?: PaymentPlanInstallment[] },
    ) {
      if (input.installments) validateInstallments(input.installments);
      const row = await db.paymentPlanTemplate.update({
        where: { id },
        data: { ...input, installments: input.installments as unknown as object | undefined },
      });
      return projectPaymentPlan(row);
    },

    async deletePaymentPlan(id: string) {
      const [quotationCount, contractCount] = await Promise.all([
        db.quotation.count({ where: { paymentPlanId: id } }),
        db.salesContract.count({ where: { paymentPlanId: id } }),
      ]);
      if (quotationCount > 0 || contractCount > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This plan is used by existing quotations or contracts and can\'t be deleted.',
        });
      }
      await db.paymentPlanTemplate.delete({ where: { id } });
    },

    /* ── Quotations ── */

    async listQuotations(ownerId?: string) {
      const rows = await db.quotation.findMany({
        where: { ownerId },
        include: { paymentPlan: true },
        orderBy: { createdAt: 'desc' },
      });
      const unresolvedIds = new Set(await modules.ops.listUnresolvedRefIds('QUOTATION'));
      return rows.map((r) =>
        projectQuotation({ ...r, paymentPlan: projectPaymentPlan(r.paymentPlan), pendingApproval: unresolvedIds.has(r.id) }),
      );
    },

    async getQuotation(id: string) {
      const row = await db.quotation.findUnique({ where: { id }, include: { paymentPlan: true } });
      if (!row) return null;
      const pendingApproval = await modules.ops.hasUnresolvedApproval('QUOTATION', id);
      return projectQuotation({ ...row, paymentPlan: projectPaymentPlan(row.paymentPlan), pendingApproval });
    },

    async createQuotation(input: {
      contactId: string;
      unitId: string;
      leadId?: string;
      ownerId: string;
      priceListId?: string;
      listPrice: number;
      discounts: DiscountTier[];
      paymentPlanId: string;
      validUntil?: Date;
    }) {
      const { netPrice } = applyDiscountTiers(input.listPrice, input.discounts);
      const discountAmount = input.listPrice - netPrice;
      const discountPct = input.listPrice > 0 ? (discountAmount / input.listPrice) * 100 : 0;
      const row = await db.quotation.create({
        data: {
          number: await modules.settings.nextNumber('QT'),
          contactId: input.contactId,
          unitId: input.unitId,
          leadId: input.leadId,
          ownerId: input.ownerId,
          priceListId: input.priceListId,
          listPrice: input.listPrice,
          discounts: input.discounts as unknown as object,
          discountPct,
          discountAmount,
          netPrice,
          paymentPlanId: input.paymentPlanId,
          validUntil: input.validUntil,
          status: 'DRAFT',
        },
        include: { paymentPlan: true },
      });

      if (discountPct > DISCOUNT_APPROVAL_THRESHOLD_PCT) {
        await modules.ops.createApproval({
          type: 'DISCOUNT',
          refType: 'QUOTATION',
          refId: row.id,
          requestedBy: input.ownerId,
          pct: discountPct,
          amount: discountAmount,
          reason: `Quotation ${row.number}: ${discountPct.toFixed(1)}% discount (list $${input.listPrice.toLocaleString()} -> net $${netPrice.toLocaleString()}) exceeds the ${DISCOUNT_APPROVAL_THRESHOLD_PCT}% threshold.`,
        });
      }

      return projectQuotation({ ...row, paymentPlan: projectPaymentPlan(row.paymentPlan) });
    },

    /** Only a DRAFT quotation can be edited — once it's been sent/accepted its terms are fixed;
     * fixing a mistake past that point means creating a fresh quotation, not silently changing
     * one the customer may already have in hand. contactId/unitId/ownerId are deliberately not
     * editable here — changing the customer or the unit isn't "editing", it's a different quote. */
    async updateQuotation(
      id: string,
      input: Partial<{
        leadId: string | null;
        priceListId: string | null;
        discounts: DiscountTier[];
        paymentPlanId: string;
        validUntil: Date | null;
      }>,
    ) {
      const existing = await db.quotation.findUniqueOrThrow({ where: { id } });
      if (existing.status !== 'DRAFT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'quotation_not_editable' });
      }

      const discounts = input.discounts ?? (existing.discounts as unknown as DiscountTier[]);
      const { netPrice } = applyDiscountTiers(existing.listPrice, discounts);
      const discountAmount = existing.listPrice - netPrice;
      const discountPct = existing.listPrice > 0 ? (discountAmount / existing.listPrice) * 100 : 0;

      const row = await db.quotation.update({
        where: { id },
        data: {
          leadId: input.leadId,
          priceListId: input.priceListId,
          paymentPlanId: input.paymentPlanId,
          validUntil: input.validUntil,
          discounts: discounts as unknown as object,
          discountPct,
          discountAmount,
          netPrice,
        },
        include: { paymentPlan: true },
      });

      // The edited discount may now cross the approval threshold for the first time —
      // mirror createQuotation's check rather than leaving a newly-risky discount ungated.
      if (discountPct > DISCOUNT_APPROVAL_THRESHOLD_PCT && !(await modules.ops.hasUnresolvedApproval('QUOTATION', id))) {
        await modules.ops.createApproval({
          type: 'DISCOUNT',
          refType: 'QUOTATION',
          refId: id,
          requestedBy: existing.ownerId,
          pct: discountPct,
          amount: discountAmount,
          reason: `Quotation ${row.number}: ${discountPct.toFixed(1)}% discount (list $${existing.listPrice.toLocaleString()} -> net $${netPrice.toLocaleString()}) exceeds the ${DISCOUNT_APPROVAL_THRESHOLD_PCT}% threshold.`,
        });
      }

      const pendingApproval = await modules.ops.hasUnresolvedApproval('QUOTATION', id);
      return projectQuotation({ ...row, paymentPlan: projectPaymentPlan(row.paymentPlan), pendingApproval });
    },

    /** The payment schedule, projected into real dates/amounts from the quotation's own creation date. */
    async getQuotationSchedule(id: string): Promise<ScheduleRow[]> {
      const row = await db.quotation.findUniqueOrThrow({ where: { id }, include: { paymentPlan: true } });
      const plan = projectPaymentPlan(row.paymentPlan);
      return projectPaymentSchedule(plan.installments, row.netPrice, row.createdAt);
    },

    /**
     * Renders the customer-facing "Quotation to Purchase" PDF and saves it to
     * disk, returning its URL. Aggregates across every sibling module this
     * document needs (unit/project via inventory, buyer via crm, agent via
     * identity, letterhead via settings) — sales doesn't own any of that data,
     * it just composes the read the same way the admin UI composes multiple
     * API calls for cross-module views elsewhere in this codebase.
     */
    async generateQuotationPdf(id: string) {
      const quotation = await db.quotation.findUniqueOrThrow({ where: { id }, include: { paymentPlan: true } });
      const plan = projectPaymentPlan(quotation.paymentPlan);
      const schedule = projectPaymentSchedule(plan.installments, quotation.netPrice, quotation.createdAt);

      const [unit, contact, agent, company] = await Promise.all([
        modules.inventory.getUnitDocument(quotation.unitId),
        modules.crm.getContact(quotation.contactId),
        modules.identity.getAgentDocument(quotation.ownerId),
        modules.settings.getCompanyProfile(),
      ]);

      const buffer = await renderQuotationPdf({
        number: quotation.number,
        createdAt: quotation.createdAt,
        validUntil: quotation.validUntil,
        listPrice: quotation.listPrice,
        discounts: quotation.discounts as unknown as DiscountTier[],
        netPrice: quotation.netPrice,
        schedule,
        unit,
        contact,
        agent,
        company,
      });

      const { url } = await saveBuffer(`quotations/${id}`, buffer, 'pdf');
      return { url };
    },

    async acceptQuotation(id: string) {
      const quotation = await db.quotation.findUniqueOrThrow({ where: { id } });
      if (quotation.status === 'ACCEPTED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'quotation_already_accepted' });
      }
      if (await modules.ops.hasUnresolvedApproval('QUOTATION', id)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'discount_approval_unresolved' });
      }
      await db.quotation.update({ where: { id }, data: { status: 'ACCEPTED' } });
      const depositAmount = Math.round((quotation.netPrice * QUOTE_DEPOSIT_PCT) / 100 / 100) * 100;
      return createReservation({
        unitId: quotation.unitId,
        contactId: quotation.contactId,
        agentId: quotation.ownerId,
        depositAmount,
        quotationId: id,
      });
    },

    /* ── Reservations ── */

    listReservations(agentId?: string) {
      return db.reservation.findMany({
        where: { agentId },
        include: { quotation: true, contract: { select: { id: true } } },
        orderBy: { createdAt: 'desc' },
      });
    },

    getReservation(id: string) {
      return db.reservation.findUnique({
        where: { id },
        include: { quotation: true, contract: { select: { id: true } } },
      });
    },

    /** Starts the reservation saga: create a HELD row, ask Inventory to hold the unit. */
    requestReservation: createReservation,

    async confirmDeposit(id: string) {
      const reservation = await db.reservation.findUniqueOrThrow({ where: { id } });
      if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status as 'HELD' | 'CONFIRMED')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'reservation_not_active' });
      }
      return db.reservation.update({ where: { id }, data: { depositPaid: true } });
    },

    /** The deposit amount is the one reservation detail that can change before it's actually
     * been paid — the unit/contact/agent stay fixed by design (see updateQuotation's rationale).
     * Once `depositPaid` is true the figure is locked in; renegotiating past that point means
     * cancelling and re-requesting, not silently rewriting a receipt that's already been given. */
    async updateReservationDeposit(id: string, depositAmount: number) {
      const reservation = await db.reservation.findUniqueOrThrow({ where: { id } });
      if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status as 'HELD' | 'CONFIRMED')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This reservation is no longer active.' });
      }
      if (reservation.depositPaid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'The deposit has already been marked as received and can no longer be changed.',
        });
      }
      return db.reservation.update({ where: { id }, data: { depositAmount } });
    },

    async cancelReservation(id: string) {
      const reservation = await db.reservation.findUniqueOrThrow({ where: { id } });
      if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status as 'HELD' | 'CONFIRMED')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'reservation_not_active' });
      }
      const updated = await db.reservation.update({ where: { id }, data: { status: 'CANCELLED' } });
      await bus.publish(SalesEvents.ReservationCancelled.type, {
        reservationId: id,
        unitId: reservation.unitId,
        reason: 'cancelled_by_agent',
      });
      return updated;
    },

    /** Saga callback — Inventory confirmed the hold. */
    async onUnitReserved(reservationId: string) {
      await db.reservation.update({ where: { id: reservationId }, data: { status: 'CONFIRMED' } });
      logger.info('sales.reservation_confirmed', { reservationId });
    },

    /** Saga compensation — Inventory refused the hold. */
    async onUnitReservationRejected(reservationId: string, reason: string) {
      const r = await db.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
      });
      await bus.publish(SalesEvents.ReservationCancelled.type, {
        reservationId,
        unitId: r.unitId,
        reason,
      });
      logger.warn('sales.reservation_cancelled', { reservationId, reason });
    },

    async signContract(input: { reservationId: string; salePrice: number; paymentPlanId?: string }) {
      const reservation = await db.reservation.findUniqueOrThrow({
        where: { id: input.reservationId },
      });
      if (reservation.status !== 'CONFIRMED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This reservation must have its deposit confirmed before a contract can be signed.',
        });
      }

      // No quotation-driven plan yet (Phase 3) — fall back to whatever plan
      // template exists. Seed at least one (see prisma/seed.ts).
      const plan = input.paymentPlanId
        ? await db.paymentPlanTemplate.findUniqueOrThrow({ where: { id: input.paymentPlanId } })
        : await db.paymentPlanTemplate.findFirstOrThrow();
      const installments = plan.installments as unknown as PaymentPlanInstallment[];

      const signedAt = new Date();
      const contractNumber = await modules.settings.nextNumber('SPA');
      const contract = await db.$transaction(async (tx) => {
        const c = await tx.salesContract.create({
          data: {
            number: contractNumber,
            reservationId: reservation.id,
            unitId: reservation.unitId,
            contactId: reservation.contactId,
            agentId: reservation.agentId,
            salePrice: input.salePrice,
            netPrice: input.salePrice,
            paymentPlanId: plan.id,
            status: 'ACTIVE',
            signedAt,
          },
        });
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'CONVERTED' },
        });
        // The payment plan's installments double as the contract's milestone schedule —
        // Finance's onContractSigned generates the matching invoices from the same
        // installments off the same ContractSigned event; this just keeps the two schedules
        // (invoices and milestones) in sync from a single source instead of drifting apart.
        const schedule = projectPaymentSchedule(installments, input.salePrice, signedAt);
        if (schedule.length > 0) {
          await tx.contractMilestone.createMany({
            data: schedule.map((row) => ({ contractId: c.id, label: row.label, dueDate: row.date })),
          });
        }
        return c;
      });

      await bus.publish(
        SalesEvents.ContractSigned.type,
        {
          contractId: contract.id,
          unitId: reservation.unitId,
          contactId: reservation.contactId,
          agentId: reservation.agentId,
          salePrice: input.salePrice,
        },
        { correlationId: contract.id },
      );
      return contract;
    },

    /** Projection source for `SalesApi.getContract` — Finance reads this to build invoices/commission. */
    getContractWithPlan(id: string) {
      return db.salesContract.findUnique({ where: { id }, include: { paymentPlan: true } });
    },

    getContractNumbers(ids: string[]) {
      return db.salesContract.findMany({
        where: { id: { in: ids } },
        select: { id: true, number: true },
      });
    },

    /* ── Contracts (admin views) ── */

    listContracts(agentId?: string) {
      return db.salesContract.findMany({ where: { agentId }, orderBy: { createdAt: 'desc' } });
    },

    async getContractDetail(id: string) {
      const row = await db.salesContract.findUnique({
        where: { id },
        include: { paymentPlan: true, milestones: { orderBy: { dueDate: 'asc' } } },
      });
      return row ? { ...row, paymentPlan: projectPaymentPlan(row.paymentPlan) } : null;
    },

    /** Ends a contract early (buyer default, mutual cancellation, …) — a genuine business
     * outcome with no code path before this, distinct from COMPLETED. */
    async terminateContract(id: string) {
      const contract = await db.salesContract.findUniqueOrThrow({ where: { id } });
      if (contract.status === 'TERMINATED' || contract.status === 'COMPLETED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This contract is already closed.' });
      }
      return db.salesContract.update({ where: { id }, data: { status: 'TERMINATED' } });
    },

    /** Marks a contract fulfilled (every obligation met) — a manual call rather than an
     * automatic "all invoices paid" check, since a contract can be considered complete
     * (e.g. handover done) before the very last instalment clears. */
    async completeContract(id: string) {
      const contract = await db.salesContract.findUniqueOrThrow({ where: { id } });
      if (contract.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only an active contract can be marked completed.' });
      }
      return db.salesContract.update({ where: { id }, data: { status: 'COMPLETED' } });
    },

    /* ── Milestones ── */

    /** For the router's ownership check on milestone mutations — a milestone has no
     * agentId of its own, only its parent contract does. */
    async getMilestoneOwner(id: string) {
      const milestone = await db.contractMilestone.findUniqueOrThrow({
        where: { id },
        select: { contract: { select: { agentId: true } } },
      });
      return milestone.contract.agentId;
    },

    async completeMilestone(id: string) {
      return db.contractMilestone.update({
        where: { id },
        data: { status: 'DONE', completedAt: new Date() },
      });
    },

    async updateMilestone(id: string, dueDate: Date | null) {
      return db.contractMilestone.update({ where: { id }, data: { dueDate } });
    },

    /* ── Expiry sweep (cross-module entry point, called on an interval — see app.ts) ── */

    /** Flips overdue quotations/reservations to EXPIRED. A quotation's `validUntil`
     * and a reservation's `expiresAt` were both stored from day one but nothing ever
     * acted on them — this is that missing check. A reservation expiring releases its
     * held unit through the exact same `ReservationCancelled` event a manual cancel
     * already publishes, so Inventory doesn't need a new code path to react to it. */
    async expireStaleQuotationsAndReservations() {
      const now = new Date();

      const { count: quotationsExpired } = await db.quotation.updateMany({
        where: { status: { in: ['DRAFT', 'SENT'] }, validUntil: { lt: now } },
        data: { status: 'EXPIRED' },
      });

      const staleReservations = await db.reservation.findMany({
        where: { status: { in: [...ACTIVE_RESERVATION_STATUSES] }, expiresAt: { lt: now } },
        select: { id: true, unitId: true },
      });
      for (const r of staleReservations) {
        await db.reservation.update({ where: { id: r.id }, data: { status: 'EXPIRED' } });
        await bus.publish(SalesEvents.ReservationCancelled.type, {
          reservationId: r.id,
          unitId: r.unitId,
          reason: 'expired',
        });
      }

      return { quotationsExpired, reservationsExpired: staleReservations.length };
    },
  };
}

export type SalesService = ReturnType<typeof createSalesService>;
