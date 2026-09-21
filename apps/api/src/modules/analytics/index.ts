import { CrmEvents, InventoryEvents, SalesEvents } from '@era/contracts';
import type { AppModule, ModuleContext } from '../../platform/module.js';

/** Nothing exposed to siblings — the dashboard query lives in analytics.router.ts (tRPC). */
export type AnalyticsApi = Record<string, never>;

/**
 * Pure event consumer. Analytics reads the whole system's event stream into its
 * own denormalized tables and never calls another module. This is the module to
 * extract first if reporting load grows.
 */
export const analyticsModule: AppModule<AnalyticsApi> = {
  name: 'analytics',
  register({ db, bus, logger }: ModuleContext) {
    const today = () => {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      return d;
    };

    const bump = async (metric: string, delta: number): Promise<void> => {
      await db.dailyMetric.upsert({
        where: { day_metric: { day: today(), metric } },
        create: { day: today(), metric, value: delta },
        update: { value: { increment: delta } },
      });
    };

    bus.subscribe(CrmEvents.LeadCreated.type, () => bump('leads_created', 1));
    bus.subscribe(InventoryEvents.UnitReserved.type, () => bump('units_reserved', 1));
    bus.subscribe(SalesEvents.ContractSigned.type, async (env) => {
      const { salePrice } = env.payload as { salePrice: number };
      logger.info('analytics.sale', { salePrice });
      await Promise.all([bump('contracts_signed', 1), bump('gross_sales', salePrice)]);
    });

    return { api: {} };
  },
};
