import type { ProjectFormInput } from '../../data/inventory';
import type { ListingBadge, ProjectStatus, PropertyCategory, PropertyType } from '../../data/types';

/** The single form behind both "New property" and "Edit property" — they used to be two
 * hand-written copies that drifted apart (Add had no facts/marketing fields and different
 * validation). Every input is held as a string so a blanked field can be sent as `null`. */
export interface ProjectFormState {
  name: string;
  phase: string;
  propertyType: PropertyType;
  category: PropertyCategory;
  status: ProjectStatus;
  province?: string;
  district?: string;
  commune?: string;
  village?: string;
  handoverDate: string;
  coverColor: string;
  amenities: string;
  developer: string;
  tenure: string;
  totalFloors: string;
  disclosedUnitCount: string;
  badge: ListingBadge;
  isPublished: boolean;
  isDevelopment: boolean;
  videoUrl: string;
  startingPriceOverride: string;
}

export function emptyProjectForm(defaults: Partial<ProjectFormState> = {}): ProjectFormState {
  return {
    name: '',
    phase: '',
    propertyType: 'CONDO',
    category: 'SALE',
    status: 'PLANNING',
    handoverDate: '',
    coverColor: '#001F5B',
    amenities: '',
    developer: '',
    tenure: '',
    totalFloors: '',
    disclosedUnitCount: '',
    badge: 'NONE',
    // New properties start hidden from the website until someone finishes and publishes them.
    isPublished: false,
    isDevelopment: false,
    videoUrl: '',
    startingPriceOverride: '',
    ...defaults,
  };
}

interface ExistingProject {
  name: string;
  phase: string | null;
  propertyType: PropertyType;
  category: PropertyCategory;
  status: ProjectStatus;
  province: string | null;
  district: string | null;
  commune: string | null;
  village: string | null;
  handoverDate: string | null;
  coverColor: string | null;
  amenities: string[];
  developer: string | null;
  tenure: string | null;
  totalFloors: number | null;
  disclosedUnitCount: number | null;
  badge: ListingBadge;
  isPublished: boolean;
  isDevelopment: boolean;
  videoUrl: string | null;
  startingPriceOverride: number | null;
}

export function projectToForm(p: ExistingProject): ProjectFormState {
  return {
    name: p.name,
    phase: p.phase ?? '',
    propertyType: p.propertyType,
    category: p.category,
    status: p.status,
    province: p.province ?? undefined,
    district: p.district ?? undefined,
    commune: p.commune ?? undefined,
    village: p.village ?? undefined,
    handoverDate: p.handoverDate ? p.handoverDate.slice(0, 10) : '',
    coverColor: p.coverColor ?? '#001F5B',
    amenities: p.amenities.join(', '),
    developer: p.developer ?? '',
    tenure: p.tenure ?? '',
    totalFloors: p.totalFloors != null ? String(p.totalFloors) : '',
    disclosedUnitCount: p.disclosedUnitCount != null ? String(p.disclosedUnitCount) : '',
    badge: p.badge,
    isPublished: p.isPublished,
    isDevelopment: p.isDevelopment,
    videoUrl: p.videoUrl ?? '',
    startingPriceOverride: p.startingPriceOverride != null ? String(p.startingPriceOverride) : '',
  };
}

const textOrNull = (s: string) => (s.trim() ? s.trim() : null);
const numberOrNull = (s: string) => (s.trim() ? Number(s) : null);

export function formToProjectInput(f: ProjectFormState): ProjectFormInput {
  return {
    name: f.name.trim(),
    phase: textOrNull(f.phase),
    propertyType: f.propertyType,
    category: f.category,
    status: f.status,
    province: f.province,
    district: f.district,
    commune: f.commune,
    village: f.village,
    handoverDate: f.handoverDate ? new Date(f.handoverDate) : null,
    coverColor: f.coverColor,
    amenities: f.amenities.split(',').map((s) => s.trim()).filter(Boolean),
    developer: textOrNull(f.developer),
    tenure: textOrNull(f.tenure),
    totalFloors: numberOrNull(f.totalFloors),
    disclosedUnitCount: numberOrNull(f.disclosedUnitCount),
    badge: f.badge,
    isPublished: f.isPublished,
    isDevelopment: f.isDevelopment,
    videoUrl: textOrNull(f.videoUrl),
    startingPriceOverride: numberOrNull(f.startingPriceOverride),
  };
}

/** Same rule for Add and Edit: a name, and a known location. Imported records only have a
 * free-text location (no province), so on Edit that existing location satisfies the rule. */
export function projectFormMissing(f: ProjectFormState, hasExistingLocation: boolean): string[] {
  const missing: string[] = [];
  if (!f.name.trim()) missing.push('Name');
  if (!f.province && !hasExistingLocation) missing.push('Province/City');
  return missing;
}
