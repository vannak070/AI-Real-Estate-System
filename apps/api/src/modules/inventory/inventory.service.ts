import { TRPCError } from '@trpc/server';
import { InventoryEvents } from '@era/contracts';
import type { EventEnvelope } from '@era/contracts';
import type { ListingBadge, PropertyCategory, PropertyType, ProjectStatus, UnitStatus } from '@prisma/client';
import type { ModuleContext } from '../../platform/module.js';
import { deleteImage, saveImage } from '../../platform/uploads.js';

const RESERVED_LIKE: UnitStatus[] = ['RESERVED', 'HELD', 'BOOKED'];
const SOLD_LIKE: UnitStatus[] = ['SOLD', 'CONTRACTED', 'HANDED_OVER'];
const DELETABLE_UNIT_STATUSES: UnitStatus[] = ['AVAILABLE', 'BLOCKED'];

/** The "Starting from" marketing price — a manual override, else the cheapest unit, else null (no units priced yet). */
function startingPriceFor(override: number | null, units: { listPrice: number }[]): number | null {
  if (override != null) return override;
  return units.length ? Math.min(...units.map((u) => u.listPrice)) : null;
}

/** The public site never shows the internal 8-value operational status — just whether a unit
 * can still be bought (AVAILABLE), is spoken for (HELD/RESERVED/BOOKED/BLOCKED), or is gone (SOLD/CONTRACTED/HANDED_OVER). */
function publicUnitStatus(status: UnitStatus): 'AVAILABLE' | 'RESERVED' | 'SOLD' {
  if (status === 'AVAILABLE') return 'AVAILABLE';
  if (SOLD_LIKE.includes(status)) return 'SOLD';
  return 'RESERVED';
}

interface ProjectInput {
  name: string;
  /** Optional now — auto-derived from province/district/commune/village when those are given (see deriveAddress). */
  location?: string;
  city?: string;
  /** Structured Cambodia administrative divisions, sourced from the admin's gazetteer-backed picker. */
  province?: string;
  district?: string;
  commune?: string;
  village?: string;
  /** `null` clears the stored value; omitted leaves it unchanged. */
  phase?: string | null;
  status?: ProjectStatus;
  category?: PropertyCategory;
  propertyType?: PropertyType;
  handoverDate?: Date | null;
  amenities?: string[];
  coverColor?: string;
  badge?: ListingBadge;
  isPublished?: boolean;
  isDevelopment?: boolean;
  videoUrl?: string | null;
  startingPriceOverride?: number | null;
  developer?: string | null;
  tenure?: string | null;
  totalFloors?: number | null;
  disclosedUnitCount?: number | null;
}

/**
 * `location`/`city` stay the display strings every existing card/header reads — this derives them
 * from the structured picker fields instead of duplicating that logic at every call site. Only
 * recomputes when the caller actually touched a structured field, so a partial `updateProject`
 * patch (e.g. just `status`) never clobbers an existing free-text location.
 */
function deriveAddress(input: Partial<ProjectInput>): Partial<Pick<ProjectInput, 'location' | 'city'>> {
  const touchedStructured =
    input.province !== undefined || input.district !== undefined || input.commune !== undefined || input.village !== undefined;
  if (!touchedStructured) return {};
  const areaParts = [input.village, input.commune, input.district].filter((s): s is string => !!s);
  return {
    location: input.location ?? (areaParts.length ? areaParts.join(', ') : input.province),
    city: input.city ?? input.province,
  };
}

interface UnitInput {
  code: string;
  blockId?: string;
  unitTypeId?: string;
  floor?: number;
  areaSqm?: number;
  netAreaSqm?: number;
  view?: string;
  orientation?: string;
  parking?: number;
  listPrice: number;
  status?: UnitStatus;
  featured?: boolean;
}

export function createInventoryService({ db, bus, logger }: ModuleContext) {
  return {
    getUnit(id: string) {
      return db.unit.findUnique({ where: { id } });
    },

    /** Full cross-module projection for customer-facing documents (quotation PDFs). */
    async getUnitDocument(id: string) {
      const unit = await db.unit.findUnique({
        where: { id },
        include: { project: true, unitType: true },
      });
      return unit;
    },

    listUnits(projectId?: string) {
      return db.unit.findMany({ where: projectId ? { projectId } : undefined });
    },

    async setUnitStatus(id: string, status: UnitStatus) {
      return db.unit.update({ where: { id }, data: { status } });
    },

    createUnit(projectId: string, input: UnitInput) {
      return db.unit.create({ data: { projectId, ...input } });
    },

    async bulkCreateUnits(projectId: string, units: UnitInput[]) {
      await db.unit.createMany({ data: units.map((u) => ({ projectId, ...u })) });
      return db.unit.findMany({ where: { projectId, code: { in: units.map((u) => u.code) } } });
    },

    updateUnit(id: string, input: Partial<UnitInput>) {
      return db.unit.update({ where: { id }, data: input });
    },

    async deleteUnit(id: string) {
      const unit = await db.unit.findUniqueOrThrow({ where: { id } });
      if (!DELETABLE_UNIT_STATUSES.includes(unit.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'unit_not_deletable' });
      }
      return db.unit.delete({ where: { id } });
    },

    /* ── Projects ── */

    async listProjects() {
      const projects = await db.project.findMany({
        include: {
          units: {
            select: { status: true, listPrice: true, areaSqm: true, unitType: { select: { bedrooms: true, bathrooms: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      return projects.map(({ units, ...project }) => {
        const available = units.filter((u) => u.status === 'AVAILABLE').length;
        const reserved = units.filter((u) => RESERVED_LIKE.includes(u.status)).length;
        const sold = units.filter((u) => SOLD_LIKE.includes(u.status)).length;
        const gdv = units.reduce((a, u) => a + u.listPrice, 0);
        const soldValue = units
          .filter((u) => SOLD_LIKE.includes(u.status))
          .reduce((a, u) => a + u.listPrice, 0);
        const bedrooms = units.map((u) => u.unitType?.bedrooms).filter((n): n is number => n != null);
        const bathrooms = units.map((u) => u.unitType?.bathrooms).filter((n): n is number => n != null);
        const areas = units.map((u) => u.areaSqm).filter((n): n is number => n != null);
        const range = (nums: number[]): [number, number] | null =>
          nums.length ? [Math.min(...nums), Math.max(...nums)] : null;
        return {
          ...project,
          totalUnits: units.length,
          available,
          reserved,
          sold,
          absorption: units.length ? ((sold + reserved) / units.length) * 100 : 0,
          gdv,
          soldValue,
          startingPrice: startingPriceFor(project.startingPriceOverride, units),
          bedroomsRange: range(bedrooms),
          bathroomsRange: range(bathrooms),
          areaRange: range(areas),
        };
      });
    },

    async getProject(id: string) {
      const project = await db.project.findUnique({
        where: { id },
        include: {
          blocks: true,
          priceLists: { orderBy: { version: 'desc' } },
          units: { include: { unitType: true, block: true } },
        },
      });
      if (!project) return null;
      return { ...project, startingPrice: startingPriceFor(project.startingPriceOverride, project.units) };
    },

    createProject(input: ProjectInput) {
      const { location, ...derived } = deriveAddress(input);
      if (!location) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'location_required' });
      }
      return db.project.create({ data: { ...input, ...derived, location } });
    },

    updateProject(id: string, input: Partial<ProjectInput>) {
      return db.project.update({ where: { id }, data: { ...input, ...deriveAddress(input) } });
    },

    async setProjectsPublished(ids: string[], isPublished: boolean) {
      const { count } = await db.project.updateMany({ where: { id: { in: ids } }, data: { isPublished } });
      return { count };
    },

    async addProjectImage(projectId: string, dataUrl: string) {
      const { url } = await saveImage(`projects/${projectId}`, dataUrl);
      return db.project.update({ where: { id: projectId }, data: { imageUrls: { push: url } } });
    },

    async removeProjectImage(projectId: string, url: string) {
      const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
      const updated = await db.project.update({
        where: { id: projectId },
        data: { imageUrls: project.imageUrls.filter((u) => u !== url) },
      });
      await deleteImage(url);
      return updated;
    },

    /** Single-slot asset (whole-building floor plan) — distinct from the imageUrls gallery. */
    async setProjectSitePlan(projectId: string, dataUrl: string) {
      const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
      if (project.sitePlanUrl) await deleteImage(project.sitePlanUrl);
      const { url } = await saveImage(`projects/${projectId}`, dataUrl);
      return db.project.update({ where: { id: projectId }, data: { sitePlanUrl: url } });
    },

    async removeProjectSitePlan(projectId: string) {
      const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
      if (project.sitePlanUrl) await deleteImage(project.sitePlanUrl);
      return db.project.update({ where: { id: projectId }, data: { sitePlanUrl: null } });
    },

    /* ── Blocks ── */

    createBlock(projectId: string, input: { name: string; floors: number }) {
      return db.block.create({ data: { projectId, ...input } });
    },

    updateBlock(id: string, input: Partial<{ name: string; floors: number }>) {
      return db.block.update({ where: { id }, data: input });
    },

    async deleteBlock(id: string) {
      const unitCount = await db.unit.count({ where: { blockId: id } });
      if (unitCount > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'block_has_units' });
      }
      return db.block.delete({ where: { id } });
    },

    /* ── Unit types (global catalog) ── */

    listUnitTypes() {
      return db.unitType.findMany({ orderBy: { name: 'asc' } });
    },

    createUnitType(input: { name: string; bedrooms: number; bathrooms: number; areaSqm: number; description?: string }) {
      return db.unitType.create({ data: input });
    },

    updateUnitType(
      id: string,
      input: Partial<{ name: string; bedrooms: number; bathrooms: number; areaSqm: number; description: string | null }>,
    ) {
      return db.unitType.update({ where: { id }, data: input });
    },

    async deleteUnitType(id: string) {
      const unitCount = await db.unit.count({ where: { unitTypeId: id } });
      if (unitCount > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'unit_type_in_use' });
      }
      return db.unitType.delete({ where: { id } });
    },

    async addUnitTypeImage(unitTypeId: string, dataUrl: string) {
      const { url } = await saveImage(`unit-types/${unitTypeId}`, dataUrl);
      return db.unitType.update({ where: { id: unitTypeId }, data: { imageUrls: { push: url } } });
    },

    async removeUnitTypeImage(unitTypeId: string, url: string) {
      const unitType = await db.unitType.findUniqueOrThrow({ where: { id: unitTypeId } });
      const updated = await db.unitType.update({
        where: { id: unitTypeId },
        data: { imageUrls: unitType.imageUrls.filter((u) => u !== url) },
      });
      await deleteImage(url);
      return updated;
    },

    /** Single-slot asset (the dimensioned unit-layout drawing) — distinct from the imageUrls lifestyle gallery. */
    async setUnitTypeFloorPlan(unitTypeId: string, dataUrl: string) {
      const unitType = await db.unitType.findUniqueOrThrow({ where: { id: unitTypeId } });
      if (unitType.floorPlanUrl) await deleteImage(unitType.floorPlanUrl);
      const { url } = await saveImage(`unit-types/${unitTypeId}`, dataUrl);
      return db.unitType.update({ where: { id: unitTypeId }, data: { floorPlanUrl: url } });
    },

    async removeUnitTypeFloorPlan(unitTypeId: string) {
      const unitType = await db.unitType.findUniqueOrThrow({ where: { id: unitTypeId } });
      if (unitType.floorPlanUrl) await deleteImage(unitType.floorPlanUrl);
      return db.unitType.update({ where: { id: unitTypeId }, data: { floorPlanUrl: null } });
    },

    /* ── Price lists ── */

    async createPriceList(
      projectId: string,
      input: { name: string; psf: number; floorPremiumPct?: number; viewPremiumUsd?: number; effectiveFrom?: Date },
    ) {
      const last = await db.priceList.findFirst({ where: { projectId }, orderBy: { version: 'desc' } });
      return db.priceList.create({
        data: { projectId, version: (last?.version ?? 0) + 1, active: false, ...input },
      });
    },

    updatePriceList(
      id: string,
      input: Partial<{ name: string; psf: number; floorPremiumPct: number; viewPremiumUsd: number; effectiveFrom: Date }>,
    ) {
      return db.priceList.update({ where: { id }, data: input });
    },

    async deletePriceList(id: string) {
      const priceList = await db.priceList.findUniqueOrThrow({ where: { id } });
      if (priceList.active) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'cannot_delete_active_price_list' });
      }
      return db.priceList.delete({ where: { id } });
    },

    activatePriceList(id: string, projectId: string) {
      return db.$transaction([
        db.priceList.updateMany({ where: { projectId }, data: { active: false } }),
        db.priceList.update({ where: { id }, data: { active: true } }),
      ]);
    },

    /**
     * Saga participant. Moves a unit AVAILABLE -> RESERVED atomically, then
     * reports the outcome as an event. Idempotent: re-processing the same
     * request for an already-reserved unit is a success, not an error.
     */
    async handleReservationRequested(
      env: EventEnvelope<{ reservationId: string; unitId: string; agentId: string }>,
    ) {
      const { reservationId, unitId, agentId } = env.payload;
      const emit = (type: string, payload: Record<string, unknown>) =>
        bus.publish(type, payload, { correlationId: env.correlationId });

      try {
        const outcome = await db.$transaction(async (tx) => {
          const unit = await tx.unit.findUnique({ where: { id: unitId } });
          if (!unit) return { ok: false as const, reason: 'unit_not_found' };
          if (unit.status === 'RESERVED') return { ok: true as const };
          if (unit.status !== 'AVAILABLE') {
            return { ok: false as const, reason: `unit_${unit.status.toLowerCase()}` };
          }
          await tx.unit.update({ where: { id: unitId }, data: { status: 'RESERVED' } });
          return { ok: true as const };
        });

        await (outcome.ok
          ? emit(InventoryEvents.UnitReserved.type, { unitId, reservationId, reservedBy: agentId })
          : emit(InventoryEvents.UnitReservationRejected.type, {
              unitId,
              reservationId,
              reason: outcome.reason,
            }));
      } catch (err) {
        logger.error('inventory.reservation_failed', {
          unitId,
          error: err instanceof Error ? err.message : String(err),
        });
        await emit(InventoryEvents.UnitReservationRejected.type, {
          unitId,
          reservationId,
          reason: 'internal_error',
        });
      }
    },

    async markSold(unitId: string, contractId: string, correlationId?: string) {
      await db.unit.update({ where: { id: unitId }, data: { status: 'SOLD' } });
      await bus.publish(InventoryEvents.UnitSold.type, { unitId, contractId }, { correlationId });
    },

    /** A cancelled reservation frees its unit — idempotent: a no-op unless the unit is still RESERVED. */
    async releaseUnit(unitId: string, reservationId: string, correlationId?: string) {
      const unit = await db.unit.findUnique({ where: { id: unitId } });
      if (!unit || unit.status !== 'RESERVED') return;
      await db.unit.update({ where: { id: unitId }, data: { status: 'AVAILABLE' } });
      await bus.publish(InventoryEvents.UnitReleased.type, { unitId, reservationId }, { correlationId });
    },

    /* ── Public (apps/client, no auth) — a hand-written safe projection, never the raw admin
     * row. Deliberately excludes gdv/soldValue/startingPriceOverride (only the already-computed
     * startingPrice) and priceLists (psf/premiums) — commercially sensitive, admin-only. ── */

    /** Only `isPublished` projects, always. `filter` is optional and additive — apps/client's
     * Properties page calls this with no args and gets every published project (it filters
     * client-side); the AI assistant (Tier 1)
     * is the one caller that needs server-side narrowing, since it can't afford to put all
     * ~700 projects in an LLM's context on every turn. */
    async listPublicProjects(filter?: { category?: PropertyCategory; propertyType?: PropertyType; location?: string; limit?: number }) {
      const projects = await db.project.findMany({
        where: {
          isPublished: true,
          ...(filter?.category ? { category: filter.category } : {}),
          ...(filter?.propertyType ? { propertyType: filter.propertyType } : {}),
          ...(filter?.location
            ? { OR: [{ location: { contains: filter.location, mode: 'insensitive' } }, { city: { contains: filter.location, mode: 'insensitive' } }] }
            : {}),
        },
        include: { units: { select: { status: true, listPrice: true } } },
        orderBy: { createdAt: 'desc' },
        take: filter?.limit,
      });
      return projects.map(({ units, startingPriceOverride, ...project }) => ({
        id: project.id,
        name: project.name,
        location: project.location,
        city: project.city,
        phase: project.phase,
        status: project.status,
        category: project.category,
        propertyType: project.propertyType,
        handoverDate: project.handoverDate,
        amenities: project.amenities,
        coverColor: project.coverColor,
        imageUrls: project.imageUrls,
        badge: project.badge,
        isDevelopment: project.isDevelopment,
        videoUrl: project.videoUrl,
        startingPrice: startingPriceFor(startingPriceOverride, units),
        totalUnits: units.length,
        availableUnits: units.filter((u) => u.status === 'AVAILABLE').length,
      }));
    },

    /** A hidden property is indistinguishable from a missing one — a direct link returns null. */
    async getPublicProject(id: string) {
      const project = await db.project.findFirst({
        where: { id, isPublished: true },
        include: { units: { select: { status: true, listPrice: true } } },
      });
      if (!project) return null;
      const { units, startingPriceOverride, ...rest } = project;
      return {
        id: rest.id,
        name: rest.name,
        location: rest.location,
        city: rest.city,
        province: rest.province,
        district: rest.district,
        commune: rest.commune,
        village: rest.village,
        phase: rest.phase,
        status: rest.status,
        category: rest.category,
        propertyType: rest.propertyType,
        handoverDate: rest.handoverDate,
        amenities: rest.amenities,
        coverColor: rest.coverColor,
        imageUrls: rest.imageUrls,
        badge: rest.badge,
        videoUrl: rest.videoUrl,
        developer: rest.developer,
        tenure: rest.tenure,
        totalFloors: rest.totalFloors,
        disclosedUnitCount: rest.disclosedUnitCount,
        sitePlanUrl: rest.sitePlanUrl,
        startingPrice: startingPriceFor(startingPriceOverride, units),
        totalUnits: units.length,
        availableUnits: units.filter((u) => u.status === 'AVAILABLE').length,
      };
    },

    async listPublicUnits(projectId: string) {
      const units = await db.unit.findMany({
        where: { projectId, project: { isPublished: true } },
        include: { unitType: true },
        orderBy: { listPrice: 'asc' },
      });
      return units.map((u) => ({
        id: u.id,
        code: u.code,
        floor: u.floor,
        areaSqm: u.areaSqm,
        netAreaSqm: u.netAreaSqm,
        view: u.view,
        listPrice: u.listPrice,
        status: publicUnitStatus(u.status),
        bedrooms: u.unitType?.bedrooms ?? null,
        bathrooms: u.unitType?.bathrooms ?? null,
        unitTypeName: u.unitType?.name ?? null,
        unitTypeImageUrls: u.unitType?.imageUrls ?? [],
        floorPlanUrl: u.unitType?.floorPlanUrl ?? null,
      }));
    },
  };
}

export type InventoryService = ReturnType<typeof createInventoryService>;
