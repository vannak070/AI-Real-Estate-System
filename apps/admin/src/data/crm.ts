import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { LEAD_STAGES, type ActivityType, type ContactType, type LeadSource, type LeadStage, type Temperature } from './types';

export const crmKeys = {
  contacts: (filter?: { type?: ContactType; ownerId?: string; q?: string }) =>
    ['crm', 'contacts', filter ?? {}] as const,
  contact: (id: string) => ['crm', 'contacts', id] as const,
  leads: (filter?: { ownerId?: string }) => ['crm', 'leads', filter ?? {}] as const,
  lead: (id: string) => ['crm', 'leads', id] as const,
  activities: (filter: { leadId?: string; contactId?: string }) => ['crm', 'activities', filter] as const,
  myWork: () => ['crm', 'activities', 'myWork'] as const,
};

/* ── Contacts ── */

export function useContacts(filter?: { type?: ContactType; ownerId?: string; q?: string }) {
  return useQuery({
    queryKey: crmKeys.contacts(filter),
    queryFn: () => api.crm.contacts.list.query(filter),
  });
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: crmKeys.contact(id ?? ''),
    queryFn: () => api.crm.contacts.get.query({ id: id! }),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      type?: ContactType;
      email?: string;
      phone?: string;
      nationality?: string;
      company?: string;
      source: LeadSource;
      consentMarketing?: boolean;
      ownerId?: string;
      tags?: string[];
    }) => api.crm.contacts.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] }),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      type?: ContactType;
      email?: string | null;
      phone?: string | null;
      nationality?: string | null;
      company?: string | null;
      consentMarketing?: boolean;
    }) => api.crm.contacts.update.mutate(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
      queryClient.invalidateQueries({ queryKey: crmKeys.contact(input.id) });
    },
  });
}

type ContactListItem = Awaited<ReturnType<typeof api.crm.contacts.list.query>>[number];

export function contactLabel(contacts: ContactListItem[] | undefined, id: string | null | undefined): string {
  if (!id) return '—';
  return contacts?.find((c) => c.id === id)?.name ?? id;
}

/** Pre-flight duplicate check before creating a contact/lead — same email or phone already on file. */
export function useFindDuplicateContact(input: { email?: string; phone?: string }) {
  return useQuery({
    queryKey: ['crm', 'contacts', 'duplicate', input],
    queryFn: () => api.crm.contacts.findDuplicate.query(input),
    enabled: !!(input.email || input.phone),
    staleTime: 0,
  });
}

export function useVerifyKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.crm.contacts.verifyKyc.mutate({ id }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] });
      queryClient.invalidateQueries({ queryKey: crmKeys.contact(id) });
    },
  });
}

/* ── Leads ── */

export function useLeads(filter?: { ownerId?: string }) {
  return useQuery({
    queryKey: crmKeys.leads(filter),
    queryFn: () => api.crm.leads.list.query(filter),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email?: string; phone?: string; source: LeadSource; ownerId?: string }) =>
      api.crm.leads.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] }),
  });
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: crmKeys.lead(id ?? ''),
    queryFn: () => api.crm.leads.get.query({ id: id! }),
    enabled: !!id,
  });
}

export function useChangeLeadStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; to: LeadStage }) => api.crm.leads.changeStage.mutate(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: crmKeys.leads() });
      queryClient.invalidateQueries({ queryKey: crmKeys.lead(input.id) });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      temperature?: Temperature;
      score?: number;
      budgetMin?: number | null;
      budgetMax?: number | null;
      preferredProjectId?: string | null;
      unitTypeWanted?: string | null;
      timeline?: string | null;
      ownerId?: string | null;
      lostReason?: string | null;
    }) => api.crm.leads.update.mutate(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: crmKeys.leads() });
      queryClient.invalidateQueries({ queryKey: crmKeys.lead(input.id) });
    },
  });
}

type LeadListItem = Awaited<ReturnType<typeof api.crm.leads.list.query>>[number];

export function groupLeadsByStage(leads: LeadListItem[] | undefined) {
  const list = leads ?? [];
  return LEAD_STAGES.map((stage) => {
    const stageLeads = list.filter((l) => l.stage === stage);
    return {
      stage,
      leads: stageLeads,
      count: stageLeads.length,
      value: stageLeads.reduce((a, l) => a + ((l.budgetMin ?? 0) + (l.budgetMax ?? 0)) / 2, 0),
    };
  });
}

/* ── Activities ── */

export function useActivities(filter: { leadId?: string; contactId?: string }) {
  return useQuery({
    queryKey: crmKeys.activities(filter),
    queryFn: () => api.crm.activities.list.query(filter),
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      type: ActivityType;
      subject: string;
      leadId?: string;
      contactId?: string;
      contractId?: string;
      ownerId?: string;
      dueAt?: Date;
    }) => api.crm.activities.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm', 'activities'] }),
  });
}

export function useToggleActivityDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.crm.activities.toggleDone.mutate({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'activities'] });
      queryClient.invalidateQueries({ queryKey: crmKeys.leads() });
    },
  });
}

/** The signed-in agent's own overdue + open tasks — powers the dashboard "my work" widget. */
export function useMyWork() {
  return useQuery({
    queryKey: crmKeys.myWork(),
    queryFn: () => api.crm.activities.myWork.query(),
  });
}
