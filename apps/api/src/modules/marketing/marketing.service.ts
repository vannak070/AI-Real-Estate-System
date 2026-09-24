import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import type { CampaignStatus } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';

const THIRTY_DAYS_MS = 30 * 86_400_000;
/** Contract statuses that count as a closed deal — same rule as the admin's analytics. */
const CLOSED_WON = new Set(['ACTIVE', 'COMPLETED']);

export interface CampaignInput {
  name: string;
  /** A Channel.key. */
  channel: string;
  status?: CampaignStatus;
  budget?: number;
  spend?: number;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface ChannelInput {
  name: string;
  description?: string | null;
  active?: boolean;
  sortOrder?: number;
}

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** "Google Ads" → "GOOGLE_ADS", "Khmer24" → "KHMER24". Empty for a name with no latin letters/digits. */
function makeChannelKey(name: string): string {
  return stripAccents(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

/** "Chinese New Year Promo" → "chinese-new-year-promo-7k2f": readable in an ad link, and the random
 * suffix keeps two campaigns with the same name apart. */
function makeCode(name: string): string {
  const slug =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'campaign';
  return `${slug}-${randomBytes(2).toString('hex')}`;
}

function assertDates(input: { startDate?: Date | null; endDate?: Date | null }) {
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'End date must be on or after the start date.' });
  }
}

/**
 * Leads/deals/revenue attributed to a campaign are NOT stored here (see marketing.prisma) — they're
 * computed from CRM leads (`Lead.campaignId`) and Sales contracts, read through those modules'
 * published APIs (`ctx.modules.crm` / `ctx.modules.sales`), never their tables. Done server-side so
 * every role sees the same numbers without needing Sales access of its own.
 */
export function createMarketingService({ db, modules }: ModuleContext) {
  async function assertActiveChannel(key: string) {
    if ((await db.channel.count({ where: { key, active: true } })) === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unknown or hidden channel — pick one from the list.' });
    }
  }

  return {
    listChannels() {
      return db.channel.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    },

    /** The key is derived from the name once and never changes (records store it); a clash with
     * an existing key gets a numeric suffix. */
    async createChannel(input: ChannelInput) {
      const base = makeChannelKey(input.name) || 'CHANNEL';
      const max = await db.channel.aggregate({ _max: { sortOrder: true }, where: { sortOrder: { lt: 900 } } });
      for (let n = 1; n < 50; n++) {
        const key = n === 1 ? base : `${base}_${n}`;
        if (await db.channel.findUnique({ where: { key } })) continue;
        return db.channel.create({
          data: {
            key,
            name: input.name,
            description: input.description ?? null,
            active: input.active ?? true,
            sortOrder: input.sortOrder ?? (max._max.sortOrder ?? 0) + 10,
          },
        });
      }
      throw new TRPCError({ code: 'CONFLICT', message: 'Too many channels with this name.' });
    },

    async updateChannel(id: string, input: Partial<ChannelInput>) {
      const current = await db.channel.findUniqueOrThrow({ where: { id } });
      if (current.isSystem && input.active === false) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `"${current.name}" is used by the website itself, so it can't be hidden.`,
        });
      }
      return db.channel.update({ where: { id }, data: input });
    },

    /** Only for a channel nothing points at yet (e.g. created by mistake) — otherwise hide it, so
     * old leads and campaigns keep a readable label. */
    async deleteChannel(id: string) {
      const channel = await db.channel.findUniqueOrThrow({ where: { id } });
      if (channel.isSystem) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `"${channel.name}" is a system channel and can't be deleted.` });
      }
      const [records, campaigns] = await Promise.all([
        modules.crm.countRecordsWithSource(channel.key),
        db.campaign.count({ where: { channel: channel.key } }),
      ]);
      if (records + campaigns > 0) {
        const parts = [
          records ? `${records} lead/contact record${records === 1 ? '' : 's'}` : null,
          campaigns ? `${campaigns} campaign${campaigns === 1 ? '' : 's'}` : null,
        ].filter(Boolean);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `"${channel.name}" is used by ${parts.join(' and ')}, so it can't be deleted — hide it instead.`,
        });
      }
      await db.channel.delete({ where: { id } });
      return { id };
    },

    async isActiveChannel(key: string): Promise<boolean> {
      return (await db.channel.count({ where: { key, active: true } })) > 0;
    },

    listCampaigns() {
      return db.campaign.findMany({ orderBy: { createdAt: 'desc' } });
    },

    async createCampaign(input: CampaignInput) {
      assertDates(input);
      await assertActiveChannel(input.channel);
      // A clash on the 4-hex suffix is astronomically rare; retry rather than fail if it happens.
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeCode(input.name);
        if (!(await db.campaign.findUnique({ where: { code } }))) {
          return db.campaign.create({ data: { ...input, code } });
        }
      }
      throw new TRPCError({ code: 'CONFLICT', message: 'Could not generate a unique link code — try again.' });
    },

    /** The link `code` is deliberately not editable: changing it would break every ad already
     * running with the old link. */
    async updateCampaign(id: string, input: Partial<CampaignInput>) {
      const current = await db.campaign.findUniqueOrThrow({ where: { id } });
      // Keeping a now-hidden channel is fine; switching to one must pick an active channel.
      if (input.channel !== undefined && input.channel !== current.channel) await assertActiveChannel(input.channel);
      assertDates({
        startDate: input.startDate !== undefined ? input.startDate : current.startDate,
        endDate: input.endDate !== undefined ? input.endDate : current.endDate,
      });
      return db.campaign.update({ where: { id }, data: input });
    },

    /** Refused once real leads point at it — deleting would silently erase that attribution
     * history. Set it to Ended instead. */
    async deleteCampaign(id: string) {
      const linked = await modules.crm.countLeadsForCampaign(id);
      if (linked > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `This campaign has ${linked} linked lead${linked === 1 ? '' : 's'}, so it can't be deleted — set its status to Ended instead.`,
        });
      }
      await db.campaign.delete({ where: { id } });
      return { id };
    },

    async findCampaignIdByCode(code: string): Promise<string | null> {
      const c = await db.campaign.findUnique({ where: { code: code.trim().toLowerCase() }, select: { id: true } });
      return c?.id ?? null;
    },

    async campaignExists(id: string): Promise<boolean> {
      return (await db.campaign.count({ where: { id } })) > 0;
    },

    /**
     * Per campaign: leads linked to it, and deals/revenue from closed contracts. Each contract is
     * credited to exactly one campaign — the contact's most recent campaign-linked lead created on
     * or before the contract — so a customer who came through two campaigns is never counted twice,
     * and contracts signed before they ever saw the campaign aren't credited to it.
     */
    async campaignStats() {
      const [campaigns, leads, contracts] = await Promise.all([
        db.campaign.findMany({ select: { id: true } }),
        modules.crm.listLeadsForAttribution(),
        modules.sales.listContractsForAttribution(),
      ]);
      const stats = new Map(campaigns.map((c) => [c.id, { leads: 0, deals: 0, revenue: 0 }]));

      const campaignLeadsByContact = new Map<string, { campaignId: string; createdAt: Date }[]>();
      for (const l of leads) {
        if (!l.campaignId || !stats.has(l.campaignId)) continue;
        stats.get(l.campaignId)!.leads += 1;
        const list = campaignLeadsByContact.get(l.contactId) ?? [];
        list.push({ campaignId: l.campaignId, createdAt: l.createdAt });
        campaignLeadsByContact.set(l.contactId, list);
      }

      for (const contract of contracts) {
        if (!CLOSED_WON.has(contract.status)) continue;
        const credited = (campaignLeadsByContact.get(contract.contactId) ?? [])
          .filter((l) => l.createdAt <= contract.createdAt)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        if (!credited) continue;
        const s = stats.get(credited.campaignId)!;
        s.deals += 1;
        s.revenue += contract.netPrice;
      }

      return campaigns.map((c) => ({ campaignId: c.id, ...stats.get(c.id)! }));
    },

    /** Leads per source over the last 30 days — the Channels tab. */
    async channelStats() {
      const cutoff = Date.now() - THIRTY_DAYS_MS;
      const leads = await modules.crm.listLeadsForAttribution();
      const counts = new Map<string, number>();
      for (const l of leads) {
        if (l.createdAt.getTime() < cutoff) continue;
        counts.set(l.source, (counts.get(l.source) ?? 0) + 1);
      }
      return Object.fromEntries(counts) as Record<string, number>;
    },
  };
}

export type MarketingService = ReturnType<typeof createMarketingService>;
