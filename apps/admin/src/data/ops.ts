import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApprovalStatus, DocRefType, DocType } from './types';

export const opsKeys = {
  approvals: (filter?: { status?: ApprovalStatus }) => ['ops', 'approvals', filter ?? {}] as const,
  documents: (filter?: { type?: DocType; refType?: DocRefType; refId?: string }) =>
    ['ops', 'documents', filter ?? {}] as const,
};

/* ── Approvals ── */

export function useApprovals(filter?: { status?: ApprovalStatus }) {
  return useQuery({
    queryKey: opsKeys.approvals(filter),
    queryFn: () => api.ops.approvals.list.query(filter),
  });
}

export function useDecideApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      api.ops.approvals.decide.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops', 'approvals'] }),
  });
}

/* ── Documents ── */

export function useDocuments(filter?: { type?: DocType; refType?: DocRefType; refId?: string }) {
  return useQuery({
    queryKey: opsKeys.documents(filter),
    queryFn: () => api.ops.documents.list.query(filter),
  });
}
