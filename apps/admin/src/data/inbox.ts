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

/** Chats waiting on a person, and chats with unread messages — the nav badge and header bell. */
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

/* ── The signed-in staff member's Telegram alerts ── */

const ALERTS = ['messaging', 'alerts'] as const;

/** `waiting`: a link was just opened — poll until the bot reports the chat linked. */
export function useMyAlerts(waiting: boolean) {
  return useQuery({
    queryKey: [...ALERTS, 'me'],
    queryFn: () => api.messaging.alerts.me.query(),
    refetchInterval: waiting ? 3_000 : false,
  });
}

function useAlertsMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS }) });
}

/** Alert buttons link back to this back office, at the address it's open on now. */
export const useLinkAlerts = () =>
  useAlertsMutation(() => api.messaging.alerts.link.mutate({ adminUrl: window.location.origin }));
export const useUnlinkAlerts = () => useAlertsMutation(() => api.messaging.alerts.unlink.mutate());
export const useTestAlert = () => useMutation({ mutationFn: () => api.messaging.alerts.test.mutate() });
