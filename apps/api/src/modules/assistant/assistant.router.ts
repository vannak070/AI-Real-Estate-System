import { z } from 'zod';
import { router, publicProcedure } from '../../trpc/trpc.js';
import type { AssistantService } from './assistant.service.js';

const messageInput = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

// Public — apps/client's ChatPage.tsx is unauthenticated, same as inventory.public.* and
// crm.public.submitLead. The service is what actually enforces length/rate limits; this
// router is just the zod input shape.
export function assistantRouter(service: AssistantService) {
  return router({
    public: router({
      chat: publicProcedure
        .input(
          z.object({
            messages: z.array(messageInput).min(1),
            propertyId: z.string().optional(),
            propertyName: z.string().optional(),
            /** Signed reference to the lead this conversation already created (see assistant.service.ts). */
            leadToken: z.string().max(200).optional(),
            /** From the visitor's ad link (`?utm_campaign=`), captured by apps/client. */
            campaignCode: z.string().max(80).optional(),
          }),
        )
        .mutation(({ input, ctx }) => service.chat(input, { ip: ctx.req.ip })),
    }),
  });
}
