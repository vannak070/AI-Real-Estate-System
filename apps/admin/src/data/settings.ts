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

/* ── About page CMS (apps/client's About page — Contact tab stays static) ── */

export interface AboutContentInput {
  pageTitle?: string;
  subtitle?: string | null;
  paragraph1?: string | null;
  paragraph2?: string | null;
  mission?: string | null;
  values?: string[];
  statProjects?: string | null;
  statLeads?: string | null;
  statAccuracy?: string | null;
  statTeamSize?: string | null;
}

export function useAboutContent() {
  return useQuery({ queryKey: ['settings', 'about', 'content'], queryFn: () => api.settings.about.content.get.query() });
}

export function useUpdateAboutContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AboutContentInput) => api.settings.about.content.update.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'content'] }),
  });
}

export function useAboutMilestones() {
  return useQuery({ queryKey: ['settings', 'about', 'milestones'], queryFn: () => api.settings.about.milestones.list.query() });
}

export function useCreateAboutMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { year: string; title: string; description: string; order?: number }) =>
      api.settings.about.milestones.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'milestones'] }),
  });
}

export function useUpdateAboutMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; year?: string; title?: string; description?: string; order?: number }) =>
      api.settings.about.milestones.update.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'milestones'] }),
  });
}

export function useDeleteAboutMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.settings.about.milestones.delete.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'milestones'] }),
  });
}

export function useAboutTeam() {
  return useQuery({ queryKey: ['settings', 'about', 'team'], queryFn: () => api.settings.about.team.list.query() });
}

export function useCreateAboutTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; position: string; bio?: string; isLeader?: boolean; order?: number }) =>
      api.settings.about.team.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'team'] }),
  });
}

export function useUpdateAboutTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      position?: string;
      bio?: string | null;
      isLeader?: boolean;
      order?: number;
    }) => api.settings.about.team.update.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'team'] }),
  });
}

export function useDeleteAboutTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.settings.about.team.delete.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'team'] }),
  });
}

export function useSetAboutTeamMemberPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; dataUrl: string }) => api.settings.about.team.setPhoto.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'team'] }),
  });
}

export function useRemoveAboutTeamMemberPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.settings.about.team.removePhoto.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'team'] }),
  });
}

export function useAboutAwards() {
  return useQuery({ queryKey: ['settings', 'about', 'awards'], queryFn: () => api.settings.about.awards.list.query() });
}

export function useCreateAboutAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { year: string; title: string; organization: string; description?: string; order?: number }) =>
      api.settings.about.awards.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'awards'] }),
  });
}

export function useUpdateAboutAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      year?: string;
      title?: string;
      organization?: string;
      description?: string | null;
      order?: number;
    }) => api.settings.about.awards.update.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'awards'] }),
  });
}

export function useDeleteAboutAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.settings.about.awards.delete.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'about', 'awards'] }),
  });
}
