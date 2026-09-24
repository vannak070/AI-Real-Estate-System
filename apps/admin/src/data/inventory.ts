import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ListingBadge, PropertyCategory, PropertyType, ProjectStatus, UnitStatus } from './types';

export const inventoryKeys = {
  projects: () => ['inventory', 'projects'] as const,
  project: (id: string) => ['inventory', 'projects', id] as const,
  units: () => ['inventory', 'units'] as const,
  unitTypes: () => ['inventory', 'unitTypes'] as const,
};

export interface ProjectFormInput {
  name: string;
  /** Optional — auto-derived server-side from province/district/commune/village when those are set. */
  location?: string;
  city?: string;
  province?: string;
  district?: string;
  commune?: string;
  village?: string;
  /** `null` clears the stored value on update; omitted leaves it unchanged. */
  phase?: string | null;
  status?: ProjectStatus;
  category?: PropertyCategory;
  propertyType?: PropertyType;
  handoverDate?: Date | null;
  amenities?: string[];
  coverColor?: string;
  badge?: ListingBadge;
  isPublished?: boolean;
  /** true = Inventory → Projects (a developer's building/estate); false = Sales/Rent. */
  isDevelopment?: boolean;
  videoUrl?: string | null;
  startingPriceOverride?: number | null;
  developer?: string | null;
  tenure?: string | null;
  totalFloors?: number | null;
  disclosedUnitCount?: number | null;
}

export interface UnitFormInput {
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

/* ── Projects ── */

export function useProjects() {
  return useQuery({
    queryKey: inventoryKeys.projects(),
    queryFn: () => api.inventory.projects.list.query(),
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.project(id ?? ''),
    queryFn: () => api.inventory.projects.get.query({ id: id! }),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectFormInput) => api.inventory.projects.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.projects() }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProjectFormInput> & { id: string }) => api.inventory.projects.update.mutate(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.projects() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.id) });
    },
  });
}

/** Bulk "Publish" / "Make private" for several properties at once. */
export function useSetProjectsPublished() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ids: string[]; isPublished: boolean }) => api.inventory.projects.setPublished.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', 'projects'] }),
  });
}

export function useAddProjectImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; dataUrl: string }) => api.inventory.projects.addImage.mutate(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.projects() });
    },
  });
}

export function useRemoveProjectImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; url: string }) => api.inventory.projects.removeImage.mutate(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.projects() });
    },
  });
}

export function useSetProjectSitePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; dataUrl: string }) => api.inventory.projects.setSitePlan.mutate(input),
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) }),
  });
}

export function useRemoveProjectSitePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => api.inventory.projects.removeSitePlan.mutate({ projectId }),
    onSuccess: (_data, projectId) => queryClient.invalidateQueries({ queryKey: inventoryKeys.project(projectId) }),
  });
}

/* ── Blocks ── */

export function useCreateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; name: string; floors: number }) => api.inventory.blocks.create.mutate(input),
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) }),
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; projectId: string; name?: string; floors?: number }) =>
      api.inventory.blocks.update.mutate(input),
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) }),
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; projectId: string }) => api.inventory.blocks.delete.mutate({ id: input.id }),
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) }),
  });
}

/* ── Unit types (global catalog) ── */

export function useUnitTypes() {
  return useQuery({ queryKey: inventoryKeys.unitTypes(), queryFn: () => api.inventory.unitTypes.list.query() });
}

export function useCreateUnitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; bedrooms: number; bathrooms: number; areaSqm: number; description?: string }) =>
      api.inventory.unitTypes.create.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.unitTypes() }),
  });
}

export function useUpdateUnitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      bedrooms?: number;
      bathrooms?: number;
      areaSqm?: number;
      description?: string | null;
    }) => api.inventory.unitTypes.update.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.unitTypes() }),
  });
}

export function useDeleteUnitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.inventory.unitTypes.delete.mutate({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.unitTypes() }),
  });
}

export function useAddUnitTypeImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { unitTypeId: string; dataUrl: string }) => api.inventory.unitTypes.addImage.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.unitTypes() }),
  });
}

export function useRemoveUnitTypeImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { unitTypeId: string; url: string }) => api.inventory.unitTypes.removeImage.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.unitTypes() }),
  });
}

export function useSetUnitTypeFloorPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { unitTypeId: string; dataUrl: string }) => api.inventory.unitTypes.setFloorPlan.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.unitTypes() }),
  });
}

export function useRemoveUnitTypeFloorPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (unitTypeId: string) => api.inventory.unitTypes.removeFloorPlan.mutate({ unitTypeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.unitTypes() }),
  });
}

/* ── Units ── */

/** All units, unscoped — used to resolve a "Project · CODE" label elsewhere (Quotations/Reservations/Contracts). */
export function useUnits() {
  return useQuery({
    queryKey: inventoryKeys.units(),
    queryFn: () => api.inventory.units.list.query(),
    staleTime: 60 * 1000,
  });
}

type UnitListItem = Awaited<ReturnType<typeof api.inventory.units.list.query>>[number];
type ProjectListItem = Awaited<ReturnType<typeof api.inventory.projects.list.query>>[number];

export function projectLabel(projects: ProjectListItem[] | undefined, id: string | null | undefined): string {
  if (!id) return '—';
  const match = projects?.find((p) => p.id === id);
  if (match) return match.name;
  // Still loading -> show the id as a transient placeholder; once the list has
  // loaded and there's still no match, the project genuinely no longer exists
  // (e.g. a lead left over from before an inventory reseed) — say so plainly
  // rather than surface an internal id that means nothing to anyone reading it.
  return projects ? 'Unknown project' : id;
}

export function unitLabel(
  units: UnitListItem[] | undefined,
  projects: ProjectListItem[] | undefined,
  id: string | null | undefined,
): string {
  if (!id) return '—';
  const unit = units?.find((u) => u.id === id);
  if (!unit) return id;
  const project = projects?.find((p) => p.id === unit.projectId);
  return project ? `${project.name} · ${unit.code}` : unit.code;
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UnitFormInput & { projectId: string }) => api.inventory.units.create.mutate(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.projects() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.units() });
    },
  });
}

export function useBulkCreateUnits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; units: UnitFormInput[] }) => api.inventory.units.bulkCreate.mutate(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.projects() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.units() });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<UnitFormInput> & { id: string; projectId: string }) => {
      const { projectId: _projectId, ...data } = input;
      return api.inventory.units.update.mutate(data);
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.projects() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.units() });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; projectId: string }) => api.inventory.units.delete.mutate({ id: input.id }),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.projects() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.units() });
    },
  });
}

/* ── Price lists ── */

export function useCreatePriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      projectId: string;
      name: string;
      psf: number;
      floorPremiumPct?: number;
      viewPremiumUsd?: number;
      effectiveFrom?: Date;
    }) => api.inventory.priceLists.create.mutate(input),
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) }),
  });
}

export function useUpdatePriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      projectId: string;
      name?: string;
      psf?: number;
      floorPremiumPct?: number;
      viewPremiumUsd?: number;
      effectiveFrom?: Date;
    }) => {
      const { projectId: _projectId, ...data } = input;
      return api.inventory.priceLists.update.mutate(data);
    },
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) }),
  });
}

export function useDeletePriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; projectId: string }) => api.inventory.priceLists.delete.mutate({ id: input.id }),
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) }),
  });
}

export function useActivatePriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; projectId: string }) => api.inventory.priceLists.activate.mutate(input),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({ queryKey: inventoryKeys.project(input.projectId) }),
  });
}
