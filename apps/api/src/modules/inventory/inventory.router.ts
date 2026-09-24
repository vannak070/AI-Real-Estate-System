import { z } from 'zod';
import { ListingBadge, ProjectStatus, PropertyCategory, PropertyType, UnitStatus } from '@prisma/client';
import { router, withCapability, publicProcedure } from '../../trpc/trpc.js';
import type { InventoryService } from './inventory.service.js';

const projectInput = z.object({
  name: z.string().min(1),
  /** Optional — auto-derived server-side from province/district/commune/village when those are set. */
  location: z.string().min(1).optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  commune: z.string().optional(),
  village: z.string().optional(),
  // `null` = clear the value. Omitted (undefined) = leave it unchanged on update, so a blanked form
  // field has to send null or the old value can never be removed.
  phase: z.string().nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  category: z.nativeEnum(PropertyCategory).optional(),
  propertyType: z.nativeEnum(PropertyType).optional(),
  handoverDate: z.coerce.date().nullable().optional(),
  amenities: z.array(z.string()).optional(),
  coverColor: z.string().optional(),
  badge: z.nativeEnum(ListingBadge).optional(),
  isPublished: z.boolean().optional(),
  isDevelopment: z.boolean().optional(),
  videoUrl: z.string().url().nullable().optional(),
  startingPriceOverride: z.number().int().positive().nullable().optional(),
  developer: z.string().nullable().optional(),
  tenure: z.string().nullable().optional(),
  totalFloors: z.number().int().positive().nullable().optional(),
  disclosedUnitCount: z.number().int().positive().nullable().optional(),
});

const imageDataUrl = z.string().regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, 'invalid_image_data_url');

const unitInput = z.object({
  code: z.string().min(1),
  blockId: z.string().optional(),
  unitTypeId: z.string().optional(),
  floor: z.number().int().optional(),
  areaSqm: z.number().positive().optional(),
  netAreaSqm: z.number().positive().optional(),
  view: z.string().optional(),
  orientation: z.string().optional(),
  parking: z.number().int().nonnegative().optional(),
  listPrice: z.number().int().positive(),
  status: z.nativeEnum(UnitStatus).optional(),
  featured: z.boolean().optional(),
});

export function inventoryRouter(service: InventoryService) {
  return router({
    projects: router({
      list: withCapability('inventory:read').query(() => service.listProjects()),

      get: withCapability('inventory:read')
        .input(z.object({ id: z.string() }))
        .query(({ input }) => service.getProject(input.id)),

      create: withCapability('inventory:write')
        .input(projectInput)
        .mutation(({ input }) => service.createProject(input)),

      update: withCapability('inventory:write')
        .input(projectInput.partial().extend({ id: z.string() }))
        .mutation(({ input: { id, ...data } }) => service.updateProject(id, data)),

      /** Bulk "Publish" / "Make private" from the Inventory list. */
      setPublished: withCapability('inventory:write')
        .input(z.object({ ids: z.array(z.string()).min(1).max(1000), isPublished: z.boolean() }))
        .mutation(({ input }) => service.setProjectsPublished(input.ids, input.isPublished)),

      addImage: withCapability('inventory:write')
        .input(z.object({ projectId: z.string(), dataUrl: imageDataUrl }))
        .mutation(({ input }) => service.addProjectImage(input.projectId, input.dataUrl)),

      removeImage: withCapability('inventory:write')
        .input(z.object({ projectId: z.string(), url: z.string() }))
        .mutation(({ input }) => service.removeProjectImage(input.projectId, input.url)),

      setSitePlan: withCapability('inventory:write')
        .input(z.object({ projectId: z.string(), dataUrl: imageDataUrl }))
        .mutation(({ input }) => service.setProjectSitePlan(input.projectId, input.dataUrl)),

      removeSitePlan: withCapability('inventory:write')
        .input(z.object({ projectId: z.string() }))
        .mutation(({ input }) => service.removeProjectSitePlan(input.projectId)),
    }),

    blocks: router({
      create: withCapability('inventory:write')
        .input(z.object({ projectId: z.string(), name: z.string().min(1), floors: z.number().int().positive() }))
        .mutation(({ input: { projectId, ...data } }) => service.createBlock(projectId, data)),

      update: withCapability('inventory:write')
        .input(z.object({ id: z.string(), name: z.string().min(1).optional(), floors: z.number().int().positive().optional() }))
        .mutation(({ input: { id, ...data } }) => service.updateBlock(id, data)),

      delete: withCapability('inventory:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.deleteBlock(input.id)),
    }),

    unitTypes: router({
      list: withCapability('inventory:read').query(() => service.listUnitTypes()),

      create: withCapability('inventory:write')
        .input(
          z.object({
            name: z.string().min(1),
            bedrooms: z.number().int().nonnegative(),
            bathrooms: z.number().int().nonnegative(),
            areaSqm: z.number().positive(),
            description: z.string().optional(),
          }),
        )
        .mutation(({ input }) => service.createUnitType(input)),

      update: withCapability('inventory:write')
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            bedrooms: z.number().int().nonnegative().optional(),
            bathrooms: z.number().int().nonnegative().optional(),
            areaSqm: z.number().positive().optional(),
            description: z.string().nullable().optional(),
          }),
        )
        .mutation(({ input: { id, ...data } }) => service.updateUnitType(id, data)),

      delete: withCapability('inventory:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.deleteUnitType(input.id)),

      addImage: withCapability('inventory:write')
        .input(z.object({ unitTypeId: z.string(), dataUrl: imageDataUrl }))
        .mutation(({ input }) => service.addUnitTypeImage(input.unitTypeId, input.dataUrl)),

      removeImage: withCapability('inventory:write')
        .input(z.object({ unitTypeId: z.string(), url: z.string() }))
        .mutation(({ input }) => service.removeUnitTypeImage(input.unitTypeId, input.url)),

      setFloorPlan: withCapability('inventory:write')
        .input(z.object({ unitTypeId: z.string(), dataUrl: imageDataUrl }))
        .mutation(({ input }) => service.setUnitTypeFloorPlan(input.unitTypeId, input.dataUrl)),

      removeFloorPlan: withCapability('inventory:write')
        .input(z.object({ unitTypeId: z.string() }))
        .mutation(({ input }) => service.removeUnitTypeFloorPlan(input.unitTypeId)),
    }),

    units: router({
      list: withCapability('inventory:read')
        .input(z.object({ projectId: z.string().optional() }).optional())
        .query(({ input }) => service.listUnits(input?.projectId)),

      get: withCapability('inventory:read')
        .input(z.object({ id: z.string() }))
        .query(({ input }) => service.getUnit(input.id)),

      create: withCapability('inventory:write')
        .input(z.object({ projectId: z.string() }).merge(unitInput))
        .mutation(({ input: { projectId, ...data } }) => service.createUnit(projectId, data)),

      bulkCreate: withCapability('inventory:write')
        .input(z.object({ projectId: z.string(), units: z.array(unitInput).min(1) }))
        .mutation(({ input }) => service.bulkCreateUnits(input.projectId, input.units)),

      update: withCapability('inventory:write')
        .input(unitInput.partial().extend({ id: z.string() }))
        .mutation(({ input: { id, ...data } }) => service.updateUnit(id, data)),

      delete: withCapability('inventory:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.deleteUnit(input.id)),

      setStatus: withCapability('inventory:write')
        .input(z.object({ id: z.string(), status: z.nativeEnum(UnitStatus) }))
        .mutation(({ input }) => service.setUnitStatus(input.id, input.status)),
    }),

    // No withCapability — apps/client is unauthenticated. A hand-written safe projection
    // (inventory.service.ts's listPublicProjects/getPublicProject/listPublicUnits), never the
    // raw admin row: excludes gdv/soldValue/startingPriceOverride and priceLists entirely.
    public: router({
      projects: router({
        list: publicProcedure.query(() => service.listPublicProjects()),
        get: publicProcedure.input(z.object({ id: z.string() })).query(({ input }) => service.getPublicProject(input.id)),
      }),
      units: router({
        list: publicProcedure
          .input(z.object({ projectId: z.string() }))
          .query(({ input }) => service.listPublicUnits(input.projectId)),
      }),
    }),

    priceLists: router({
      create: withCapability('inventory:write')
        .input(
          z.object({
            projectId: z.string(),
            name: z.string().min(1),
            psf: z.number().positive(),
            floorPremiumPct: z.number().nonnegative().optional(),
            viewPremiumUsd: z.number().int().nonnegative().optional(),
            effectiveFrom: z.coerce.date().optional(),
          }),
        )
        .mutation(({ input: { projectId, ...data } }) => service.createPriceList(projectId, data)),

      update: withCapability('inventory:write')
        .input(
          z.object({
            id: z.string(),
            name: z.string().min(1).optional(),
            psf: z.number().positive().optional(),
            floorPremiumPct: z.number().nonnegative().optional(),
            viewPremiumUsd: z.number().int().nonnegative().optional(),
            effectiveFrom: z.coerce.date().optional(),
          }),
        )
        .mutation(({ input: { id, ...data } }) => service.updatePriceList(id, data)),

      delete: withCapability('inventory:write')
        .input(z.object({ id: z.string() }))
        .mutation(({ input }) => service.deletePriceList(input.id)),

      activate: withCapability('inventory:write')
        .input(z.object({ id: z.string(), projectId: z.string() }))
        .mutation(({ input }) => service.activatePriceList(input.id, input.projectId)),
    }),
  });
}
