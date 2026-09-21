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

export interface IdentityApi {
  getUser(id: string): Promise<IdentityUserView | null>;
  listAgents(): Promise<Array<Pick<IdentityUserView, 'id' | 'name'>>>;
  getAgentDocument(id: string): Promise<IdentityAgentDocumentView | null>;
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
    };
    // TODO: auth routes (login / session) land here.
    return { api };
  },
};
