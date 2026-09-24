import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Camera, Video, BedDouble, Bath, Maximize2, Check } from 'lucide-react';
import { PageHeader, StatCard, StatusBadge, Badge, Drawer, Select, TextInput, Button, DataTable, Toolbar, type Column } from '@era/ui';
import {
  useAddUnitTypeImage,
  useCreateProject,
  useCreateUnitType,
  useDeleteUnitType,
  useProjects,
  useSetProjectsPublished,
  useRemoveUnitTypeFloorPlan,
  useRemoveUnitTypeImage,
  useSetUnitTypeFloorPlan,
  useUnitTypes,
  useUpdateUnitType,
} from '../data/inventory';
import { ImageGallery } from '../app/components/ImageGallery';
import { ProjectFormFields } from '../app/components/ProjectForm';
import {
  emptyProjectForm,
  formToProjectInput,
  projectFormMissing,
  type ProjectFormState,
} from '../app/components/projectFormState';
import { useCan } from '../store/auth';
import { resolveUploadUrl } from '../lib/api';
import { money, pct, date, titleCase } from '../lib/format';
import { PROPERTY_TYPES, type PropertyCategory, type PropertyType } from '../data/types';

function formatRange(range: [number, number] | null): string {
  if (!range) return '—';
  return range[0] === range[1] ? `${range[0]}` : `${range[0]}–${range[1]}`;
}

interface InventoryPreset {
  title: string;
  /** Property types visible in this bucket's filter dropdown and shown in its grid. */
  allowedTypes: PropertyType[];
  /** Sales/Rent buckets pin the category so every project created here lands in the right bucket. */
  lockedCategory?: PropertyCategory;
  /**
   * true = "Projects": development projects (a developer's building/estate — a Time Square tower,
   * a Le Condé building), any type or sale/rent. false = "Sales"/"Rent": individual properties.
   * Driven by the admin-set `Project.isDevelopment`, not unit count — real towers often have only
   * one sample unit entered, which the old "more than 1 unit" rule misfiled under Sales.
   */
  development: boolean;
  /**
   * Sales/Rent-only: bed/bath/area spec row, the bedroom filter, single-unit-vs-multi-unit card
   * branching, and "Price"/"Rent" (vs "Starting from") wording. Projects keeps its original
   * always-the-same-card display — that bucket's ask was explicitly "keep the current structure
   * and display information," this per-preset flag is what stops it inheriting Sales/Rent's
   * redesign just because they share one component.
   */
  detailedCards?: boolean;
}

function NewProjectDrawer({
  open,
  onClose,
  allowedTypes,
  lockedCategory,
  isDevelopment,
}: {
  open: boolean;
  onClose: () => void;
  allowedTypes: PropertyType[];
  lockedCategory?: PropertyCategory;
  /** Adding from the Projects page creates a development project; from Sales/Rent, an individual property. */
  isDevelopment: boolean;
}) {
  const nav = useNavigate();
  const defaultForm = () =>
    emptyProjectForm({ propertyType: allowedTypes[0] ?? 'CONDO', category: lockedCategory ?? 'SALE', isDevelopment });
  const [form, setForm] = useState<ProjectFormState>(defaultForm);
  const createProject = useCreateProject();
  const missing = projectFormMissing(form, false);

  const submit = () => {
    if (missing.length > 0) return;
    createProject.mutate(
      { ...formToProjectInput(form), category: lockedCategory ?? form.category },
      {
        // Photos, units and the site plan can only be added once the property exists — go straight
        // there instead of leaving the admin to find it in a list of hundreds.
        onSuccess: (created) => {
          setForm(defaultForm());
          onClose();
          nav(`/inventory/${created.id}`);
        },
      },
    );
  };

  return (
    <Drawer open={open} onClose={onClose} title="New property">
      <div className="space-y-5">
        <ProjectFormFields form={form} onChange={setForm} allowedTypes={allowedTypes} lockedCategory={lockedCategory} />
        {missing.length > 0 && <p className="text-xs text-[var(--era-red)]">Required: {missing.join(', ')}.</p>}
        {createProject.error && <p className="text-xs text-[var(--era-red)]">{createProject.error.message}</p>}
        <Button onClick={submit} disabled={missing.length > 0 || createProject.isPending}>
          Create property
        </Button>
      </div>
    </Drawer>
  );
}

type UnitType = NonNullable<ReturnType<typeof useUnitTypes>['data']>[number];

function UnitTypesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: unitTypes } = useUnitTypes();
  const createUnitType = useCreateUnitType();
  const updateUnitType = useUpdateUnitType();
  const deleteUnitType = useDeleteUnitType();
  const addUnitTypeImage = useAddUnitTypeImage();
  const removeUnitTypeImage = useRemoveUnitTypeImage();
  const setUnitTypeFloorPlan = useSetUnitTypeFloorPlan();
  const removeUnitTypeFloorPlan = useRemoveUnitTypeFloorPlan();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', bedrooms: 0, bathrooms: 0, areaSqm: 0, description: '' });

  const rows = unitTypes ?? [];
  // Derived live (not a snapshot) so its image gallery reflects uploads/removals immediately.
  const editing = editingId ? (rows.find((t) => t.id === editingId) ?? null) : null;

  const startCreate = () => {
    setEditingId(null);
    setForm({ name: '', bedrooms: 0, bathrooms: 0, areaSqm: 0, description: '' });
  };
  const startEdit = (t: UnitType) => {
    setEditingId(t.id);
    setForm({ name: t.name, bedrooms: t.bedrooms, bathrooms: t.bathrooms, areaSqm: t.areaSqm, description: t.description ?? '' });
  };

  const submit = () => {
    if (editing) {
      updateUnitType.mutate({ id: editing.id, ...form }, { onSuccess: startCreate });
    } else {
      createUnitType.mutate(form, { onSuccess: startCreate });
    }
  };

  const columns: Column<UnitType>[] = [
    { key: 'name', header: 'Name', render: (t) => <span className="font-semibold text-[var(--era-navy)]">{t.name}</span> },
    { key: 'layout', header: 'Layout', render: (t) => `${t.bedrooms} bed · ${t.bathrooms} bath` },
    { key: 'area', header: 'Area', align: 'right', render: (t) => `${t.areaSqm} m²` },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: (t) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => deleteUnitType.mutate(t.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="Manage unit types">
      <div className="space-y-5">
        <DataTable columns={columns} rows={rows} empty="No unit types yet." />
        <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-bold text-[var(--era-navy)]">{editing ? `Edit ${editing.name}` : 'New unit type'}</h4>
          <div className="space-y-3">
            <TextInput placeholder="Name (e.g. 2 Bedroom)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <TextInput
                type="number"
                placeholder="Bedrooms"
                value={form.bedrooms}
                onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })}
              />
              <TextInput
                type="number"
                placeholder="Bathrooms"
                value={form.bathrooms}
                onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })}
              />
              <TextInput
                type="number"
                placeholder="Area (m²)"
                value={form.areaSqm}
                onChange={(e) => setForm({ ...form, areaSqm: Number(e.target.value) })}
              />
            </div>
            <TextInput placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {editing && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">Photos</label>
                <ImageGallery
                  images={editing.imageUrls}
                  canWrite
                  onUpload={(dataUrl) => addUnitTypeImage.mutate({ unitTypeId: editing.id, dataUrl })}
                  onRemove={(url) => removeUnitTypeImage.mutate({ unitTypeId: editing.id, url })}
                />
              </div>
            )}
            {editing && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                  Floor plan drawing (used on quotation PDFs)
                </label>
                <ImageGallery
                  images={editing.floorPlanUrl ? [editing.floorPlanUrl] : []}
                  canWrite={!editing.floorPlanUrl}
                  onUpload={(dataUrl) => setUnitTypeFloorPlan.mutate({ unitTypeId: editing.id, dataUrl })}
                  onRemove={() => removeUnitTypeFloorPlan.mutate(editing.id)}
                  emptyHint="No floor plan yet."
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={submit} disabled={!form.name}>
                {editing ? 'Save changes' : 'Add unit type'}
              </Button>
              {editing && (
                <Button size="sm" variant="outline" onClick={startCreate}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function InventoryListPage({ preset }: { preset: InventoryPreset }) {
  const nav = useNavigate();
  const canWrite = useCan('inventory:write');
  const { data: projects } = useProjects();
  const [creating, setCreating] = useState(false);
  const [managingTypes, setManagingTypes] = useState(false);
  const [typeFilter, setTypeFilter] = useState<PropertyType | 'ALL'>('ALL');
  const [bedFilter, setBedFilter] = useState<'ALL' | '0' | '1' | '2' | '3' | '4'>('ALL');
  const [websiteFilter, setWebsiteFilter] = useState<'ALL' | 'LIVE' | 'DRAFT'>('ALL');
  // Bulk Publish / Make private: while selecting, clicking a card toggles it instead of opening it.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const setPublished = useSetProjectsPublished();
  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  const applyPublished = (isPublished: boolean) =>
    setPublished.mutate({ ids: [...selected], isPublished }, { onSuccess: stopSelecting });
  const allRows = (projects ?? []).filter(
    (p) =>
      preset.allowedTypes.includes(p.propertyType) &&
      (!preset.lockedCategory || p.category === preset.lockedCategory) &&
      p.isDevelopment === preset.development,
  );
  const rows = allRows
    .filter((p) => typeFilter === 'ALL' || p.propertyType === typeFilter)
    .filter((p) => websiteFilter === 'ALL' || p.isPublished === (websiteFilter === 'LIVE'))
    .filter((p) => {
      if (!preset.detailedCards || bedFilter === 'ALL') return true;
      const min = p.bedroomsRange?.[0];
      if (min == null) return false;
      return bedFilter === '0' ? min === 0 : min >= Number(bedFilter);
    });

  const countByType = (t: PropertyType) => allRows.filter((p) => p.propertyType === t).length;
  const liveCount = allRows.filter((p) => p.isPublished).length;

  const totals = rows.reduce(
    (a, p) => {
      a.units += p.totalUnits;
      a.available += p.available;
      a.gdv += p.gdv;
      a.soldValue += p.soldValue;
      return a;
    },
    { units: 0, available: 0, gdv: 0, soldValue: 0 },
  );

  return (
    <div>
      <PageHeader
        title={preset.title}
        subtitle={`${rows.length} projects · ${totals.units} units`}
        actions={
          canWrite && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setManagingTypes(true)}>
                Manage unit types
              </Button>
              <Button onClick={() => setCreating(true)}>New property</Button>
            </div>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total GDV" value={money(totals.gdv, { compact: true })} />
        <StatCard label="Sold value" value={money(totals.soldValue, { compact: true })} tone="green" />
        <StatCard label="Available units" value={totals.available} />
        <StatCard
          label="Absorption"
          value={pct(totals.units ? ((totals.units - totals.available) / totals.units) * 100 : 0)}
          tone="amber"
        />
      </div>

      <Toolbar>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as PropertyType | 'ALL')}>
          <option value="ALL">All types ({allRows.length})</option>
          {preset.allowedTypes.map((t) => (
            <option key={t} value={t}>
              {titleCase(t)} ({countByType(t)})
            </option>
          ))}
        </Select>
        <Select value={websiteFilter} onChange={(e) => setWebsiteFilter(e.target.value as typeof websiteFilter)}>
          <option value="ALL">Website: all</option>
          <option value="LIVE">Published ({liveCount})</option>
          <option value="DRAFT">Private ({allRows.length - liveCount})</option>
        </Select>
        {preset.detailedCards && (
          <Select value={bedFilter} onChange={(e) => setBedFilter(e.target.value as typeof bedFilter)}>
            <option value="ALL">Any beds</option>
            <option value="0">Studio</option>
            <option value="1">1+ bed</option>
            <option value="2">2+ beds</option>
            <option value="3">3+ beds</option>
            <option value="4">4+ beds</option>
          </Select>
        )}
        <span className="text-sm text-gray-400">{rows.length} shown</span>
        {canWrite && !selecting && (
          <Button size="sm" variant="outline" onClick={() => setSelecting(true)}>
            Select to publish / make private
          </Button>
        )}
      </Toolbar>

      {selecting && (
        <div className="sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--era-navy)]/20 bg-white p-3 shadow-md">
          <span className="text-sm font-semibold text-[var(--era-navy)]">{selected.size} selected</span>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(rows.map((p) => p.id)))}>
            Select all shown ({rows.length})
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
            Clear
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {setPublished.error && <span className="text-xs text-[var(--era-red)]">{setPublished.error.message}</span>}
            <Button size="sm" onClick={() => applyPublished(true)} disabled={selected.size === 0 || setPublished.isPending}>
              Publish
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPublished(false)}
              disabled={selected.size === 0 || setPublished.isPending}
            >
              Make private
            </Button>
            <Button size="sm" variant="ghost" onClick={stopSelecting}>
              Done
            </Button>
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${preset.detailedCards ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-2'}`}>
        {rows.map((p) => (
          <button
            key={p.id}
            onClick={() => (selecting ? toggleSelected(p.id) : nav(`/inventory/${p.id}`))}
            aria-pressed={selecting ? selected.has(p.id) : undefined}
            className={`overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md ${
              selecting && selected.has(p.id) ? 'border-[var(--era-navy)] ring-2 ring-[var(--era-navy)]' : 'border-black/5'
            }`}
          >
            <div className="relative h-32 w-full">
              {selecting && (
                <span
                  className={`absolute bottom-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 ${
                    selected.has(p.id) ? 'border-[var(--era-navy)] bg-[var(--era-navy)] text-white' : 'border-white bg-white/80'
                  }`}
                >
                  {selected.has(p.id) && <Check className="h-4 w-4" />}
                </span>
              )}
              {p.imageUrls[0] ? (
                <img src={resolveUploadUrl(p.imageUrls[0])} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ background: p.coverColor ?? '#e5e7eb' }}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/80">{p.propertyType}</span>
                </div>
              )}
              <span className="absolute left-2 top-2 flex gap-1">
                {p.isPublished ? <Badge tone="green">Published</Badge> : <Badge tone="slate">Private</Badge>}
                {p.badge !== 'NONE' && <Badge tone={p.badge === 'EXCLUSIVE' ? 'red' : 'amber'}>{titleCase(p.badge)}</Badge>}
              </span>
              {(p.imageUrls.length > 0 || p.videoUrl) && (
                <span className="absolute right-2 top-2 flex items-center gap-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                  {p.imageUrls.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Camera className="h-3 w-3" /> {p.imageUrls.length}
                    </span>
                  )}
                  {p.videoUrl && (
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" /> 1
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-[var(--era-navy)]">{p.name}</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {[p.location, p.phase].filter(Boolean).join(' · ')}
                </p>
                {p.startingPrice != null && (
                  <p className="mt-1 text-xs text-gray-400">
                    {!preset.detailedCards || p.totalUnits > 1 ? 'Starting from' : p.category === 'RENT' ? 'Rent' : 'Price'}{' '}
                    <span className="font-semibold text-[var(--era-navy)]">
                      {money(p.startingPrice, { compact: true })}
                      {preset.detailedCards && p.category === 'RENT' && p.totalUnits <= 1 ? '/mo' : ''}
                    </span>
                  </p>
                )}
                {preset.development && (
                  <p className="mt-1 text-xs text-gray-500">
                    {[
                      p.disclosedUnitCount != null ? `${p.disclosedUnitCount.toLocaleString()} units in building` : null,
                      p.totalFloors != null ? `${p.totalFloors} floors` : null,
                      p.developer,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge value={p.status} />
                <span className="text-[10px] uppercase tracking-wide text-gray-400">
                  {p.propertyType} · {p.category}
                </span>
              </div>
            </div>

            {preset.detailedCards && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                {p.propertyType !== 'LAND' && p.bedroomsRange && (
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5" /> {formatRange(p.bedroomsRange)} bed
                  </span>
                )}
                {p.propertyType !== 'LAND' && p.bathroomsRange && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-3.5 w-3.5" /> {formatRange(p.bathroomsRange)} bath
                  </span>
                )}
                {p.areaRange && (
                  <span className="flex items-center gap-1">
                    <Maximize2 className="h-3.5 w-3.5" /> {formatRange(p.areaRange)} m²
                  </span>
                )}
              </div>
            )}

            {!preset.detailedCards || p.totalUnits > 1 ? (
              <>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-[var(--era-navy)]">{p.totalUnits}</div>
                    <div className="text-[11px] uppercase text-gray-400">Listed</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-600">{p.available}</div>
                    <div className="text-[11px] uppercase text-gray-400">Available</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-600">{p.reserved}</div>
                    <div className="text-[11px] uppercase text-gray-400">Reserved</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[var(--era-red)]">{p.sold}</div>
                    <div className="text-[11px] uppercase text-gray-400">Sold</div>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-[var(--era-navy)]" style={{ width: `${p.absorption}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>{pct(p.absorption)} absorbed</span>
                  <span>Handover {date(p.handoverDate)}</span>
                </div>
              </>
            ) : (
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
                <span
                  className={
                    p.available
                      ? 'font-semibold text-emerald-600'
                      : p.reserved
                        ? 'font-semibold text-amber-600'
                        : p.sold
                          ? 'font-semibold text-[var(--era-red)]'
                          : 'font-semibold text-gray-400'
                  }
                >
                  {p.available ? 'Available' : p.reserved ? 'Reserved' : p.sold ? 'Sold' : '—'}
                </span>
                {p.handoverDate && <span className="text-gray-500">Handover {date(p.handoverDate)}</span>}
              </div>
            )}
            </div>
          </button>
        ))}
      </div>

      <NewProjectDrawer
        open={creating}
        onClose={() => setCreating(false)}
        allowedTypes={preset.allowedTypes}
        lockedCategory={preset.lockedCategory}
        isDevelopment={preset.development}
      />
      <UnitTypesDrawer open={managingTypes} onClose={() => setManagingTypes(false)} />
    </div>
  );
}

const PROJECTS_PRESET: InventoryPreset = {
  title: 'Projects',
  allowedTypes: PROPERTY_TYPES,
  development: true,
};
const SALES_PRESET: InventoryPreset = {
  title: 'Sales',
  allowedTypes: PROPERTY_TYPES,
  lockedCategory: 'SALE',
  development: false,
  detailedCards: true,
};
const RENT_PRESET: InventoryPreset = {
  title: 'Rent',
  allowedTypes: PROPERTY_TYPES,
  lockedCategory: 'RENT',
  development: false,
  detailedCards: true,
};

export function ProjectsInventoryPage() {
  return <InventoryListPage preset={PROJECTS_PRESET} />;
}

export function SalesInventoryPage() {
  return <InventoryListPage preset={SALES_PRESET} />;
}

export function RentInventoryPage() {
  return <InventoryListPage preset={RENT_PRESET} />;
}
