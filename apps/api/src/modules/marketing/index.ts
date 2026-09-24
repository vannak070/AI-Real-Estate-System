import type { AppModule, ModuleContext } from '../../platform/module.js';
import { createMarketingService } from './marketing.service.js';

/** What sibling modules may ask Marketing. CRM uses these to validate a lead's source and link it to a campaign — from an ad
 * link's `?utm_campaign=` code (website enquiry / AI chat) or an admin's pick on the lead form. */
export interface MarketingApi {
  /** null for an unknown code — callers treat that as "no campaign", never an error. */
  findCampaignIdByCode(code: string): Promise<string | null>;
  campaignExists(id: string): Promise<boolean>;
  /** Lead/contact sources are channel keys — CRM checks an admin-picked one is an active channel. */
  isActiveChannel(key: string): Promise<boolean>;
}

// HTTP surface for this module is the tRPC router (marketing.router.ts), composed
// in src/trpc/root.ts — not registered here. See ARCHITECTURE.md.
export const marketingModule: AppModule<MarketingApi> = {
  name: 'marketing',
  register(ctx: ModuleContext) {
    const service = createMarketingService(ctx);
    const api: MarketingApi = {
      findCampaignIdByCode: (code) => service.findCampaignIdByCode(code),
      campaignExists: (id) => service.campaignExists(id),
      isActiveChannel: (key) => service.isActiveChannel(key),
    };
    return { api };
  },
};
