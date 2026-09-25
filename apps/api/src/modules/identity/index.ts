import type { AppModule, ModuleContext } from '../../platform/module.js';

export interface IdentityUserView {
  id: string;
  name: string;
  role: string;
}

/** Full agent projection for customer-facing documents (quotation PDFs). */
export interface IdentityAgentDocumentView {
  name: string;
  nameKhmer: string | null;
  licenseNumber: string | null;
  photoUrl: string | null;
  phone: string | null;
  email: string;
}

/** What a user may see — for deciding who gets a staff alert about a record. */
export interface IdentityUserAccessView {
  id: string;
  name: string;
  active: boolean;
  capabilities: string[];
}

export interface IdentityApi {
  getUser(id: string): Promise<IdentityUserView | null>;
  listAgents(): Promise<Array<Pick<IdentityUserView, 'id' | 'name'>>>;
  getAgentDocument(id: string): Promise<IdentityAgentDocumentView | null>;
  listUserAccess(ids: string[]): Promise<IdentityUserAccessView[]>;
}

export const identityModule: AppModule<IdentityApi> = {
  name: 'identity',
  register({ db }: ModuleContext) {
    const api: IdentityApi = {
      async getUser(id) {
        const u = await db.user.findUnique({ where: { id }, include: { role: true } });
        return u ? { id: u.id, name: u.name, role: u.role.key } : null;
      },
      async listAgents() {
        const rows = await db.user.findMany({
          where: { role: { key: 'AGENT' }, active: true },
          select: { id: true, name: true },
        });
        return rows;
      },
      async getAgentDocument(id) {
        const u = await db.user.findUnique({ where: { id } });
        return u
          ? {
              name: u.name,
              nameKhmer: u.nameKhmer,
              licenseNumber: u.licenseNumber,
              photoUrl: u.photoUrl,
              phone: u.phone,
              email: u.email,
            }
          : null;
      },
      async listUserAccess(ids) {
        if (ids.length === 0) return [];
        const rows = await db.user.findMany({ where: { id: { in: ids } }, include: { role: true } });
        return rows.map((u) => ({ id: u.id, name: u.name, active: u.active, capabilities: u.role.capabilities }));
      },
    };
    // TODO: auth routes (login / session) land here.
    return { api };
  },
};
