import { z } from 'zod';
import { router, publicProcedure, withCapability } from '../../trpc/trpc.js';
import type { AssistantService } from './assistant.service.js';

const knowledgeInput = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(8000),
  active: z.boolean().optional(),
});

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

    /** Company knowledge for the AI (admin → AI Knowledge). Marketing owns the customer-facing
     * voice, so it's gated like campaigns: marketing:read to view, marketing:write to edit. */
    knowledge: router({
      list: withCapability('marketing:read').query(() => service.knowledge.list()),
      create: withCapability('marketing:write')
        .input(knowledgeInput)
        .mutation(({ input, ctx }) => service.knowledge.create(input, ctx.user.id)),
      update: withCapability('marketing:write')
        .input(knowledgeInput.partial().extend({ id: z.string() }))
        .mutation(({ input: { id, ...data }, ctx }) => service.knowledge.update(id, data, ctx.user.id)),
      delete: withCapability('marketing:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.knowledge.remove(input.id)),
    }),
  });
}
