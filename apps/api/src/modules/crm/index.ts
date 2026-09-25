import type { AppModule, ModuleContext } from '../../platform/module.js';
import { createCrmService } from './crm.service.js';

export interface CrmLeadView {
  id: string;
  stage: string;
  ownerId: string | null;
}

export interface CrmContactView {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface CrmLeadSummaryView {
  id: string;
  stage: string;
  ownerId: string | null;
  contactName: string;
  phone: string | null;
  email: string | null;
}

export interface CrmApi {
  listLeads(): Promise<CrmLeadView[]>;
  getContact(id: string): Promise<CrmContactView | null>;
  /** Same write path `crm.public.submitLead` uses — the AI assistant's `submit_lead` tool.
   * `source` defaults to `'WEBSITE'`; only server-side callers that verified where the message
   * came from (the messaging bots' signed webhooks) pass another channel key. Never forward a
   * source claimed by the end user. */
  createLead(input: {
    source?: string;
    name: string;
    email?: string;
    phone?: string;
    message?: string;
    preferredProjectId?: string;
    /** An ad link's `?utm_campaign=` code — resolved to a campaign; unknown codes are ignored. */
    campaignCode?: string;
  }): Promise<{ id: string }>;
  /** Minimal facts for campaign attribution — no names/phones/emails. */
  listLeadsForAttribution(): Promise<
    { id: string; contactId: string; campaignId: string | null; source: string; stage: string; createdAt: Date }[]
  >;
  countLeadsForCampaign(campaignId: string): Promise<number>;
  /** Missing ids (deleted leads) are simply absent from the result. */
  listLeadSummaries(leadIds: string[]): Promise<CrmLeadSummaryView[]>;
  /** Leads + contacts whose source is this channel key. */
  countRecordsWithSource(source: string): Promise<number>;
  /** A website visitor correcting details they already submitted — updates that lead's contact in
   * place (and logs a NOTE) rather than creating a duplicate. null = lead no longer exists. */
  updateLeadContact(
    leadId: string,
    patch: { name?: string; email?: string; phone?: string; message?: string; preferredProjectId?: string },
  ): Promise<{ id: string; changed: string[] } | null>;
}

// HTTP surface for this module is the tRPC router (crm.router.ts), composed
// in src/trpc/root.ts — not registered here. See ARCHITECTURE.md.
export const crmModule: AppModule<CrmApi> = {
  name: 'crm',
  register(ctx: ModuleContext) {
    const service = createCrmService(ctx);
    const api: CrmApi = {
      async listLeads() {
        const rows = await service.listLeads();
        return rows.map((r) => ({ id: r.id, stage: r.stage, ownerId: r.ownerId }));
      },
      async getContact(id) {
        const c = await service.getContact(id);
        return c ? { id: c.id, name: c.name, phone: c.phone, email: c.email } : null;
      },
      async createLead(input) {
        const lead = await service.createLead({
          contact: { name: input.name, email: input.email, phone: input.phone },
          source: input.source ?? 'WEBSITE',
          preferredProjectId: input.preferredProjectId,
          message: input.message,
          campaignCode: input.campaignCode,
        });
        return { id: lead.id };
      },
      listLeadsForAttribution: () => service.listLeadsForAttribution(),
      countLeadsForCampaign: (campaignId) => service.countLeadsForCampaign(campaignId),
      async listLeadSummaries(leadIds) {
        const rows = await service.listLeadSummaries(leadIds);
        return rows.map((l) => ({
          id: l.id,
          stage: l.stage,
          ownerId: l.ownerId,
          contactName: l.contact.name,
          phone: l.contact.phone,
          email: l.contact.email,
        }));
      },
      countRecordsWithSource: (source) => service.countRecordsWithSource(source),
      updateLeadContact(leadId, patch) {
        return service.updateLeadContact(leadId, patch);
      },
    };
    return { api };
  },
};
