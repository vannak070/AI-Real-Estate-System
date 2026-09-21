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
    };
    return { api };
  },
};
