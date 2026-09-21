import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Camera, Video, BedDouble, Bath, Maximize2 } from 'lucide-react';
import { PageHeader, StatCard, StatusBadge, Badge, Drawer, Select, TextInput, Button, DataTable, Toolbar, type Column } from '@era/ui';
import {
  useAddUnitTypeImage,
  useCreateProject,
  useCreateUnitType,
  useDeleteUnitType,
  useProjects,
  useRemoveUnitTypeFloorPlan,
  useRemoveUnitTypeImage,
  useSetUnitTypeFloorPlan,
  useUnitTypes,
  useUpdateUnitType,
  type ProjectFormInput,
} from '../data/inventory';
import { ImageGallery } from '../app/components/ImageGallery';
import { LocationPicker } from '../app/components/LocationPicker';
import { useCan } from '../store/auth';
import { resolveUploadUrl } from '../lib/api';
import { money, pct, date, titleCase } from '../lib/format';
import {
  PROJECT_STATUSES,
  PROPERTY_CATEGORIES,
  PROPERTY_TYPES,
  type PropertyCategory,
  type PropertyType,
  type ProjectStatus,
} from '../data/types';

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
   * Which projects belong in this bucket, beyond type/category — data-driven, not a manual tag.
   * "Projects" means an actual multi-unit developer project (matching eracambodia.com's own use
   * of the word — a Time Square tower, a Le Condé building), regardless of property type or
   * sale/rent; "Sales"/"Rent" means an individual listing (one specific real property), matching
   * how every Pointer Asia listing already works. A project reclassifies automatically the moment
   * its real unit count crosses 1 — no manual re-bucketing needed when data is corrected.
   */
  membership?: (p: { totalUnits: number }) => boolean;
  /**
   * Sales/Rent-only: bed/bath/area spec row, the bedroom filter, single-unit-vs-multi-unit card
   * branching, and "Price"/"Rent" (vs "Starting from") wording. Projects keeps its original
   * always-the-same-card display — that bucket's ask was explicitly "keep the current structure
   * and display information," this per-preset flag is what stops it inheriting Sales/Rent's
   * redesign just because they share one component.
   */
  detailedCards?: boolean;
}

const EMPTY_PROJECT: ProjectFormInput = {
  name: '',
  phase: '',
  status: 'PLANNING',
  category: 'SALE',
  propertyType: 'CONDO',
  amenities: [],
  coverColor: '#001F5B',
};

function NewProjectDrawer({
  open,
  onClose,
  allowedTypes,
  lockedCategory,
}: {
  open: boolean;
  onClose: () => void;
  allowedTypes: PropertyType[];
  lockedCategory?: PropertyCategory;
}) {
  const defaultForm = (): ProjectFormInput => ({
    ...EMPTY_PROJECT,
    propertyType: allowedTypes[0] ?? EMPTY_PROJECT.propertyType,
    category: lockedCategory ?? EMPTY_PROJECT.category,
  });
  const [form, setForm] = useState<ProjectFormInput>(defaultForm);
  const [amenitiesText, setAmenitiesText] = useState('');
  const [handoverDateStr, setHandoverDateStr] = useState('');
  const createProject = useCreateProject();

  const missing = [!form.name.trim() && 'Name', !form.province && 'Province/City'].filter(
    (m): m is string => typeof m === 'string',
  );

  const submit = () => {
    if (missing.length > 0) return;
    createProject.mutate(
      {
        ...form,
        category: lockedCategory ?? form.category,
        handoverDate: handoverDateStr ? new Date(handoverDateStr) : undefined,
        amenities: amenitiesText.split(',').map((s) => s.trim()).filter(Boolean),
      },
      {
        onSuccess: () => {
          onClose();
          setForm(defaultForm());
          setAmenitiesText('');
          setHandoverDateStr('');
        },
      },
    );
  };

  return (
    <Drawer open={open} onClose={onClose} title="New project">
      <div className="space-y-5">
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Basic info</h4>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Name</span>
              <TextInput className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Phase</span>
              <TextInput className="mt-1" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Property type</span>
                <Select
                  className="mt-1 w-full"
                  value={form.propertyType}
                  onChange={(e) => setForm({ ...form, propertyType: e.target.value as PropertyType })}
                >
                  {allowedTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Category</span>
                {lockedCategory ? (
                  <TextInput className="mt-1" value={lockedCategory} disabled />
                ) : (
                  <Select
                    className="mt-1 w-full"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as PropertyCategory })}
                  >
                    {PROPERTY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Status</span>
                <Select
                  className="mt-1 w-full"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Location</h4>
          <LocationPicker
            value={{ province: form.province, district: form.district, commune: form.commune, village: form.village }}
            onChange={(loc) => setForm({ ...form, ...loc })}
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Presentation</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Handover date</span>
                <TextInput
                  type="date"
                  className="mt-1"
                  value={handoverDateStr}
                  onChange={(e) => setHandoverDateStr(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Cover color</span>
                <TextInput type="color" className="mt-1 h-10" value={form.coverColor} onChange={(e) => setForm({ ...form, coverColor: e.target.value })} />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Amenities (comma-separated)</span>
              <TextInput className="mt-1" value={amenitiesText} onChange={(e) => setAmenitiesText(e.target.value)} placeholder="Pool, Gym, 24h Security" />
            </label>
          </div>
        </div>

        {missing.length > 0 && (
          <p className="text-xs text-[var(--era-red)]">Required: {missing.join(', ')}.</p>
        )}
        {createProject.error && <p className="text-xs text-[var(--era-red)]">{createProject.error.message}</p>}
        <Button onClick={submit} disabled={missing.length > 0 || createProject.isPending}>
          Create project
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
  const allRows = (projects ?? []).filter(
    (p) =>
      preset.allowedTypes.includes(p.propertyType) &&
      (!preset.lockedCategory || p.category === preset.lockedCategory) &&
      (!preset.membership || preset.membership(p)),
  );
  const rows = allRows
    .filter((p) => typeFilter === 'ALL' || p.propertyType === typeFilter)
    .filter((p) => {
      if (!preset.detailedCards || bedFilter === 'ALL') return true;
      const min = p.bedroomsRange?.[0];
      if (min == null) return false;
      return bedFilter === '0' ? min === 0 : min >= Number(bedFilter);
    });

  const countByType = (t: PropertyType) => allRows.filter((p) => p.propertyType === t).length;

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
              <Button onClick={() => setCreating(true)}>New project</Button>
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
      </Toolbar>

      <div className={`grid gap-4 ${preset.detailedCards ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-2'}`}>
        {rows.map((p) => (
          <button
            key={p.id}
            onClick={() => nav(`/inventory/${p.id}`)}
            className="overflow-hidden rounded-xl border border-black/5 bg-white text-left shadow-sm transition hover:shadow-md"
          >
            <div className="relative h-32 w-full">
              {p.imageUrls[0] ? (
                <img src={resolveUploadUrl(p.imageUrls[0])} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ background: p.coverColor ?? '#e5e7eb' }}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/80">{p.propertyType}</span>
                </div>
              )}
              {p.badge !== 'NONE' && (
                <span className="absolute left-2 top-2">
                  <Badge tone={p.badge === 'EXCLUSIVE' ? 'red' : 'amber'}>{titleCase(p.badge)}</Badge>
                </span>
              )}
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
                    <div className="text-[11px] uppercase text-gray-400">Units</div>
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
      />
      <UnitTypesDrawer open={managingTypes} onClose={() => setManagingTypes(false)} />
    </div>
  );
}

// "Projects" = an actual multi-unit developer project (a Time Square tower, a Le Condé
// building) — any property type, any category, data-driven by real unit count rather than a
// manual tag. "Sales"/"Rent" = individual listings (exactly one real property), split by
// category — matching how every Pointer Asia listing and every corrected ERA listing works.
const PROJECTS_PRESET: InventoryPreset = {
  title: 'Projects',
  allowedTypes: PROPERTY_TYPES,
  membership: (p) => p.totalUnits > 1,
};
const SALES_PRESET: InventoryPreset = {
  title: 'Sales',
  allowedTypes: PROPERTY_TYPES,
  lockedCategory: 'SALE',
  membership: (p) => p.totalUnits <= 1,
  detailedCards: true,
};
const RENT_PRESET: InventoryPreset = {
  title: 'Rent',
  allowedTypes: PROPERTY_TYPES,
  lockedCategory: 'RENT',
  membership: (p) => p.totalUnits <= 1,
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
