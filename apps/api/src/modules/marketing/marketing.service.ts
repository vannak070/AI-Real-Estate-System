import type { ModuleContext } from '../../platform/module.js';

/**
 * Leads/deals/revenue attributed to a channel or campaign are NOT stored
 * here (see marketing.prisma) — the admin composes them client-side from
 * `crm.leads.list` (Lead.campaignId/source) and `sales.contracts.list`
 * (Contract.contactId), the same "admin joins two clean API calls" pattern
 * ContractsPage/CommissionsPage/ApprovalsPage already use. No new
 * cross-module coupling needed for this module.
 */
export function createMarketingService({ db }: ModuleContext) {
  return {
    listChannels() {
      return db.channel.findMany({ orderBy: { name: 'asc' } });
    },

    listCampaigns() {
      return db.campaign.findMany({ orderBy: { createdAt: 'desc' } });
    },
  };
}

export type MarketingService = ReturnType<typeof createMarketingService>;
