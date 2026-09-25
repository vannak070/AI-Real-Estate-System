import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type InboxFilter = 'all' | 'attention' | 'agent';

const ROOT = ['messaging', 'inbox'] as const;

/** Chat-app conversations, newest activity first. Polls so new customer messages show up. */
export function useInbox(filter: InboxFilter) {
  return useQuery({
    queryKey: [...ROOT, 'list', filter],
    queryFn: () => api.messaging.inbox.list.query({ filter }),
    refetchInterval: 5_000,
  });
}

export type InboxRow = NonNullable<ReturnType<typeof useInbox>['data']>[number];

/** Conversations waiting on a person — the nav badge. */
export function useInboxSummary(enabled: boolean) {
  return useQuery({
    queryKey: [...ROOT, 'summary'],
    queryFn: () => api.messaging.inbox.summary.query(),
    refetchInterval: 15_000,
    enabled,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: [...ROOT, 'conversation', id],
    queryFn: () => api.messaging.inbox.get.query({ id: id! }),
    enabled: !!id,
    refetchInterval: 3_000,
  });
}

export type ConversationThread = NonNullable<ReturnType<typeof useConversation>['data']>;

function useInboxMutation<TInput>(fn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOT }) });
}

export const useMarkRead = () => useInboxMutation((id: string) => api.messaging.inbox.markRead.mutate({ id }));
export const useTakeOver = () => useInboxMutation((id: string) => api.messaging.inbox.takeOver.mutate({ id }));
export const useHandBack = () => useInboxMutation((id: string) => api.messaging.inbox.handBack.mutate({ id }));
export const useSendReply = () =>
  useInboxMutation((input: { id: string; text: string }) => api.messaging.inbox.send.mutate(input));
