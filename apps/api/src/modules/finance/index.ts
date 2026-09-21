import type { AppModule, ModuleContext } from '../../platform/module.js';
import { createFinanceService } from './finance.service.js';
import { registerFinanceSubscriptions } from './finance.events.js';

/** Nothing exposed to siblings yet — Finance is reached via tRPC + events only. */
export type FinanceApi = Record<string, never>;

// HTTP surface for this module is the tRPC router (finance.router.ts), composed
// in src/trpc/root.ts — not registered here. See ARCHITECTURE.md.
export const financeModule: AppModule<FinanceApi> = {
  name: 'finance',
  register(ctx: ModuleContext) {
    const service = createFinanceService(ctx);
    registerFinanceSubscriptions(ctx.bus, service);
    return { api: {} };
  },
};
