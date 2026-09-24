import { router } from './trpc.js';
import type { ModuleContext } from '../platform/module.js';
import { authRouter } from '../modules/identity/auth.router.js';
import { createIdentityService } from '../modules/identity/identity.service.js';
import { identityRouter } from '../modules/identity/identity.router.js';
import { createCrmService } from '../modules/crm/crm.service.js';
import { crmRouter } from '../modules/crm/crm.router.js';
import { createInventoryService } from '../modules/inventory/inventory.service.js';
import { inventoryRouter } from '../modules/inventory/inventory.router.js';
import { createSalesService } from '../modules/sales/sales.service.js';
import { salesRouter } from '../modules/sales/sales.router.js';
import { createFinanceService } from '../modules/finance/finance.service.js';
import { financeRouter } from '../modules/finance/finance.router.js';
import { createOpsService } from '../modules/ops/ops.service.js';
import { opsRouter } from '../modules/ops/ops.router.js';
import { createMarketingService } from '../modules/marketing/marketing.service.js';
import { marketingRouter } from '../modules/marketing/marketing.router.js';
import { createSettingsService } from '../modules/settings/settings.service.js';
import { settingsRouter } from '../modules/settings/settings.router.js';
import { analyticsRouter } from '../modules/analytics/analytics.router.js';
import { createAssistantService } from '../modules/assistant/assistant.service.js';
import { assistantRouter } from '../modules/assistant/assistant.router.js';

/**
 * The static, statically-typed router tree — this is what makes `AppRouter`
 * (and therefore `@era/api-client`) fully typed with no code generation step.
 * Each module's tRPC router wraps the SAME service factory the module itself
 * uses internally; only the routers are assembled here, in one place, so the
 * merged object literal keeps full type inference.
 */
export function createAppRouter(moduleCtx: ModuleContext) {
  const identityService = createIdentityService(moduleCtx);
  const crmService = createCrmService(moduleCtx);
  const inventoryService = createInventoryService(moduleCtx);
  const salesService = createSalesService(moduleCtx);
  const financeService = createFinanceService(moduleCtx);
  const opsService = createOpsService(moduleCtx);
  const marketingService = createMarketingService(moduleCtx);
  const settingsService = createSettingsService(moduleCtx);
  const assistantService = createAssistantService(moduleCtx);

  return router({
    auth: authRouter,
    identity: identityRouter(identityService),
    crm: crmRouter(crmService),
    inventory: inventoryRouter(inventoryService),
    sales: salesRouter(salesService),
    finance: financeRouter(financeService),
    ops: opsRouter(opsService),
    marketing: marketingRouter(marketingService),
    settings: settingsRouter(settingsService),
    analytics: analyticsRouter(moduleCtx),
    assistant: assistantRouter(assistantService),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
