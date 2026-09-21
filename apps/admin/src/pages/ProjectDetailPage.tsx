import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import {
  Star,
  Calendar,
  Activity,
  TrendingDown,
  TrendingUp,
  FileText,
  BookMarked,
  FileSignature,
  Building2,
  ShieldCheck,
  Layers,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  PageHeader,
  StatCard,
  Tabs,
  DataTable,
  Drawer,
  Field,
  FieldGrid,
  StatusBadge,
  Badge,
  Select,
  TextInput,
  Toolbar,
  Button,
  type Column,
} from '@era/ui';
import {
  useActivatePriceList,
  useAddProjectImage,
  useBulkCreateUnits,
  useCreateBlock,
  useCreatePriceList,
  useCreateUnit,
  useDeleteBlock,
  useDeletePriceList,
  useDeleteUnit,
  useProject,
  useProjects,
  useRemoveProjectImage,
  useRemoveProjectSitePlan,
  useSetProjectSitePlan,
  useUnitTypes,
  useUpdateBlock,
  useUpdatePriceList,
  useUpdateProject,
  useUpdateUnit,
  type ProjectFormInput,
  type UnitFormInput,
} from '../data/inventory';
import { useQuotations, useReservations, useContracts } from '../data/sales';
import { useContacts, contactLabel } from '../data/crm';
import { ImageGallery } from '../app/components/ImageGallery';
import { LocationPicker } from '../app/components/LocationPicker';
import { useCan } from '../store/auth';
import { resolveUploadUrl } from '../lib/api';
import { money, pct, date, titleCase } from '../lib/format';
import {
  LISTING_BADGES,
  PROJECT_STATUSES,
  PROPERTY_CATEGORIES,
  PROPERTY_TYPES,
  UNIT_STATUSES,
  type ListingBadge,
  type PropertyCategory,
  type PropertyType,
  type ProjectStatus,
  type UnitStatus,
} from '../data/types';

type ProjectData = NonNullable<ReturnType<typeof useProject>['data']>;
type UnitRow = ProjectData['units'][number];
type BlockRow = ProjectData['blocks'][number];
type PriceListRow = ProjectData['priceLists'][number];
type UnitTypeRow = NonNullable<ReturnType<typeof useUnitTypes>['data']>[number];

/** One glanceable stat/fact tile — replaces the old divider-separated flex rows
 * with a consistent, wrapping grid so the header info never looks cramped. */
function Fact({
  icon: Icon,
  label,
  value,
  tone = 'bg-[var(--era-navy)]/10 text-[var(--era-navy)]',
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-white p-4 shadow-sm">
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</div>
        <div className="truncate text-sm font-semibold text-gray-800">{value}</div>
      </div>
    </div>
  );
}

/* ── Edit project ── */

function EditProjectDrawer({ project, open, onClose }: { project: ProjectData; open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<ProjectFormInput>({
    name: project.name,
    province: project.province ?? undefined,
    district: project.district ?? undefined,
    commune: project.commune ?? undefined,
    village: project.village ?? undefined,
    phase: project.phase ?? '',
    status: project.status,
    category: project.category,
    propertyType: project.propertyType,
    coverColor: project.coverColor ?? '#001F5B',
    badge: project.badge,
    videoUrl: project.videoUrl ?? '',
    startingPriceOverride: project.startingPriceOverride ?? undefined,
    developer: project.developer ?? '',
    tenure: project.tenure ?? '',
    totalFloors: project.totalFloors ?? undefined,
    disclosedUnitCount: project.disclosedUnitCount ?? undefined,
  });
  const [amenitiesText, setAmenitiesText] = useState(project.amenities.join(', '));
  const [handoverDateStr, setHandoverDateStr] = useState(project.handoverDate ? project.handoverDate.slice(0, 10) : '');
  const updateProject = useUpdateProject();

  const missing = [!form.name.trim() && 'Name'].filter((m): m is string => typeof m === 'string');

  const submit = () => {
    if (missing.length > 0) return;
    updateProject.mutate(
      {
        id: project.id,
        ...form,
        videoUrl: form.videoUrl || undefined,
        handoverDate: handoverDateStr ? new Date(handoverDateStr) : undefined,
        amenities: amenitiesText.split(',').map((s) => s.trim()).filter(Boolean),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Edit ${project.name}`}>
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
                <Select className="mt-1 w-full" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value as PropertyType })}>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Category</span>
                <Select className="mt-1 w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PropertyCategory })}>
                  {PROPERTY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Status</span>
                <Select className="mt-1 w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
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
              <TextInput className="mt-1" value={amenitiesText} onChange={(e) => setAmenitiesText(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Project facts</h4>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Developer</span>
              <TextInput className="mt-1" value={form.developer} onChange={(e) => setForm({ ...form, developer: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Tenure</span>
              <TextInput className="mt-1" value={form.tenure} onChange={(e) => setForm({ ...form, tenure: e.target.value })} placeholder="Freehold" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Total floors</span>
              <TextInput
                type="number"
                className="mt-1"
                value={form.totalFloors ?? ''}
                onChange={(e) => setForm({ ...form, totalFloors: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Total units (disclosed)</span>
              <TextInput
                type="number"
                className="mt-1"
                value={form.disclosedUnitCount ?? ''}
                onChange={(e) => setForm({ ...form, disclosedUnitCount: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Marketing</h4>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Listing badge</span>
              <Select className="mt-1 w-full" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value as ListingBadge })}>
                {LISTING_BADGES.map((b) => (
                  <option key={b} value={b}>
                    {b === 'NONE' ? 'None' : titleCase(b)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Video link (YouTube, Vimeo, …)</span>
              <TextInput
                className="mt-1"
                placeholder="https://youtube.com/watch?v=..."
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                &quot;Starting from&quot; price override (USD)
              </span>
              <TextInput
                type="number"
                className="mt-1"
                placeholder="Leave blank to use the cheapest unit's price automatically"
                value={form.startingPriceOverride ?? ''}
                onChange={(e) => setForm({ ...form, startingPriceOverride: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
          </div>
        </div>

        {missing.length > 0 && <p className="text-xs text-[var(--era-red)]">Required: {missing.join(', ')}.</p>}
        {updateProject.error && <p className="text-xs text-[var(--era-red)]">{updateProject.error.message}</p>}
        <Button onClick={submit} disabled={missing.length > 0 || updateProject.isPending}>
          Save changes
        </Button>
      </div>
    </Drawer>
  );
}

/* ── Unit form (shared shape for add / bulk-add / edit) ── */

interface UnitFormState {
  code: string;
  blockId: string;
  unitTypeId: string;
  floor: string;
  areaSqm: string;
  netAreaSqm: string;
  view: string;
  orientation: string;
  parking: string;
  listPrice: string;
  status: UnitStatus;
  featured: boolean;
}

const EMPTY_UNIT_FORM: UnitFormState = {
  code: '',
  blockId: '',
  unitTypeId: '',
  floor: '',
  areaSqm: '',
  netAreaSqm: '',
  view: '',
  orientation: '',
  parking: '0',
  listPrice: '',
  status: 'AVAILABLE',
  featured: false,
};

function unitFormToInput(form: UnitFormState): UnitFormInput {
  return {
    code: form.code,
    blockId: form.blockId || undefined,
    unitTypeId: form.unitTypeId || undefined,
    floor: form.floor ? Number(form.floor) : undefined,
    areaSqm: form.areaSqm ? Number(form.areaSqm) : undefined,
    netAreaSqm: form.netAreaSqm ? Number(form.netAreaSqm) : undefined,
    view: form.view || undefined,
    orientation: form.orientation || undefined,
    parking: form.parking ? Number(form.parking) : undefined,
    listPrice: Number(form.listPrice),
    status: form.status,
    featured: form.featured,
  };
}

function UnitFields({
  form,
  setForm,
  blocks,
  unitTypes,
}: {
  form: UnitFormState;
  setForm: (f: UnitFormState) => void;
  blocks: BlockRow[];
  unitTypes: UnitTypeRow[];
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <TextInput placeholder="Unit code (e.g. A-0101)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <TextInput type="number" placeholder="Floor" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select value={form.blockId} onChange={(e) => setForm({ ...form, blockId: e.target.value })}>
          <option value="">No block</option>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select value={form.unitTypeId} onChange={(e) => setForm({ ...form, unitTypeId: e.target.value })}>
          <option value="">No type</option>
          {unitTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          type="number"
          placeholder="Gross area (m²)"
          value={form.areaSqm}
          onChange={(e) => setForm({ ...form, areaSqm: e.target.value })}
        />
        <TextInput
          type="number"
          placeholder="Net area (m²)"
          value={form.netAreaSqm}
          onChange={(e) => setForm({ ...form, netAreaSqm: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextInput placeholder="View" value={form.view} onChange={(e) => setForm({ ...form, view: e.target.value })} />
        <TextInput placeholder="Orientation" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextInput type="number" placeholder="Parking spots" value={form.parking} onChange={(e) => setForm({ ...form, parking: e.target.value })} />
        <TextInput type="number" placeholder="List price (USD)" value={form.listPrice} onChange={(e) => setForm({ ...form, listPrice: e.target.value })} />
      </div>
      <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as UnitStatus })}>
        {UNIT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {titleCase(s)}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => setForm({ ...form, featured: e.target.checked })}
        />
        Feature this unit (e.g. a curated "Serviced Apartments for Rent" homepage rail)
      </label>
    </div>
  );
}

function AddUnitDrawer({
  projectId,
  blocks,
  unitTypes,
  open,
  onClose,
}: {
  projectId: string;
  blocks: BlockRow[];
  unitTypes: UnitTypeRow[];
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY_UNIT_FORM);
  const createUnit = useCreateUnit();

  const submit = () => {
    createUnit.mutate(
      { projectId, ...unitFormToInput(form) },
      { onSuccess: () => { onClose(); setForm(EMPTY_UNIT_FORM); } },
    );
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add unit">
      <div className="space-y-4">
        <UnitFields form={form} setForm={setForm} blocks={blocks} unitTypes={unitTypes} />
        <Button onClick={submit} disabled={!form.code || !form.listPrice || createUnit.isPending}>
          Add unit
        </Button>
      </div>
    </Drawer>
  );
}

function BulkAddUnitsDrawer({
  projectId,
  blocks,
  unitTypes,
  open,
  onClose,
}: {
  projectId: string;
  blocks: BlockRow[];
  unitTypes: UnitTypeRow[];
  open: boolean;
  onClose: () => void;
}) {
  const [prefix, setPrefix] = useState('');
  const [floorFrom, setFloorFrom] = useState('1');
  const [floorTo, setFloorTo] = useState('1');
  const [unitsPerFloor, setUnitsPerFloor] = useState('4');
  const [blockId, setBlockId] = useState('');
  const [unitTypeId, setUnitTypeId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const bulkCreate = useBulkCreateUnits();

  const preview = useMemo(() => {
    const from = Number(floorFrom);
    const to = Number(floorTo);
    const perFloor = Number(unitsPerFloor);
    if (!prefix || !from || !to || !perFloor || from > to) return [];
    const units: UnitFormInput[] = [];
    for (let floor = from; floor <= to; floor++) {
      for (let n = 1; n <= perFloor; n++) {
        units.push({
          code: `${prefix}-${floor}${String(n).padStart(2, '0')}`,
          floor,
          blockId: blockId || undefined,
          unitTypeId: unitTypeId || undefined,
          listPrice: Number(listPrice) || 0,
        });
      }
    }
    return units;
  }, [prefix, floorFrom, floorTo, unitsPerFloor, blockId, unitTypeId, listPrice]);

  const submit = () => {
    bulkCreate.mutate(
      { projectId, units: preview },
      {
        onSuccess: () => {
          onClose();
          setPrefix('');
          setListPrice('');
        },
      },
    );
  };

  return (
    <Drawer open={open} onClose={onClose} title="Bulk add units">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Generates units across a floor range — codes look like "A-0501".</p>
        <TextInput placeholder="Code prefix (e.g. A)" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
        <div className="grid grid-cols-3 gap-3">
          <TextInput type="number" placeholder="Floor from" value={floorFrom} onChange={(e) => setFloorFrom(e.target.value)} />
          <TextInput type="number" placeholder="Floor to" value={floorTo} onChange={(e) => setFloorTo(e.target.value)} />
          <TextInput type="number" placeholder="Units / floor" value={unitsPerFloor} onChange={(e) => setUnitsPerFloor(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            <option value="">No block</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select value={unitTypeId} onChange={(e) => setUnitTypeId(e.target.value)}>
            <option value="">No type</option>
            {unitTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <TextInput type="number" placeholder="List price for every generated unit (USD)" value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
        <p className="text-sm font-semibold text-[var(--era-navy)]">{preview.length} units will be created</p>
        <Button onClick={submit} disabled={preview.length === 0 || !listPrice || bulkCreate.isPending}>
          Create {preview.length || ''} units
        </Button>
      </div>
    </Drawer>
  );
}

function UnitDetailDrawer({
  unit,
  projectId,
  projectName,
  blocks,
  unitTypes,
  canWrite,
  onClose,
}: {
  unit: UnitRow | null;
  projectId: string;
  projectName: string;
  blocks: BlockRow[];
  unitTypes: UnitTypeRow[];
  canWrite: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UnitFormState>(EMPTY_UNIT_FORM);
  const [lastUnitId, setLastUnitId] = useState<string | null>(null);
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();

  if (!unit && lastUnitId !== null) {
    // Drawer closed (possibly without saving) — force a fresh re-sync next open.
    setLastUnitId(null);
  }

  if (unit && unit.id !== lastUnitId) {
    setLastUnitId(unit.id);
    setForm({
      code: unit.code,
      blockId: unit.blockId ?? '',
      unitTypeId: unit.unitTypeId ?? '',
      floor: unit.floor?.toString() ?? '',
      areaSqm: unit.areaSqm?.toString() ?? '',
      netAreaSqm: unit.netAreaSqm?.toString() ?? '',
      view: unit.view ?? '',
      orientation: unit.orientation ?? '',
      parking: unit.parking.toString(),
      listPrice: unit.listPrice.toString(),
      status: unit.status,
      featured: unit.featured,
    });
  }

  const deletable = unit ? ['AVAILABLE', 'BLOCKED'].includes(unit.status) : false;
  const missing = [!form.code.trim() && 'Unit code', !form.listPrice && 'List price'].filter(
    (m): m is string => typeof m === 'string',
  );

  const submit = () => {
    if (!unit || missing.length > 0) return;
    updateUnit.mutate({ id: unit.id, projectId, ...unitFormToInput(form) }, { onSuccess: onClose });
  };

  return (
    <Drawer open={!!unit} onClose={onClose} title={unit ? `${projectName} · ${unit.code}` : ''}>
      {unit && (
        <div className="space-y-5">
          {canWrite ? (
            <>
              <UnitFields form={form} setForm={setForm} blocks={blocks} unitTypes={unitTypes} />
              {missing.length > 0 && <p className="text-xs text-[var(--era-red)]">Required: {missing.join(', ')}.</p>}
              {updateUnit.error && <p className="text-xs text-[var(--era-red)]">{updateUnit.error.message}</p>}
              <div className="flex items-center gap-2">
                <Button onClick={submit} disabled={missing.length > 0 || updateUnit.isPending}>
                  Save changes
                </Button>
                <Button
                  variant="outline"
                  disabled={!deletable || deleteUnit.isPending}
                  onClick={() => deleteUnit.mutate({ id: unit.id, projectId }, { onSuccess: onClose })}
                >
                  Delete
                </Button>
              </div>
              {!deletable && <p className="text-xs text-gray-400">Only available or blocked units can be deleted.</p>}
            </>
          ) : (
            <FieldGrid>
              <Field label="Status"><StatusBadge value={unit.status} /></Field>
              <Field label="Type">{unit.unitType?.name}</Field>
              <Field label="Gross area">{unit.areaSqm != null ? `${unit.areaSqm} m²` : '—'}</Field>
              <Field label="Net area">{unit.netAreaSqm != null ? `${unit.netAreaSqm} m²` : '—'}</Field>
              <Field label="Floor">{unit.floor}</Field>
              <Field label="View">{unit.view}</Field>
              <Field label="List price">{money(unit.listPrice)}</Field>
            </FieldGrid>
          )}
        </div>
      )}
    </Drawer>
  );
}

/* ── Blocks ── */

function BlockFormDrawer({
  projectId,
  block,
  open,
  onClose,
}: {
  projectId: string;
  block: BlockRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(block?.name ?? '');
  const [floors, setFloors] = useState(block?.floors.toString() ?? '');
  const createBlock = useCreateBlock();
  const updateBlock = useUpdateBlock();

  const submit = () => {
    const data = { name, floors: Number(floors) };
    if (block) {
      updateBlock.mutate({ id: block.id, projectId, ...data }, { onSuccess: onClose });
    } else {
      createBlock.mutate({ projectId, ...data }, { onSuccess: () => { onClose(); setName(''); setFloors(''); } });
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={block ? `Edit ${block.name}` : 'New block'}>
      <div className="space-y-4">
        <TextInput placeholder="Block name (e.g. Block A)" value={name} onChange={(e) => setName(e.target.value)} />
        <TextInput type="number" placeholder="Floors" value={floors} onChange={(e) => setFloors(e.target.value)} />
        <Button onClick={submit} disabled={!name || !floors}>
          {block ? 'Save changes' : 'Add block'}
        </Button>
      </div>
    </Drawer>
  );
}

/* ── Price lists ── */

function PriceListFormDrawer({
  projectId,
  priceList,
  open,
  onClose,
}: {
  projectId: string;
  priceList: PriceListRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(priceList?.name ?? '');
  const [psf, setPsf] = useState(priceList?.psf.toString() ?? '');
  const [floorPremiumPct, setFloorPremiumPct] = useState(priceList ? (priceList.floorPremiumPct * 100).toString() : '0');
  const [viewPremiumUsd, setViewPremiumUsd] = useState(priceList?.viewPremiumUsd.toString() ?? '0');
  const createPriceList = useCreatePriceList();
  const updatePriceList = useUpdatePriceList();

  const submit = () => {
    const data = {
      name,
      psf: Number(psf),
      floorPremiumPct: Number(floorPremiumPct) / 100,
      viewPremiumUsd: Number(viewPremiumUsd),
    };
    if (priceList) {
      updatePriceList.mutate({ id: priceList.id, projectId, ...data }, { onSuccess: onClose });
    } else {
      createPriceList.mutate(
        { projectId, ...data },
        { onSuccess: () => { onClose(); setName(''); setPsf(''); } },
      );
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={priceList ? `Edit ${priceList.name}` : 'New price list'}>
      <div className="space-y-4">
        <TextInput placeholder="Name (e.g. Launch pricing)" value={name} onChange={(e) => setName(e.target.value)} />
        <TextInput type="number" placeholder="Price per m² (USD)" value={psf} onChange={(e) => setPsf(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextInput type="number" placeholder="Floor premium (%)" value={floorPremiumPct} onChange={(e) => setFloorPremiumPct(e.target.value)} />
          <TextInput type="number" placeholder="View premium (USD)" value={viewPremiumUsd} onChange={(e) => setViewPremiumUsd(e.target.value)} />
        </div>
        <Button onClick={submit} disabled={!name || !psf}>
          {priceList ? 'Save changes' : 'Add price list'}
        </Button>
      </div>
    </Drawer>
  );
}

/* ── Page ── */

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Prefer real browser "back" so we return to whichever bucket (Projects/Sales/Rent) the user
  // actually came from, with their filters/scroll position intact — falling back to the Sales
  // list only when there's no in-app history to go back to (e.g. a direct link or a fresh tab).
  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/inventory/sales');
  };
  const { data: project } = useProject(id);
  const { data: unitTypes } = useUnitTypes();
  const { data: allProjectsList } = useProjects();
  const { data: quotations } = useQuotations();
  const { data: reservations } = useReservations();
  const { data: contracts } = useContracts();
  const { data: contacts } = useContacts();
  const canWrite = useCan('inventory:write');
  const activatePriceList = useActivatePriceList();
  const deleteBlock = useDeleteBlock();
  const deletePriceList = useDeletePriceList();
  const addProjectImage = useAddProjectImage();
  const removeProjectImage = useRemoveProjectImage();
  const setSitePlan = useSetProjectSitePlan();
  const removeSitePlan = useRemoveProjectSitePlan();

  const [tab, setTab] = useState('units');
  const [block, setBlock] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BlockRow | null | 'new'>(null);
  const [editingPriceList, setEditingPriceList] = useState<PriceListRow | null | 'new'>(null);

  const blocks = project?.blocks ?? [];
  const priceLists = project?.priceLists ?? [];
  const allUnitTypes = unitTypes ?? [];
  const allUnits = useMemo(() => project?.units ?? [], [project]);
  const units = allUnits.filter(
    (u) => (block === 'ALL' || u.blockId === block) && (status === 'ALL' || u.status === status),
  );

  const total = allUnits.length;
  const available = allUnits.filter((u) => u.status === 'AVAILABLE').length;
  const reserved = allUnits.filter((u) => ['RESERVED', 'HELD', 'BOOKED'].includes(u.status)).length;
  const sold = allUnits.filter((u) => ['SOLD', 'CONTRACTED', 'HANDED_OVER'].includes(u.status)).length;
  const gdv = allUnits.reduce((a, u) => a + u.listPrice, 0);
  const absorption = total ? ((sold + reserved) / total) * 100 : 0;

  /* ── Comparable listings (same type + category, ranked by city/location/price closeness) ── */
  const comps = useMemo(() => {
    if (!project || !allProjectsList) return [];
    return allProjectsList
      .filter((p) => p.id !== project.id && p.propertyType === project.propertyType && p.category === project.category)
      .map((p) => {
        const sameCity = p.city != null && p.city === project.city;
        const sameLocation = p.location === project.location;
        const priceDelta =
          p.startingPrice != null && project.startingPrice != null
            ? Math.abs(p.startingPrice - project.startingPrice) / Math.max(project.startingPrice, 1)
            : 1;
        return { ...p, score: (sameCity ? 0 : 2) + (sameLocation ? 0 : 1) + priceDelta };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 6);
  }, [allProjectsList, project]);

  const compPrices = comps.map((c) => c.startingPrice).filter((n): n is number => n != null);
  const compAvgPrice = compPrices.length ? compPrices.reduce((a, b) => a + b, 0) / compPrices.length : null;
  const priceDiffPct =
    compAvgPrice != null && project?.startingPrice != null ? ((project.startingPrice - compAvgPrice) / compAvgPrice) * 100 : null;

  const daysListed = project ? Math.max(0, Math.floor((Date.now() - new Date(project.createdAt).getTime()) / 86_400_000)) : 0;

  /* ── Sales activity linked to any of this project's units ── */
  const unitIds = useMemo(() => new Set(allUnits.map((u) => u.id)), [allUnits]);
  const relatedQuotations = useMemo(() => (quotations ?? []).filter((q) => unitIds.has(q.unitId)), [quotations, unitIds]);
  const relatedReservations = useMemo(() => (reservations ?? []).filter((r) => unitIds.has(r.unitId)), [reservations, unitIds]);
  const relatedContracts = useMemo(() => (contracts ?? []).filter((c) => unitIds.has(c.unitId)), [contracts, unitIds]);
  const hasActivity = relatedQuotations.length > 0 || relatedReservations.length > 0 || relatedContracts.length > 0;

  if (!project) return <p>Project not found. <button onClick={goBack} className="text-[var(--era-red)] underline">Back</button></p>;

  const openUnit = openUnitId ? (allUnits.find((u) => u.id === openUnitId) ?? null) : null;

  const unitCols: Column<UnitRow>[] = [
    {
      key: 'code',
      header: 'Unit',
      render: (u) => (
        <span className="flex items-center gap-1 font-semibold text-[var(--era-navy)]">
          {u.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          {u.code}
        </span>
      ),
    },
    { key: 'blk', header: 'Block', render: (u) => u.block?.name },
    { key: 'floor', header: 'Floor', align: 'right', render: (u) => u.floor },
    { key: 'type', header: 'Type', render: (u) => u.unitType?.name },
    { key: 'area', header: 'Area', align: 'right', render: (u) => (u.areaSqm != null ? `${u.areaSqm} m²` : '—') },
    { key: 'view', header: 'View', render: (u) => u.view },
    { key: 'price', header: 'List price', align: 'right', render: (u) => money(u.listPrice) },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge value={u.status} /> },
  ];

  return (
    <div>
      <button onClick={goBack} className="text-sm text-gray-500 hover:text-[var(--era-red)]">
        ← Back
      </button>
      <PageHeader
        title={project.name}
        subtitle={
          [project.location, project.phase, `handover ${date(project.handoverDate)}`].filter(Boolean).join(' · ') +
          (project.startingPrice != null ? ` · starting from ${money(project.startingPrice, { compact: true })}` : '')
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="slate">{titleCase(project.propertyType)}</Badge>
            <Badge tone="slate">{titleCase(project.category)}</Badge>
            <StatusBadge value={project.status} />
            {project.badge !== 'NONE' && <Badge tone={project.badge === 'EXCLUSIVE' ? 'red' : 'amber'}>{titleCase(project.badge)}</Badge>}
            {project.videoUrl && (
              <a
                href={project.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[var(--era-navy)] underline underline-offset-2"
              >
                Video tour
              </a>
            )}
            {canWrite && (
              <>
                <div className="h-5 w-px bg-gray-200" />
                <Button size="sm" variant="outline" onClick={() => setEditingProject(true)}>
                  Edit project
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Fact
          icon={Calendar}
          label="Listed"
          value={daysListed === 0 ? 'Today' : `${daysListed} day${daysListed === 1 ? '' : 's'} ago`}
        />
        <Fact icon={Activity} label="Status" value={titleCase(project.status)} />
        {priceDiffPct != null && (
          <Fact
            icon={priceDiffPct <= 0 ? TrendingDown : TrendingUp}
            label="Vs. similar listings"
            value={`${priceDiffPct <= 0 ? '' : '+'}${pct(priceDiffPct, 1)} ${priceDiffPct <= 0 ? 'below' : 'above'} avg`}
            tone={priceDiffPct <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--era-red)]/10 text-[var(--era-red)]'}
          />
        )}
        <Fact
          icon={FileText}
          label="Sales activity"
          value={
            hasActivity
              ? [
                  relatedQuotations.length && `${relatedQuotations.length} quote${relatedQuotations.length === 1 ? '' : 's'}`,
                  relatedReservations.length && `${relatedReservations.length} reservation${relatedReservations.length === 1 ? '' : 's'}`,
                  relatedContracts.length && `${relatedContracts.length} contract${relatedContracts.length === 1 ? '' : 's'}`,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'None yet'
          }
        />
        {project.developer && <Fact icon={Building2} label="Developer" value={project.developer} />}
        {project.tenure && <Fact icon={ShieldCheck} label="Tenure" value={project.tenure} />}
        {project.totalFloors != null && <Fact icon={Layers} label="Total floors" value={project.totalFloors} />}
        {project.disclosedUnitCount != null && (
          <Fact icon={Users} label="Total units (disclosed)" value={project.disclosedUnitCount} />
        )}
      </div>

      <div className="mb-6">
        <ImageGallery
          images={project.imageUrls}
          canWrite={canWrite}
          onUpload={(dataUrl) => addProjectImage.mutate({ projectId: id, dataUrl })}
          onRemove={(url) => removeProjectImage.mutate({ projectId: id, url })}
          emptyHint="No photos yet."
        />
      </div>

      <div className="mb-6">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
          Site / floor plan (whole-building — used on quotation PDFs)
        </label>
        <ImageGallery
          images={project.sitePlanUrl ? [project.sitePlanUrl] : []}
          canWrite={canWrite && !project.sitePlanUrl}
          onUpload={(dataUrl) => setSitePlan.mutate({ projectId: id, dataUrl })}
          onRemove={() => removeSitePlan.mutate(id)}
          emptyHint="No site plan yet."
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Units" value={total} />
        <StatCard label="Available" value={available} tone="green" />
        <StatCard label="Reserved" value={reserved} tone="amber" />
        <StatCard label="Sold" value={sold} tone="red" />
        <StatCard label="GDV" value={money(gdv, { compact: true })} hint={`${pct(absorption)} absorbed`} />
      </div>

      {comps.length > 0 && (
        <div className="mb-6 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-[var(--era-navy)]">
            Similar {titleCase(project.propertyType)} listings ({project.category === 'RENT' ? 'for rent' : 'for sale'})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comps.map((c) => (
              <Link
                key={c.id}
                to={`/inventory/${c.id}`}
                className="flex items-center gap-3 rounded-lg border border-black/5 p-2.5 text-sm transition hover:border-[var(--era-navy)]/30 hover:shadow-sm"
              >
                <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                  {c.imageUrls[0] ? (
                    <img src={resolveUploadUrl(c.imageUrls[0])} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" style={{ background: c.coverColor ?? '#e5e7eb' }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--era-navy)]">{c.name}</p>
                  <p className="truncate text-xs text-gray-500">{c.location}</p>
                  {c.startingPrice != null && (
                    <p className="text-xs font-semibold text-[var(--era-navy)]">{money(c.startingPrice, { compact: true })}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-[var(--era-navy)]">Sales activity</h3>
        {hasActivity ? (
          <div className="space-y-1.5 text-sm">
            {relatedQuotations.map((q) => (
              <div key={q.id} className="flex items-center justify-between border-b border-gray-50 py-1.5">
                <span className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                  Quotation <span className="font-medium text-[var(--era-navy)]">{q.number}</span> · {contactLabel(contacts, q.contactId)}
                </span>
                <StatusBadge value={q.status} />
              </div>
            ))}
            {relatedReservations.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-gray-50 py-1.5">
                <span className="flex items-center gap-2">
                  <BookMarked className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                  Reservation <span className="font-medium text-[var(--era-navy)]">{r.number}</span> · {contactLabel(contacts, r.contactId)}
                </span>
                <StatusBadge value={r.status} />
              </div>
            ))}
            {relatedContracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-gray-50 py-1.5">
                <span className="flex items-center gap-2">
                  <FileSignature className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                  Contract <span className="font-medium text-[var(--era-navy)]">{c.number}</span> · {contactLabel(contacts, c.contactId)}
                </span>
                <StatusBadge value={c.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No quotations, reservations, or contracts linked to this listing yet.</p>
        )}
      </div>

      <Tabs
        tabs={[
          { id: 'units', label: `Units (${allUnits.length})` },
          { id: 'pricelists', label: `Price lists (${priceLists.length})` },
          { id: 'blocks', label: `Blocks (${blocks.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'units' && (
        <>
          <Toolbar>
            <Select value={block} onChange={(e) => setBlock(e.target.value)}>
              <option value="ALL">All blocks</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">All statuses</option>
              {UNIT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {titleCase(st)}
                </option>
              ))}
            </Select>
            <span className="text-sm text-gray-400">{units.length} units</span>
            {canWrite && (
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setBulkAdding(true)}>
                  Bulk add
                </Button>
                <Button size="sm" onClick={() => setAddingUnit(true)}>
                  Add unit
                </Button>
              </div>
            )}
          </Toolbar>
          <DataTable columns={unitCols} rows={units.slice(0, 200)} onRowClick={(u) => setOpenUnitId(u.id)} />
          {units.length > 200 && (
            <p className="mt-2 text-xs text-gray-400">Showing first 200 — filter to narrow.</p>
          )}
        </>
      )}

      {tab === 'pricelists' && (
        <div className="space-y-3">
          {canWrite && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setEditingPriceList('new')}>
                New price list
              </Button>
            </div>
          )}
          {priceLists.map((pl) => (
            <div
              key={pl.id}
              className={`flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm ${
                pl.active ? 'border-l-4 border-emerald-500' : 'border-black/5'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--era-navy)]">{pl.name}</span>
                  <span className="text-xs text-gray-400">v{pl.version}</span>
                  {pl.active && <Badge tone="green">active</Badge>}
                </div>
                <div className="mt-1 text-lg font-bold text-gray-800">{money(pl.psf)}<span className="text-sm font-normal text-gray-400">/m²</span></div>
                <div className="text-xs text-gray-500">
                  floor +{pct(pl.floorPremiumPct * 100, 1)}/floor · view +{money(pl.viewPremiumUsd)} · from {date(pl.effectiveFrom)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canWrite && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditingPriceList(pl)}>
                      Edit
                    </Button>
                    {!pl.active && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => activatePriceList.mutate({ id: pl.id, projectId: id })}>
                          Make active
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deletePriceList.mutate({ id: pl.id, projectId: id })}>
                          Delete
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'blocks' && (
        <div className="space-y-3">
          {canWrite && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setEditingBlock('new')}>
                New block
              </Button>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            {blocks.map((b) => {
              const bu = allUnits.filter((u) => u.blockId === b.id);
              const availableCount = bu.filter((u) => u.status === 'AVAILABLE').length;
              const occupiedPct = bu.length ? ((bu.length - availableCount) / bu.length) * 100 : 0;
              return (
                <div key={b.id} className="rounded-xl border border-l-4 border-black/5 border-l-[var(--era-navy)] bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="font-bold text-[var(--era-navy)]">{b.name}</div>
                    {canWrite && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingBlock(b)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteBlock.mutate({ id: b.id, projectId: id })}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    {b.floors} floors · {bu.length} units
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full bg-emerald-500" style={{ width: `${100 - occupiedPct}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-gray-400">{availableCount} available</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <UnitDetailDrawer
        unit={openUnit}
        projectId={id}
        projectName={project.name}
        blocks={blocks}
        unitTypes={allUnitTypes}
        canWrite={canWrite}
        onClose={() => setOpenUnitId(null)}
      />
      <EditProjectDrawer project={project} open={editingProject} onClose={() => setEditingProject(false)} />
      <AddUnitDrawer projectId={id} blocks={blocks} unitTypes={allUnitTypes} open={addingUnit} onClose={() => setAddingUnit(false)} />
      <BulkAddUnitsDrawer projectId={id} blocks={blocks} unitTypes={allUnitTypes} open={bulkAdding} onClose={() => setBulkAdding(false)} />
      <BlockFormDrawer
        projectId={id}
        block={editingBlock === 'new' ? null : editingBlock}
        open={editingBlock !== null}
        onClose={() => setEditingBlock(null)}
      />
      <PriceListFormDrawer
        projectId={id}
        priceList={editingPriceList === 'new' ? null : editingPriceList}
        open={editingPriceList !== null}
        onClose={() => setEditingPriceList(null)}
      />
    </div>
  );
}
