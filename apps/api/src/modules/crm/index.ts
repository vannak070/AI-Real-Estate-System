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

export interface CrmApi {
  listLeads(): Promise<CrmLeadView[]>;
  getContact(id: string): Promise<CrmContactView | null>;
  /** Same write path `crm.public.submitLead` uses — the AI assistant's `submit_lead` tool.
   * `source` is always `'WEBSITE'`, same rule as the public tRPC endpoint: never trust a
   * caller's own claim of source. */
  createLead(input: { name: string; email?: string; phone?: string; message?: string; preferredProjectId?: string }): Promise<{ id: string }>;
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
          source: 'WEBSITE',
          preferredProjectId: input.preferredProjectId,
          message: input.message,
        });
        return { id: lead.id };
      },
    };
    return { api };
  },
};
