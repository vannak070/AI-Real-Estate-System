import { z } from 'zod';
import { router, withCapability } from '../../trpc/trpc.js';
import type { ModuleContext } from '../../platform/module.js';

const byId = z.object({ id: z.string() });

export function messagingRouter({ modules }: ModuleContext) {
  const inbox = () => modules.messaging.inbox;
  return router({
    /** Bot connection state for the Marketing → Channels tab. */
    status: withCapability('marketing:read').query(() => modules.messaging.status()),

    /** Chat-app conversations. Reading follows CRM visibility (crm:read, scoped to the viewer's
     * own leads without crm:read:all); taking over and replying need crm:write. */
    inbox: router({
      list: withCapability('crm:read')
        .input(z.object({ filter: z.enum(['all', 'attention', 'agent']).optional() }).optional())
        .query(({ input, ctx }) => inbox().list(ctx.user, input?.filter)),
      summary: withCapability('crm:read').query(({ ctx }) => inbox().summary(ctx.user)),
      get: withCapability('crm:read')
        .input(byId)
        .query(({ input, ctx }) => inbox().get(ctx.user, input.id)),
      markRead: withCapability('crm:read')
        .input(byId)
        .mutation(({ input, ctx }) => inbox().markRead(ctx.user, input.id)),
      takeOver: withCapability('crm:write')
        .input(byId)
        .mutation(({ input, ctx }) => inbox().takeOver(ctx.user, input.id)),
      handBack: withCapability('crm:write')
        .input(byId)
        .mutation(({ input, ctx }) => inbox().handBack(ctx.user, input.id)),
      send: withCapability('crm:write')
        .input(z.object({ id: z.string(), text: z.string().trim().min(1).max(3500) }))
        .mutation(({ input, ctx }) => inbox().send(ctx.user, input.id, input.text)),
    }),
  });
}
