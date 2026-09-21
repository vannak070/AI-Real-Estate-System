import { router, withCapability } from '../../trpc/trpc.js';
import type { MarketingService } from './marketing.service.js';

export function marketingRouter(service: MarketingService) {
  return router({
    channels: router({
      list: withCapability('marketing:read').query(() => service.listChannels()),
    }),
    campaigns: router({
      list: withCapability('marketing:read').query(() => service.listCampaigns()),
    }),
  });
}
