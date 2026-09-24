import { z } from 'zod';
import { CampaignStatus } from '@prisma/client';
import { protectedProcedure, router, withCapability } from '../../trpc/trpc.js';
import type { MarketingService } from './marketing.service.js';

const campaignInput = z.object({
  name: z.string().trim().min(1).max(120),
  channel: z.string().trim().min(1).max(40),
  status: z.nativeEnum(CampaignStatus).optional(),
  budget: z.number().int().nonnegative().optional(),
  spend: z.number().int().nonnegative().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
});

const channelInput = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

export function marketingRouter(service: MarketingService) {
  return router({
    channels: router({
      // Any signed-in user: the channel list is the option set for a lead/contact's Source, which
      // agents without marketing:read still pick from.
      list: protectedProcedure.query(() => service.listChannels()),
      /** { [source]: leads in the last 30 days } */
      stats: withCapability('marketing:read').query(() => service.channelStats()),

      create: withCapability('marketing:write')
        .input(channelInput)
        .mutation(({ input }) => service.createChannel(input)),

      update: withCapability('marketing:write')
        .input(channelInput.partial().extend({ id: z.string() }))
        .mutation(({ input: { id, ...data } }) => service.updateChannel(id, data)),

      delete: withCapability('marketing:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.deleteChannel(input.id)),
    }),
    campaigns: router({
      list: withCapability('marketing:read').query(() => service.listCampaigns()),
      stats: withCapability('marketing:read').query(() => service.campaignStats()),

      create: withCapability('marketing:write')
        .input(campaignInput)
        .mutation(({ input }) => service.createCampaign(input)),

      update: withCapability('marketing:write')
        .input(campaignInput.partial().extend({ id: z.string() }))
        .mutation(({ input: { id, ...data } }) => service.updateCampaign(id, data)),

      delete: withCapability('marketing:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.deleteCampaign(input.id)),
    }),
  });
}
