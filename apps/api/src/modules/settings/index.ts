import type { AppModule, ModuleContext } from '../../platform/module.js';
import { createSettingsService } from './settings.service.js';

export interface SettingsCompanyView {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface SettingsApi {
  /**
   * Atomically issues the next formatted document number for the sequence
   * whose `prefix` is `prefix` (e.g. "RSV", "SPA", "INV").
   */
  nextNumber(prefix: string): Promise<string>;
  /** Letterhead data for customer-facing documents (quotation PDFs). Admin-side display still goes through tRPC (`settings.router.ts`). */
  getCompanyProfile(): Promise<SettingsCompanyView | null>;
}

export const settingsModule: AppModule<SettingsApi> = {
  name: 'settings',
  register(ctx: ModuleContext) {
    const service = createSettingsService(ctx);
    return {
      api: {
        nextNumber: service.nextNumber,
        async getCompanyProfile() {
          const c = await service.getCompany();
          return c ? { name: c.name, address: c.address, phone: c.phone, email: c.email } : null;
        },
      },
    };
  },
};
