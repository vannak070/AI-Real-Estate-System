import { z } from 'zod';
import { router, withCapability } from '../../trpc/trpc.js';
import type { AssistantService } from './assistant.service.js';

const knowledgeInput = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(8000),
  active: z.boolean().optional(),
});

export function assistantRouter(service: AssistantService) {
  return router({
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
