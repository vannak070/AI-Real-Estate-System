import type { AppModule, ModuleContext } from '../../platform/module.js';
import { createSalesService } from './sales.service.js';
import { registerSalesSubscriptions } from './sales.events.js';

/** One entry of `PaymentPlanTemplate.installments` (untyped Json in Prisma). */
export interface PaymentPlanInstallmentView {
  label: string;
  percent: number;
  dueOffsetDays?: number;
  milestone?: string;
}

export interface SalesContractView {
  id: string;
  contactId: string;
  agentId: string;
  netPrice: number;
  installments: PaymentPlanInstallmentView[];
}

/** Read-only projection Finance uses to build an invoice schedule + commission off a signed contract. */
export interface SalesApi {
  getContract(id: string): Promise<SalesContractView | null>;
  getContractsByIds(ids: string[]): Promise<Record<string, { number: string }>>;
  /** Called on an interval by app.ts — flips overdue quotations/reservations to EXPIRED. */
  expireStale(): Promise<{ quotationsExpired: number; reservationsExpired: number }>;
}

// HTTP surface for this module is the tRPC router (sales.router.ts), composed
// in src/trpc/root.ts — not registered here. See ARCHITECTURE.md.
export const salesModule: AppModule<SalesApi> = {
  name: 'sales',
  register(ctx: ModuleContext) {
    const service = createSalesService(ctx);
    registerSalesSubscriptions(ctx.bus, service);

    const api: SalesApi = {
      async getContract(id) {
        const c = await service.getContractWithPlan(id);
        if (!c) return null;
        return {
          id: c.id,
          contactId: c.contactId,
          agentId: c.agentId,
          netPrice: c.netPrice,
          installments: (c.paymentPlan.installments as PaymentPlanInstallmentView[] | null) ?? [],
        };
      },
      async getContractsByIds(ids) {
        if (ids.length === 0) return {};
        const rows = await service.getContractNumbers(ids);
        return Object.fromEntries(rows.map((r) => [r.id, { number: r.number }]));
      },
      expireStale: () => service.expireStaleQuotationsAndReservations(),
    };
    return { api };
  },
};
