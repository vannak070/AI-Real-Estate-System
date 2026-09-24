import type { ProjectStatus, PropertyCategory, PropertyType } from '@prisma/client';
import type { AppModule, ModuleContext } from '../../platform/module.js';
import { createInventoryService } from './inventory.service.js';
import { registerInventorySubscriptions } from './inventory.events.js';

export interface InventoryUnitView {
  id: string;
  projectId: string;
  status: string;
  listPrice: number;
}

/** Same shape `inventory.public.projects.*` already serves apps/client — reused as-is for the
 * AI assistant's tools (packages/contracts/... intentionally isn't the source of truth here;
 * this module's own service projection is, same as every other public read). */
export interface PublicProjectView {
  id: string;
  name: string;
  location: string;
  city: string | null;
  status: ProjectStatus;
  category: PropertyCategory;
  propertyType: PropertyType;
  amenities: string[];
  imageUrls: string[];
  startingPrice: number | null;
  totalUnits: number;
  availableUnits: number;
  /** Distinct bedroom counts among available units (0 = studio); empty = not recorded. */
  bedrooms: number[];
  /** Size range of available units, m²; null = not recorded. */
  sizeSqm: { min: number; max: number } | null;
}

export interface PublicProjectDetailView extends PublicProjectView {
  province: string | null;
  district: string | null;
  developer: string | null;
  tenure: string | null;
}

export interface PublicUnitView {
  id: string;
  code: string;
  listPrice: number;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  areaSqm: number | null;
  floor: number | null;
  view: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  unitTypeName: string | null;
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
  /** Narrowed, capped project search — the AI assistant's `search_properties` tool. Never
   * returns the full catalog; `limit` defaults small so a tool result stays a handful of
   * projects, not hundreds. */
  /** Up to `limit` (default 8) matches — in budget, listings with photos first, then newest —
   * plus how many matched in total. */
  searchPublicProjects(filter?: {
    category?: PropertyCategory;
    propertyType?: PropertyType;
    location?: string;
    name?: string;
    /** Exact bedroom count (0 = studio), or a minimum — matched against available units. */
    bedrooms?: number;
    minBedrooms?: number;
    minAreaSqm?: number;
    /** USD; compared with the listing's starting price (sale price, or monthly rent). */
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
  }): Promise<{ total: number; results: PublicProjectView[] }>;
  getPublicProject(id: string): Promise<PublicProjectDetailView | null>;
  listPublicUnits(projectId: string): Promise<PublicUnitView[]>;
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
      async searchPublicProjects(filter) {
        const { limit = 8, minPrice, maxPrice, ...where } = filter ?? {};
        // All matches (newest first), then budget + ranking in code: startingPrice is derived
        // (override or cheapest unit), not a column the DB can filter on.
        const rows = (await service.listPublicProjects(where)).filter(
          (p) =>
            (maxPrice == null || (p.startingPrice != null && p.startingPrice <= maxPrice)) &&
            (minPrice == null || (p.startingPrice != null && p.startingPrice >= minPrice)),
        );
        // Listings with photos first (the chat bots show them as photo cards); stable, so newest-first holds within each.
        const ranked = [...rows].sort((a, b) => Number(b.imageUrls.length > 0) - Number(a.imageUrls.length > 0));
        return { total: rows.length, results: ranked.slice(0, limit).map((p) => ({
          id: p.id,
          name: p.name,
          location: p.location,
          city: p.city,
          status: p.status,
          category: p.category,
          propertyType: p.propertyType,
          amenities: p.amenities,
          imageUrls: p.imageUrls,
          startingPrice: p.startingPrice,
          totalUnits: p.totalUnits,
          availableUnits: p.availableUnits,
          bedrooms: p.bedrooms,
          sizeSqm: p.sizeSqm,
        })) };
      },
      async getPublicProject(id) {
        const p = await service.getPublicProject(id);
        if (!p) return null;
        return {
          id: p.id,
          name: p.name,
          location: p.location,
          city: p.city,
          status: p.status,
          category: p.category,
          propertyType: p.propertyType,
          amenities: p.amenities,
          imageUrls: p.imageUrls,
          startingPrice: p.startingPrice,
          totalUnits: p.totalUnits,
          availableUnits: p.availableUnits,
          bedrooms: p.bedrooms,
          sizeSqm: p.sizeSqm,
          province: p.province,
          district: p.district,
          developer: p.developer,
          tenure: p.tenure,
        };
      },
      async listPublicUnits(projectId) {
        const units = await service.listPublicUnits(projectId);
        return units.map((u) => ({
          id: u.id,
          code: u.code,
          listPrice: u.listPrice,
          status: u.status,
          areaSqm: u.areaSqm,
          floor: u.floor,
          view: u.view,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          unitTypeName: u.unitTypeName,
        }));
      },
    };
    return { api };
  },
};
