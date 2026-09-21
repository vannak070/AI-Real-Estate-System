import { TRPCError } from '@trpc/server';
import { FinanceEvents } from '@era/contracts';
import type { CommissionStatus, InvoiceStatus, PaymentMethod } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';

const DAY_MS = 86_400_000;
const OPEN_INVOICE_STATUSES: InvoiceStatus[] = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];
const DEFAULT_COMMISSION_RATE_PCT = 2.5;

export function createFinanceService({ db, bus, logger, modules }: ModuleContext) {
  return {
    /* ── Invoices ── */

    listInvoices(filter?: { status?: InvoiceStatus; outstandingOnly?: boolean; contractId?: string }) {
      return db.invoice.findMany({
        where: {
          contractId: filter?.contractId,
          ...(filter?.outstandingOnly
            ? { status: { in: OPEN_INVOICE_STATUSES } }
            : filter?.status
              ? { status: filter.status }
              : {}),
        },
        orderBy: { dueDate: 'asc' },
      });
    },

    async issueInvoice(id: string) {
      const invoice = await db.invoice.findUniqueOrThrow({ where: { id } });
      if (invoice.status !== 'DRAFT') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'invoice_not_draft' });
      }
      const updated = await db.invoice.update({
        where: { id },
        data: { status: 'ISSUED', issuedAt: new Date() },
      });
      await bus.publish(FinanceEvents.InvoiceIssued.type, {
        invoiceId: updated.id,
        contractId: updated.contractId,
        contactId: updated.contactId,
        total: updated.total,
      });
      return updated;
    },

    /* ── Payments & receipts ── */

    listPayments(filter?: { contractId?: string }) {
      return db.payment.findMany({
        where: { contractId: filter?.contractId },
        include: { invoice: { select: { number: true } } },
        orderBy: { receivedAt: 'desc' },
      });
    },

    listReceipts(filter?: { contractId?: string }) {
      return db.receipt.findMany({
        where: filter?.contractId ? { payment: { contractId: filter.contractId } } : {},
        include: { payment: { select: { number: true } } },
        orderBy: { issuedAt: 'desc' },
      });
    },

    async recordPayment(input: {
      invoiceId: string;
      method: PaymentMethod;
      amount: number;
      reference?: string;
      recordedBy: string;
    }) {
      const invoice = await db.invoice.findUniqueOrThrow({ where: { id: input.invoiceId } });
      if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'invoice_not_payable' });
      }

      const paymentNumber = await modules.settings.nextNumber('PAY');
      const receiptNumber = await modules.settings.nextNumber('RCP');
      const paidTotal = invoice.amountPaid + input.amount;
      const newStatus: InvoiceStatus = paidTotal >= invoice.total ? 'PAID' : 'PARTIALLY_PAID';

      const { payment, receipt } = await db.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            number: paymentNumber,
            contractId: invoice.contractId,
            contactId: invoice.contactId,
            invoiceId: invoice.id,
            method: input.method,
            amount: input.amount,
            reference: input.reference,
            recordedBy: input.recordedBy,
          },
        });
        const receipt = await tx.receipt.create({
          data: {
            number: receiptNumber,
            paymentId: payment.id,
            contactId: invoice.contactId,
            amount: input.amount,
          },
        });
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { amountPaid: paidTotal, status: newStatus },
        });
        return { payment, receipt };
      });

      await bus.publish(FinanceEvents.PaymentRecorded.type, {
        paymentId: payment.id,
        invoiceId: invoice.id,
        contractId: invoice.contractId,
        amount: input.amount,
      });
      if (newStatus === 'PAID') {
        await bus.publish(FinanceEvents.InvoicePaid.type, {
          invoiceId: invoice.id,
          contractId: invoice.contractId,
        });
      }
      return { payment, receipt };
    },

    /* ── Commissions ── */

    async listCommissions(filter?: { status?: CommissionStatus; contractId?: string }) {
      const rows = await db.commission.findMany({
        where: { status: filter?.status, contractId: filter?.contractId },
      });
      const contracts = await modules.sales.getContractsByIds(rows.map((r) => r.contractId));
      return rows.map((r) => ({
        ...r,
        contractNumber: contracts[r.contractId]?.number ?? r.contractId,
      }));
    },

    async approveCommission(id: string, approvedBy: string) {
      const commission = await db.commission.findUniqueOrThrow({ where: { id } });
      if (commission.status !== 'ACCRUED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'commission_not_accrued' });
      }
      const updated = await db.commission.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy },
      });
      await bus.publish(FinanceEvents.CommissionApproved.type, { commissionId: id, approvedBy });
      return updated;
    },

    async markCommissionPaid(id: string) {
      const commission = await db.commission.findUniqueOrThrow({ where: { id } });
      if (commission.status !== 'APPROVED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'commission_not_approved' });
      }
      return db.commission.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } });
    },

    /** Billed/paid/outstanding/overdue per contract — a read-model join the admin UI
     * uses to decorate Sales' contracts list without any cross-module DB coupling. */
    async contractBalances(contractIds: string[]) {
      const balances: Record<string, { billed: number; paid: number; outstanding: number; overdue: number }> =
        Object.fromEntries(contractIds.map((id) => [id, { billed: 0, paid: 0, outstanding: 0, overdue: 0 }]));
      if (contractIds.length === 0) return balances;

      const invoices = await db.invoice.findMany({ where: { contractId: { in: contractIds } } });
      for (const invoice of invoices) {
        const balance = (balances[invoice.contractId] ??= { billed: 0, paid: 0, outstanding: 0, overdue: 0 });
        balance.billed += invoice.total;
        balance.paid += invoice.amountPaid;
        if (invoice.status === 'OVERDUE') balance.overdue += invoice.total - invoice.amountPaid;
      }
      for (const balance of Object.values(balances)) balance.outstanding = balance.billed - balance.paid;
      return balances;
    },

    /* ── Reporting ── */

    async arAging() {
      const invoices = await db.invoice.findMany({ where: { status: { in: OPEN_INVOICE_STATUSES } } });
      const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
      const now = Date.now();
      for (const i of invoices) {
        const outstanding = i.total - i.amountPaid;
        if (outstanding <= 0) continue;
        const overdueDays = Math.round((now - i.dueDate.getTime()) / DAY_MS);
        if (overdueDays <= 0) buckets.current += outstanding;
        else if (overdueDays <= 30) buckets.d30 += outstanding;
        else if (overdueDays <= 60) buckets.d60 += outstanding;
        else if (overdueDays <= 90) buckets.d90 += outstanding;
        else buckets.d90plus += outstanding;
      }
      return buckets;
    },

    async stats() {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const [payments, receiptsCount] = await Promise.all([
        db.payment.findMany({ select: { amount: true, receivedAt: true } }),
        db.receipt.count(),
      ]);
      return {
        totalCollected: payments.reduce((a, p) => a + p.amount, 0),
        collectedThisMonth: payments
          .filter((p) => p.receivedAt >= monthStart)
          .reduce((a, p) => a + p.amount, 0),
        receiptsCount,
      };
    },

    /* ── Saga reaction: a signed contract needs its invoice schedule + accrued commission ── */

    async onContractSigned(contractId: string) {
      // Commission.contractId is unique, so its presence is our idempotency guard
      // for this whole handler (invoices + commission are created together below).
      const existing = await db.commission.findUnique({ where: { contractId } });
      if (existing) return;

      const contract = await modules.sales.getContract(contractId);
      if (!contract) {
        logger.error('finance.contract_signed_unresolvable', { contractId });
        return;
      }

      const now = Date.now();
      for (const [index, installment] of contract.installments.entries()) {
        const number = await modules.settings.nextNumber('INV');
        const amount = Math.round((contract.netPrice * installment.percent) / 100);
        const dueDate = installment.milestone
          ? new Date(now + 200 * DAY_MS)
          : new Date(now + (installment.dueOffsetDays ?? 0) * DAY_MS);
        const issueNow = index === 0;
        const invoice = await db.invoice.create({
          data: {
            number,
            contractId,
            contactId: contract.contactId,
            label: installment.label,
            dueDate,
            amount,
            taxAmount: 0,
            total: amount,
            status: issueNow ? 'ISSUED' : 'DRAFT',
            issuedAt: issueNow ? new Date() : null,
          },
        });
        if (issueNow) {
          await bus.publish(FinanceEvents.InvoiceIssued.type, {
            invoiceId: invoice.id,
            contractId,
            contactId: contract.contactId,
            total: invoice.total,
          });
        }
      }

      const commissionAmount = Math.round((contract.netPrice * DEFAULT_COMMISSION_RATE_PCT) / 100);
      const commission = await db.commission.create({
        data: {
          contractId,
          agentId: contract.agentId,
          basis: contract.netPrice,
          ratePct: DEFAULT_COMMISSION_RATE_PCT,
          amount: commissionAmount,
          status: 'ACCRUED',
        },
      });
      await bus.publish(FinanceEvents.CommissionAccrued.type, {
        commissionId: commission.id,
        contractId,
        agentId: contract.agentId,
        amount: commissionAmount,
      });
      logger.info('finance.contract_signed_processed', { contractId, commissionId: commission.id });
    },
  };
}

export type FinanceService = ReturnType<typeof createFinanceService>;
