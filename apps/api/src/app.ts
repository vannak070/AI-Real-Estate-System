import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import staticFiles from '@fastify/static';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { consoleLogger } from '@era/shared';
import { loadConfig } from './platform/config.js';
import { getPrisma } from './platform/db.js';
import { createEventBus } from './platform/event-bus/index.js';
import { createHttpServer } from './platform/http.js';
import { createCorsOriginChecker } from './platform/cors.js';
import { UPLOADS_ROOT } from './platform/uploads.js';
import type { ModuleApis, ModuleContext } from './platform/module.js';
import { modules } from './modules/registry.js';
import { createAppRouter } from './trpc/root.js';
import { createContextFactory } from './trpc/context.js';

export async function buildApp() {
  const config = loadConfig();
  const logger = consoleLogger({ svc: 'api', env: config.nodeEnv });
  const db = getPrisma();
  const bus = createEventBus(config, logger);
  await bus.start();

  const app = createHttpServer(logger, { trustProxy: config.trustProxy });
  const apis: Partial<ModuleApis> = {};

  // Lazy sibling-API resolution: a module may reference `ctx.modules.x` at call
  // time regardless of registration order.
  const ctx: ModuleContext = {
    config,
    logger,
    db,
    bus,
    modules: new Proxy({} as ModuleApis, {
      get: (_t, key) => {
        const api = apis[key as keyof ModuleApis];
        if (!api) throw new Error(`module "${String(key)}" is not registered`);
        return api;
      },
    }),
  };

  const starters: (() => Promise<void> | void)[] = [];
  const stoppers: (() => Promise<void> | void)[] = [];
  for (const mod of modules) {
    const { api, routes, start, stop } = await mod.register(ctx);
    apis[mod.name] = api as never;
    if (routes) await routes(app);
    if (start) starters.push(start);
    if (stop) stoppers.push(stop);
    logger.info('module.registered', { module: mod.name });
  }

  // Sales' expiry sweep (stale quotations/reservations) — first-ever scheduled
  // job in this codebase, so kept deliberately simple: an in-process interval,
  // no new dependency. Runs once at boot too, so a long-idle dev server
  // doesn't wait 15 minutes to catch up.
  const EXPIRY_SWEEP_INTERVAL_MS = 15 * 60 * 1000;
  const runExpirySweep = () => {
    void ctx.modules.sales.expireStale().then(
      (result) => logger.info('sales.expiry_sweep', result),
      (err: unknown) => logger.error('sales.expiry_sweep_failed', { error: err instanceof Error ? err.message : String(err) }),
    );
  };
  runExpirySweep();
  const expirySweepTimer = setInterval(runExpirySweep, EXPIRY_SWEEP_INTERVAL_MS);

  await app.register(cors, { origin: createCorsOriginChecker(config), credentials: true });
  await app.register(cookie);
  // <img> loads aren't subject to CORS, so no origin config needed here —
  // uploaded photos just need to be reachable by URL from either SPA.
  await app.register(staticFiles, { root: UPLOADS_ROOT, prefix: '/uploads/' });

  await app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: createAppRouter(ctx),
      createContext: createContextFactory(ctx),
      onError({ path, error }: { path?: string; error: Error }) {
        logger.error('trpc.error', { path, error: error.message });
      },
    },
  });

  for (const start of starters) await start();

  return {
    app,
    config,
    logger,
    bus,
    async shutdown() {
      clearInterval(expirySweepTimer);
      for (const stop of stoppers) await stop();
      await app.close();
      await bus.stop();
      await db.$disconnect();
    },
  };
}
