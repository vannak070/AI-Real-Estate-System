import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { CommissionStatus, InvoiceStatus, PaymentMethod } from './types';

export const financeKeys = {
  invoices: (filter?: { status?: InvoiceStatus; outstandingOnly?: boolean; contractId?: string }) =>
    ['finance', 'invoices', filter ?? {}] as const,
  payments: (filter?: { contractId?: string }) => ['finance', 'payments', filter ?? {}] as const,
  receipts: (filter?: { contractId?: string }) => ['finance', 'receipts', filter ?? {}] as const,
  commissions: (filter?: { status?: CommissionStatus }) => ['finance', 'commissions', filter ?? {}] as const,
  arAging: () => ['finance', 'arAging'] as const,
  stats: () => ['finance', 'stats'] as const,
};

/* ── Invoices ── */

export function useInvoices(filter?: { status?: InvoiceStatus; outstandingOnly?: boolean; contractId?: string }) {
  return useQuery({
    queryKey: financeKeys.invoices(filter),
    queryFn: () => api.finance.invoices.list.query(filter),
  });
}

export function useIssueInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.finance.invoices.issue.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance'] }),
  });
}

/* ── Payments & receipts ── */

export function usePayments(filter?: { contractId?: string }) {
  return useQuery({
    queryKey: financeKeys.payments(filter),
    queryFn: () => api.finance.payments.list.query(filter),
  });
}

export function useReceipts(filter?: { contractId?: string }) {
  return useQuery({
    queryKey: financeKeys.receipts(filter),
    queryFn: () => api.finance.receipts.list.query(filter),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { invoiceId: string; method: PaymentMethod; amount: number; reference?: string }) =>
      api.finance.payments.record.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance'] }),
  });
}

/* ── Commissions ── */

export function useCommissions(filter?: { status?: CommissionStatus; contractId?: string }) {
  return useQuery({
    queryKey: financeKeys.commissions(filter),
    queryFn: () => api.finance.commissions.list.query(filter),
  });
}

export function useApproveCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.finance.commissions.approve.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.commissions() }),
  });
}

export function useMarkCommissionPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.finance.commissions.markPaid.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.commissions() }),
  });
}

/* ── Reporting ── */

export function useArAging() {
  return useQuery({ queryKey: financeKeys.arAging(), queryFn: () => api.finance.arAging.query() });
}

export function useFinanceStats() {
  return useQuery({ queryKey: financeKeys.stats(), queryFn: () => api.finance.stats.query() });
}

/** Billed/paid/outstanding/overdue per contract — used to decorate Sales' contracts list. */
export function useContractBalances(contractIds: string[]) {
  return useQuery({
    queryKey: ['finance', 'contractBalances', contractIds] as const,
    queryFn: () => api.finance.contractBalances.query({ contractIds }),
    enabled: contractIds.length > 0,
  });
}
