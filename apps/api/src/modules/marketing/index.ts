import type { AppModule, ModuleContext } from '../../platform/module.js';

/**
 * Channel/Campaign reads live in marketing.service.ts/marketing.router.ts,
 * composed in src/trpc/root.ts — not registered here. Nothing exposed to
 * siblings and no event subscriptions: both are read-only reference data,
 * no admin screen creates/edits a channel or campaign.
 */
export type MarketingApi = Record<string, never>;

export const marketingModule: AppModule<MarketingApi> = {
  name: 'marketing',
  register(_ctx: ModuleContext) {
    return { api: {} };
  },
};
