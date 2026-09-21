import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export const salesKeys = {
  quotations: (filter?: { ownerId?: string }) => ['sales', 'quotations', filter ?? {}] as const,
  quotation: (id: string) => ['sales', 'quotations', id] as const,
  reservations: (filter?: { agentId?: string }) => ['sales', 'reservations', filter ?? {}] as const,
  reservation: (id: string) => ['sales', 'reservations', id] as const,
  contracts: (filter?: { agentId?: string }) => ['sales', 'contracts', filter ?? {}] as const,
  contract: (id: string) => ['sales', 'contracts', id] as const,
};

/* ── Payment plans ── */

export interface PaymentPlanInstallmentInput {
  label: string;
  percent: number;
  dueOffsetDays?: number;
  milestone?: string;
}

export function usePaymentPlans() {
  return useQuery({ queryKey: ['sales', 'paymentPlans'], queryFn: () => api.sales.paymentPlans.list.query() });
}

export function useCreatePaymentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; installments: PaymentPlanInstallmentInput[] }) =>
      api.sales.paymentPlans.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales', 'paymentPlans'] }),
  });
}

export function useUpdatePaymentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      description?: string | null;
      installments?: PaymentPlanInstallmentInput[];
    }) => api.sales.paymentPlans.update.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales', 'paymentPlans'] }),
  });
}

export function useDeletePaymentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sales.paymentPlans.delete.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales', 'paymentPlans'] }),
  });
}

/* ── Quotations ── */

export function useQuotations(filter?: { ownerId?: string }) {
  return useQuery({ queryKey: salesKeys.quotations(filter), queryFn: () => api.sales.quotations.list.query(filter) });
}

export function useQuotation(id: string | null) {
  return useQuery({
    queryKey: salesKeys.quotation(id ?? ''),
    queryFn: () => api.sales.quotations.get.query({ id: id! }),
    enabled: !!id,
  });
}

export function useAcceptQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sales.quotations.accept.mutate({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.quotations() });
      queryClient.invalidateQueries({ queryKey: salesKeys.reservations() });
    },
  });
}

export interface DiscountTierInput {
  label: string;
  pct: number;
}

export interface CreateQuotationInput {
  contactId: string;
  unitId: string;
  leadId?: string;
  ownerId: string;
  priceListId?: string;
  listPrice: number;
  discounts: DiscountTierInput[];
  paymentPlanId: string;
  validUntil?: Date;
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuotationInput) => api.sales.quotations.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesKeys.quotations() }),
  });
}

/** DRAFT-only — see sales.router.ts's `quotations.update` for why contactId/unitId/ownerId
 * aren't here: changing the customer or unit isn't an edit, it's a different quotation. */
export interface UpdateQuotationInput {
  id: string;
  leadId?: string | null;
  priceListId?: string | null;
  discounts?: DiscountTierInput[];
  paymentPlanId?: string;
  validUntil?: Date | null;
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateQuotationInput) => api.sales.quotations.update.mutate(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.quotations() });
      queryClient.invalidateQueries({ queryKey: salesKeys.quotation(input.id) });
    },
  });
}

export function useQuotationSchedule(id: string | null) {
  return useQuery({
    queryKey: [...salesKeys.quotation(id ?? ''), 'schedule'],
    queryFn: () => api.sales.quotations.schedule.query({ id: id! }),
    enabled: !!id,
  });
}

export function useGenerateQuotationPdf() {
  return useMutation({
    mutationFn: (id: string) => api.sales.quotations.generatePdf.mutate({ id }),
  });
}

/* ── Reservations ── */

export function useReservations(filter?: { agentId?: string }) {
  return useQuery({
    queryKey: salesKeys.reservations(filter),
    queryFn: () => api.sales.reservations.list.query(filter),
    refetchInterval: 4000, // the reservation saga settles asynchronously — poll for HELD -> CONFIRMED
  });
}

export function useReservation(id: string | null) {
  return useQuery({
    queryKey: salesKeys.reservation(id ?? ''),
    queryFn: () => api.sales.reservations.get.query({ id: id! }),
    enabled: !!id,
    refetchInterval: 4000,
  });
}

export interface RequestReservationInput {
  unitId: string;
  contactId: string;
  agentId: string;
  depositAmount?: number;
  holdHours?: number;
}

export function useRequestReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestReservationInput) => api.sales.reservations.request.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesKeys.reservations() }),
  });
}

export function useConfirmDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sales.reservations.confirmDeposit.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesKeys.reservations() }),
  });
}

/** Only takes effect while the reservation is still active and its deposit hasn't
 * been marked received yet — see `sales.service.ts`'s `updateReservationDeposit`. */
export function useUpdateReservationDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; depositAmount: number }) => api.sales.reservations.updateDeposit.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesKeys.reservations() }),
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sales.reservations.cancel.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: salesKeys.reservations() }),
  });
}

export function useSignContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reservationId: string; salePrice: number; paymentPlanId?: string }) =>
      api.sales.reservations.signContract.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.reservations() });
      queryClient.invalidateQueries({ queryKey: salesKeys.contracts() });
    },
  });
}

/* ── Contracts ── */

export function useContracts(filter?: { agentId?: string }) {
  return useQuery({ queryKey: salesKeys.contracts(filter), queryFn: () => api.sales.contracts.list.query(filter) });
}

export function useContract(id: string | null) {
  return useQuery({
    queryKey: salesKeys.contract(id ?? ''),
    queryFn: () => api.sales.contracts.get.query({ id: id! }),
    enabled: !!id,
  });
}

export function useTerminateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sales.contracts.terminate.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales', 'contracts'] }),
  });
}

export function useCompleteContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sales.contracts.complete.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales', 'contracts'] }),
  });
}

/* ── Milestones ── */

export function useCompleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.sales.milestones.complete.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales', 'contracts'] }),
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; dueDate: Date | null }) => api.sales.milestones.update.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales', 'contracts'] }),
  });
}
