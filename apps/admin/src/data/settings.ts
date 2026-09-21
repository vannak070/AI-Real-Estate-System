import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useCompany() {
  return useQuery({ queryKey: ['settings', 'company'], queryFn: () => api.settings.company.get.query() });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name?: string;
      legalName?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      taxId?: string | null;
      currency?: string;
      timezone?: string;
      locale?: string;
    }) => api.settings.company.update.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'company'] }),
  });
}

export function useTaxRates() {
  return useQuery({ queryKey: ['settings', 'taxRates'], queryFn: () => api.settings.taxRates.list.query() });
}

export function useSequences() {
  return useQuery({ queryKey: ['settings', 'sequences'], queryFn: () => api.settings.sequences.list.query() });
}
