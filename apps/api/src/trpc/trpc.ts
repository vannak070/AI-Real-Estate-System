import { initTRPC, TRPCError } from '@trpc/server';
import { can, type Capability } from '@era/contracts';
import type { Context } from './context.js';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Requires a signed-in user; narrows `ctx.user` to non-null for the rest of the chain. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Requires a signed-in user who holds `cap` — the server-side twin of admin's `useCan`. */
export function withCapability(cap: Capability) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!can(ctx.user.capabilities, cap)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `missing capability: ${cap}` });
    }
    return next();
  });
}
