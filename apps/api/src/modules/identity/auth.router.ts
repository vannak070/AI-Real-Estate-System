import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Capability } from '@era/contracts';
import { publicProcedure, protectedProcedure, router } from '../../trpc/trpc.js';
import { verifyPassword, createSession, destroySession, SESSION_COOKIE } from './auth.service.js';

const BAD_CREDENTIALS = 'Invalid email or password';

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { email: input.email }, include: { role: true } });
      if (!user || !user.active) throw new TRPCError({ code: 'UNAUTHORIZED', message: BAD_CREDENTIALS });

      const ok = await verifyPassword(input.password, user.passwordHash);
      if (!ok) throw new TRPCError({ code: 'UNAUTHORIZED', message: BAD_CREDENTIALS });

      const { token, expiresAt } = await createSession(ctx.db, user.id);
      ctx.res.setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        expires: expiresAt,
      });
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: { id: user.role.id, key: user.role.key, name: user.role.name },
        capabilities: user.role.capabilities as Capability[],
      };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const token = ctx.req.cookies?.[SESSION_COOKIE];
    if (token) await destroySession(ctx.db, token);
    ctx.res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }),
});
