import { router, withCapability } from '../../trpc/trpc.js';
import type { ModuleContext } from '../../platform/module.js';

export function analyticsRouter({ db }: ModuleContext) {
  return router({
    dashboard: withCapability('reports:read').query(async () => {
      const rows = await db.dailyMetric.findMany();
      return Object.fromEntries(rows.map((r) => [r.metric, r.value]));
    }),
  });
}
