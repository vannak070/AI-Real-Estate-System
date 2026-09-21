import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useChannels() {
  return useQuery({ queryKey: ['marketing', 'channels'], queryFn: () => api.marketing.channels.list.query() });
}

export function useCampaigns() {
  return useQuery({ queryKey: ['marketing', 'campaigns'], queryFn: () => api.marketing.campaigns.list.query() });
}
