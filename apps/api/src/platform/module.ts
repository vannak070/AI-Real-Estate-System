import type { FastifyInstance } from 'fastify';
import type { Logger } from '@era/shared';
import type { Db } from './db.js';
import type { EventBus } from './event-bus/index.js';
import type { Config } from './config.js';

/** Everything a module may reach for. A module never imports another module directly. */
export interface ModuleContext {
  config: Config;
  logger: Logger;
  db: Db;
  bus: EventBus;
  /** Typed public APIs of sibling modules — resolved lazily, after all register. */
  modules: ModuleApis;
}

export interface ModuleRegistration<TApi> {
  /** What siblings may call. Keep it a deliberate projection, not your DB rows. */
  api: TApi;
  /** Optional HTTP surface for this module. */
  routes?: (app: FastifyInstance) => Promise<void> | void;
}

export interface AppModule<TApi = unknown> {
  readonly name: keyof ModuleApis;
  register(ctx: ModuleContext): Promise<ModuleRegistration<TApi>> | ModuleRegistration<TApi>;
}

/**
 * The ONE place sibling APIs are named. `ctx.modules.<name>` is the only
 * sanctioned coupling between modules and the seam you cut when extracting a
 * service — swap the in-process object for an HTTP/gRPC client with the same
 * shape and nothing else changes.
 */
export interface ModuleApis {
  identity: import('../modules/identity/index.js').IdentityApi;
  crm: import('../modules/crm/index.js').CrmApi;
  inventory: import('../modules/inventory/index.js').InventoryApi;
  sales: import('../modules/sales/index.js').SalesApi;
  finance: import('../modules/finance/index.js').FinanceApi;
  ops: import('../modules/ops/index.js').OpsApi;
  marketing: import('../modules/marketing/index.js').MarketingApi;
  settings: import('../modules/settings/index.js').SettingsApi;
  analytics: import('../modules/analytics/index.js').AnalyticsApi;
}
