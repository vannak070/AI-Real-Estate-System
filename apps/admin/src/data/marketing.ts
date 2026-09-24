import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { titleCase } from '../lib/format';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
export const CAMPAIGN_STATUSES: CampaignStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED'];

export interface CampaignFormInput {
  name: string;
  /** A channel key (see useChannels). */
  channel: string;
  status: CampaignStatus;
  budget: number;
  spend: number;
  /** null clears the date on update */
  startDate: Date | null;
  endDate: Date | null;
}

const keys = {
  campaigns: ['marketing', 'campaigns'] as const,
  campaignStats: ['marketing', 'campaigns', 'stats'] as const,
  channels: ['marketing', 'channels'] as const,
  channelStats: ['marketing', 'channels', 'stats'] as const,
};

/** Default Source for a lead/contact an agent types in by hand. */
export const DEFAULT_MANUAL_SOURCE = 'WALK_IN';

export interface ChannelFormInput {
  name: string;
  description: string | null;
  active: boolean;
}

/** The editable channel list — the options for a lead/contact Source and a campaign's Channel.
 * Readable by any signed-in user. */
export function useChannels() {
  return useQuery({ queryKey: keys.channels, queryFn: () => api.marketing.channels.list.query() });
}

export type ChannelRow = NonNullable<ReturnType<typeof useChannels>['data']>[number];

/**
 * Picker options + a label lookup. Options are the active channels, plus `keep` (the record's
 * current value) if it's since been hidden, so editing an old record never silently changes it.
 * Labels fall back to a title-cased key for a value with no channel row.
 */
export function useChannelOptions(keep?: string | null) {
  const { data } = useChannels();
  const all = data ?? [];
  const byKey = new Map(all.map((c) => [c.key, c]));
  const options = all.filter((c) => c.active || c.key === keep);
  const label = (key: string | null | undefined) => (key ? (byKey.get(key)?.name ?? titleCase(key)) : '—');
  /** `preferred` if it's an active option, else the first option ('' until the list loads). */
  const pickDefault = (preferred: string) =>
    options.find((c) => c.key === preferred)?.key ?? options[0]?.key ?? '';
  return { options, label, pickDefault, isLoading: !data };
}

function useInvalidateChannels() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: keys.channels });
}

export function useCreateChannel() {
  const invalidate = useInvalidateChannels();
  return useMutation({
    mutationFn: (input: ChannelFormInput) => api.marketing.channels.create.mutate(input),
    onSuccess: invalidate,
  });
}

export function useUpdateChannel() {
  const invalidate = useInvalidateChannels();
  return useMutation({
    mutationFn: (input: Partial<ChannelFormInput> & { id: string; sortOrder?: number }) =>
      api.marketing.channels.update.mutate(input),
    onSuccess: invalidate,
  });
}

export function useDeleteChannel() {
  const invalidate = useInvalidateChannels();
  return useMutation({
    mutationFn: (id: string) => api.marketing.channels.delete.mutate({ id }),
    onSuccess: invalidate,
  });
}

export function useChannelStats() {
  return useQuery({ queryKey: keys.channelStats, queryFn: () => api.marketing.channels.stats.query() });
}

/** Chat-app bot connection state (Telegram today). Polls, so a bot that just connected shows up. */
export function useMessagingStatus() {
  return useQuery({
    queryKey: ['messaging', 'status'],
    queryFn: () => api.messaging.status.query(),
    refetchInterval: 30_000,
  });
}

/** `enabled: false` for users without marketing:read (e.g. agents) — skips a request that would be refused. */
export function useCampaigns(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.campaigns,
    queryFn: () => api.marketing.campaigns.list.query(),
    enabled: options.enabled ?? true,
  });
}

/** Leads/deals/revenue per campaign, computed server-side (so it works for roles without Sales access). */
export function useCampaignStats() {
  return useQuery({ queryKey: keys.campaignStats, queryFn: () => api.marketing.campaigns.stats.query() });
}

function useInvalidateCampaigns() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['marketing', 'campaigns'] });
}

export function useCreateCampaign() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({
    mutationFn: (input: CampaignFormInput) => api.marketing.campaigns.create.mutate(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCampaign() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({
    mutationFn: (input: Partial<CampaignFormInput> & { id: string }) => api.marketing.campaigns.update.mutate(input),
    onSuccess: invalidate,
  });
}

export function useDeleteCampaign() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({
    mutationFn: (id: string) => api.marketing.campaigns.delete.mutate({ id }),
    onSuccess: invalidate,
  });
}
