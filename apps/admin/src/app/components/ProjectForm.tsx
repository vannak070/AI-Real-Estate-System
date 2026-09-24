import type { ReactNode } from 'react';
import { Select, TextInput } from '@era/ui';
import {
  LISTING_BADGES,
  PROJECT_STATUSES,
  PROPERTY_CATEGORIES,
  PROPERTY_TYPES,
  type ListingBadge,
  type ProjectStatus,
  type PropertyCategory,
  type PropertyType,
} from '../../data/types';
import { titleCase } from '../../lib/format';
import { LocationPicker } from './LocationPicker';
import type { ProjectFormState } from './projectFormState';

function Section({ title, first, children }: { title: string; first?: boolean; children: ReactNode }) {
  return (
    <div className={first ? undefined : 'border-t border-gray-100 pt-4'}>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">{title}</h4>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  );
}

/** The one form both "New property" and "Edit property" render — state/helpers in projectFormState.ts. */
export function ProjectFormFields({
  form,
  onChange,
  allowedTypes = PROPERTY_TYPES,
  lockedCategory,
  currentLocation,
}: {
  form: ProjectFormState;
  onChange: (next: ProjectFormState) => void;
  allowedTypes?: PropertyType[];
  /** Add from the Sales/Rent page pins the category so the new listing lands on that page. */
  lockedCategory?: PropertyCategory;
  /** Edit only: the stored display location, shown when no structured province is set yet. */
  currentLocation?: string;
}) {
  const set = (patch: Partial<ProjectFormState>) => onChange({ ...form, ...patch });

  return (
    <>
      <Section title="Basic info" first>
        <div className="space-y-4">
          <FormField label="Name">
            <TextInput className="mt-1" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </FormField>
          <FormField label="Phase">
            <TextInput className="mt-1" value={form.phase} onChange={(e) => set({ phase: e.target.value })} />
          </FormField>
          <FormField label="Listing type">
            <Select
              className="mt-1 w-full"
              value={form.isDevelopment ? 'DEVELOPMENT' : 'PROPERTY'}
              onChange={(e) => set({ isDevelopment: e.target.value === 'DEVELOPMENT' })}
            >
              <option value="DEVELOPMENT">Development project (shown under Projects)</option>
              <option value="PROPERTY">Individual property (shown under Sales / Rent)</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Property type">
              <Select
                className="mt-1 w-full"
                value={form.propertyType}
                onChange={(e) => set({ propertyType: e.target.value as PropertyType })}
              >
                {allowedTypes.map((t) => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Category">
              {lockedCategory ? (
                <TextInput className="mt-1" value={titleCase(lockedCategory)} disabled />
              ) : (
                <Select
                  className="mt-1 w-full"
                  value={form.category}
                  onChange={(e) => set({ category: e.target.value as PropertyCategory })}
                >
                  {PROPERTY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {titleCase(c)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label="Status">
              <Select
                className="mt-1 w-full"
                value={form.status}
                onChange={(e) => set({ status: e.target.value as ProjectStatus })}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>
      </Section>

      <Section title="Location">
        {currentLocation && !form.province && (
          <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Current location: <span className="font-semibold text-gray-800">{currentLocation}</span>. Only pick a
            province below if you want to replace it with a structured address.
          </p>
        )}
        <LocationPicker
          value={{ province: form.province, district: form.district, commune: form.commune, village: form.village }}
          // The picker sends only the levels still valid (e.g. a new province alone), so reset all
          // four explicitly — merging would keep the old province's district/commune/village.
          onChange={(loc) => set({ province: loc.province, district: loc.district, commune: loc.commune, village: loc.village })}
        />
      </Section>

      <Section title="Presentation">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Handover date">
              <TextInput
                type="date"
                className="mt-1"
                value={form.handoverDate}
                onChange={(e) => set({ handoverDate: e.target.value })}
              />
            </FormField>
            <FormField label="Cover color">
              <TextInput
                type="color"
                className="mt-1 h-10"
                value={form.coverColor}
                onChange={(e) => set({ coverColor: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Amenities (comma-separated)">
            <TextInput
              className="mt-1"
              value={form.amenities}
              onChange={(e) => set({ amenities: e.target.value })}
              placeholder="Pool, Gym, 24h Security"
            />
          </FormField>
        </div>
      </Section>

      <Section title="Property facts">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Developer">
            <TextInput className="mt-1" value={form.developer} onChange={(e) => set({ developer: e.target.value })} />
          </FormField>
          <FormField label="Tenure">
            <TextInput
              className="mt-1"
              value={form.tenure}
              onChange={(e) => set({ tenure: e.target.value })}
              placeholder="Freehold"
            />
          </FormField>
          <FormField label="Total floors">
            <TextInput
              type="number"
              min={1}
              className="mt-1"
              value={form.totalFloors}
              onChange={(e) => set({ totalFloors: e.target.value })}
            />
          </FormField>
          <FormField label="Total units (disclosed)">
            <TextInput
              type="number"
              min={1}
              className="mt-1"
              value={form.disclosedUnitCount}
              onChange={(e) => set({ disclosedUnitCount: e.target.value })}
            />
          </FormField>
        </div>
      </Section>

      <Section title="Marketing">
        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--era-navy)]"
              checked={form.isPublished}
              onChange={(e) => set({ isPublished: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-semibold text-gray-800">Published on website</span>
              <span className="block text-xs text-gray-500">
                Unticked = Private: customers can't see it anywhere — not in listings, not by direct link, not in
                the AI chat.
              </span>
            </span>
          </label>
          <FormField label="Listing badge">
            <Select
              className="mt-1 w-full"
              value={form.badge}
              onChange={(e) => set({ badge: e.target.value as ListingBadge })}
            >
              {LISTING_BADGES.map((b) => (
                <option key={b} value={b}>
                  {b === 'NONE' ? 'None' : titleCase(b)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Video link (YouTube, Vimeo, …)">
            <TextInput
              className="mt-1"
              placeholder="https://youtube.com/watch?v=..."
              value={form.videoUrl}
              onChange={(e) => set({ videoUrl: e.target.value })}
            />
          </FormField>
          <FormField label={<>&quot;Starting from&quot; price override (USD)</>}>
            <TextInput
              type="number"
              min={1}
              className="mt-1"
              placeholder="Leave blank to use the cheapest unit's price"
              value={form.startingPriceOverride}
              onChange={(e) => set({ startingPriceOverride: e.target.value })}
            />
          </FormField>
        </div>
      </Section>
    </>
  );
}
