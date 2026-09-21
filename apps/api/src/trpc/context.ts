// side-effect import: pulls in @fastify/cookie's declaration merging onto
// FastifyRequest/FastifyReply (.cookies/.setCookie/.clearCookie) for every
// consumer of this file's types — including @era/api-client, which only ever
// type-imports from apps/api and would otherwise never see it.
import '@fastify/cookie';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import type { ModuleContext } from '../platform/module.js';
import { getSessionUser, type AuthUser, SESSION_COOKIE } from '../modules/identity/auth.service.js';

export interface Context extends ModuleContext {
  req: CreateFastifyContextOptions['req'];
  res: CreateFastifyContextOptions['res'];
  user: AuthUser | null;
}

/** One per request: resolves the session cookie into a user, if any. */
export function createContextFactory(moduleCtx: ModuleContext) {
  return async ({ req, res }: CreateFastifyContextOptions): Promise<Context> => {
    const token = req.cookies?.[SESSION_COOKIE];
    const user = token ? await getSessionUser(moduleCtx.db, token) : null;
    return { ...moduleCtx, req, res, user };
  };
}
