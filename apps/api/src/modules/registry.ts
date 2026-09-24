import type { AppModule } from '../platform/module.js';
import { identityModule } from './identity/index.js';
import { crmModule } from './crm/index.js';
import { inventoryModule } from './inventory/index.js';
import { salesModule } from './sales/index.js';
import { financeModule } from './finance/index.js';
import { opsModule } from './ops/index.js';
import { marketingModule } from './marketing/index.js';
import { settingsModule } from './settings/index.js';
import { analyticsModule } from './analytics/index.js';
import { assistantModule } from './assistant/index.js';

/**
 * The modules this process runs. Order is not a dependency order — every
 * cross-module interaction goes through events or `ctx.modules.*`, both of which
 * are resolved lazily. To extract a module into its own service, delete its line
 * here and point the others at its network client.
 */
export const modules: AppModule[] = [
  identityModule,
  crmModule,
  inventoryModule,
  salesModule,
  financeModule,
  opsModule,
  marketingModule,
  settingsModule,
  analyticsModule,
  assistantModule,
];
