import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface KnowledgeFormInput {
  title: string;
  content: string;
  active: boolean;
}

const KEY = ['assistant', 'knowledge'] as const;

/** ERA's company knowledge for the AI assistant, plus how much of its size limit is used. */
export function useKnowledge() {
  return useQuery({ queryKey: KEY, queryFn: () => api.assistant.knowledge.list.query() });
}

export type KnowledgeEntry = NonNullable<ReturnType<typeof useKnowledge>['data']>['entries'][number];

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: KEY });
}

export function useCreateKnowledge() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: KnowledgeFormInput) => api.assistant.knowledge.create.mutate(input),
    onSuccess: invalidate,
  });
}

export function useUpdateKnowledge() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: Partial<KnowledgeFormInput> & { id: string }) => api.assistant.knowledge.update.mutate(input),
    onSuccess: invalidate,
  });
}

export function useDeleteKnowledge() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api.assistant.knowledge.delete.mutate({ id }),
    onSuccess: invalidate,
  });
}
