import type { AppModule, ModuleContext } from '../../platform/module.js';
import { createInventoryService } from './inventory.service.js';
import { registerInventorySubscriptions } from './inventory.events.js';

export interface InventoryUnitView {
  id: string;
  projectId: string;
  status: string;
  listPrice: number;
}

/** Full cross-module projection for customer-facing documents (quotation PDFs). */
export interface InventoryUnitDocumentView {
  code: string;
  floor: number | null;
  areaSqm: number | null;
  netAreaSqm: number | null;
  listPrice: number;
  project: {
    name: string;
    location: string;
    imageUrls: string[];
    sitePlanUrl: string | null;
  };
  unitType: {
    name: string;
    bedrooms: number;
    bathrooms: number;
    floorPlanUrl: string | null;
  } | null;
}

export interface InventoryApi {
  getUnit(id: string): Promise<InventoryUnitView | null>;
  getUnitDocument(id: string): Promise<InventoryUnitDocumentView | null>;
}

// HTTP surface for this module is the tRPC router (inventory.router.ts),
// composed in src/trpc/root.ts — not registered here. See ARCHITECTURE.md.
export const inventoryModule: AppModule<InventoryApi> = {
  name: 'inventory',
  register(ctx: ModuleContext) {
    const service = createInventoryService(ctx);
    registerInventorySubscriptions(ctx.bus, service);

    const api: InventoryApi = {
      async getUnit(id) {
        const u = await service.getUnit(id);
        return u
          ? { id: u.id, projectId: u.projectId, status: u.status, listPrice: u.listPrice }
          : null;
      },
      async getUnitDocument(id) {
        const u = await service.getUnitDocument(id);
        if (!u) return null;
        return {
          code: u.code,
          floor: u.floor,
          areaSqm: u.areaSqm,
          netAreaSqm: u.netAreaSqm,
          listPrice: u.listPrice,
          project: {
            name: u.project.name,
            location: u.project.location,
            imageUrls: u.project.imageUrls,
            sitePlanUrl: u.project.sitePlanUrl,
          },
          unitType: u.unitType
            ? {
                name: u.unitType.name,
                bedrooms: u.unitType.bedrooms,
                bathrooms: u.unitType.bathrooms,
                floorPlanUrl: u.unitType.floorPlanUrl,
              }
            : null,
        };
      },
    };
    return { api };
  },
};
