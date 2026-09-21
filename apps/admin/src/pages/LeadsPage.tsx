import { useMemo, useState, type DragEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Flame, Search } from 'lucide-react';
import { PageHeader, Drawer, Field, FieldGrid, StatusBadge, Badge, Select, TextInput, Toolbar, Button, toneFor } from '@era/ui';
import { useAuth, useCan } from '../store/auth';
import {
  useActivities,
  useChangeLeadStage,
  useCreateLead,
  useFindDuplicateContact,
  useLead,
  useLeads,
  useToggleActivityDone,
  useUpdateLead,
  groupLeadsByStage,
} from '../data/crm';
import { useUsers, userLabel } from '../data/identity';
import { useProjects, projectLabel } from '../data/inventory';
import { LEAD_STAGES, LEAD_SOURCES, type LeadSource, type LeadStage, type Temperature } from '../data/types';
import { ProjectPicker } from '../app/components/ProjectPicker';
import { money, date, relDays, titleCase, initials } from '../lib/format';

const TEMP_AVATAR: Record<string, string> = {
  HOT: 'bg-red-100 text-red-700',
  WARM: 'bg-amber-100 text-amber-700',
  COLD: 'bg-blue-100 text-blue-700',
};

const STAGE_DOT: Record<string, string> = {
  neutral: 'bg-gray-400',
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
};

function NewLeadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const canAssign = useCan('crm:read:all');
  const { data: users } = useUsers();
  const agents = (users ?? []).filter((u) => u.role.key === 'AGENT');
  const createLead = useCreateLead();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<LeadSource>('WALK_IN');
  const [ownerId, setOwnerId] = useState('');

  const { data: duplicate } = useFindDuplicateContact({ email: email || undefined, phone: phone || undefined });

  function reset() {
    setName('');
    setEmail('');
    setPhone('');
    setSource('WALK_IN');
    setOwnerId('');
  }

  function submit() {
    if (!name.trim()) return;
    createLead.mutate(
      { name: name.trim(), email: email || undefined, phone: phone || undefined, source, ownerId: ownerId || undefined },
      { onSuccess: () => { reset(); onClose(); } },
    );
  }

  return (
    <Drawer open={open} onClose={() => { reset(); onClose(); }} title="New lead">
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Name</span>
          <TextInput className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</span>
          <TextInput className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Phone</span>
          <TextInput className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+855 …" />
        </label>

        {duplicate && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            A contact matching this email/phone already exists: <span className="font-semibold">{duplicate.name}</span>.
            Creating this lead will still attach to a new contact record — check Contacts first if this is the same person.
          </div>
        )}

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Source</span>
          <Select className="mt-1 w-full" value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </label>

        {canAssign ? (
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Assign to</span>
            <Select className="mt-1 w-full" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Auto-assign (least busy agent)</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </label>
        ) : (
          <p className="text-xs text-gray-400">This lead will be assigned to you ({user?.name}).</p>
        )}

        {!name.trim() && <p className="text-xs text-[var(--era-red)]">Required: Name.</p>}
        {createLead.error && <p className="text-xs text-[var(--era-red)]">{createLead.error.message}</p>}
        <Button onClick={submit} disabled={!name.trim() || createLead.isPending}>
          {createLead.isPending ? 'Creating…' : 'Create lead'}
        </Button>
      </div>
    </Drawer>
  );
}

export function LeadsPage() {
  const canWrite = useCan('crm:write');
  const canSeeAll = useCan('crm:read:all');
  const { user } = useAuth();
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [newOpen, setNewOpen] = useState(false);
  const [q, setQ] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const { data: leads } = useLeads(canSeeAll && scope === 'mine' ? { ownerId: user?.id } : undefined);
  const { data: users } = useUsers();
  const { data: projects } = useProjects();
  // Backed by the URL (?open=<id>) rather than plain component state, so a
  // link from elsewhere (e.g. a contact's "Interests & leads" list) can land
  // directly on this lead's drawer.
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('open');
  const setOpenId = (id: string | null) => setSearchParams(id ? { open: id } : {}, { replace: true });
  const { data: open } = useLead(openId);
  const { data: openActs } = useActivities(openId ? { leadId: openId } : {});
  const changeStage = useChangeLeadStage();
  const updateLead = useUpdateLead();
  const toggleActivityDone = useToggleActivityDone();

  const [editingLead, setEditingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    temperature: 'WARM' as Temperature,
    score: '0',
    budgetMin: '',
    budgetMax: '',
    unitTypeWanted: '',
    timeline: '',
    lostReason: '',
  });

  function startEditingLead() {
    if (!open) return;
    setLeadForm({
      temperature: open.temperature,
      score: String(open.score),
      budgetMin: open.budgetMin?.toString() ?? '',
      budgetMax: open.budgetMax?.toString() ?? '',
      unitTypeWanted: open.unitTypeWanted ?? '',
      timeline: open.timeline ?? '',
      lostReason: open.lostReason ?? '',
    });
    setEditingLead(true);
  }

  function saveLeadEdit() {
    if (!open) return;
    updateLead.mutate(
      {
        id: open.id,
        temperature: leadForm.temperature,
        score: Math.min(100, Math.max(0, Number(leadForm.score) || 0)),
        budgetMin: leadForm.budgetMin ? Number(leadForm.budgetMin) : null,
        budgetMax: leadForm.budgetMax ? Number(leadForm.budgetMax) : null,
        unitTypeWanted: leadForm.unitTypeWanted || null,
        timeline: leadForm.timeline || null,
        lostReason: leadForm.lostReason || null,
      },
      { onSuccess: () => setEditingLead(false) },
    );
  }

  const filteredLeads = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return leads ?? [];
    return (leads ?? []).filter(
      (l) => l.contact.name.toLowerCase().includes(needle) || (l.unitTypeWanted ?? '').toLowerCase().includes(needle),
    );
  }, [leads, q]);
  const cols = groupLeadsByStage(filteredLeads);

  const weightedValue = cols
    .filter((c) => !['WON', 'LOST'].includes(c.stage))
    .reduce((a, c) => a + c.value, 0);

  function dropOnStage(stage: LeadStage, e: DragEvent) {
    setDragOverStage(null);
    setDraggingId(null);
    // Read the id from the drag payload itself (not component state) — the
    // authoritative HTML5 DnD pattern, immune to any React re-render timing.
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    const lead = id ? filteredLeads.find((l) => l.id === id) : undefined;
    if (lead && lead.stage !== stage) changeStage.mutate({ id: lead.id, to: stage });
  }

  return (
    <div>
      <PageHeader
        title="Sales Pipeline"
        subtitle={`${leads?.length ?? 0} leads · ${money(weightedValue, { compact: true })} weighted value`}
        actions={
          <>
            {canSeeAll && (
              <div className="flex overflow-hidden rounded-lg border border-gray-200">
                {(['mine', 'all'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className={`px-3 py-1.5 text-sm font-medium ${
                      scope === s ? 'bg-[var(--era-navy)] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {s === 'mine' ? 'My leads' : 'Everyone'}
                  </button>
                ))}
              </div>
            )}
            {canWrite && <Button onClick={() => setNewOpen(true)}>+ New lead</Button>}
          </>
        }
      />

      <Toolbar>
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <TextInput
            placeholder="Search leads by name or unit…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        {canWrite && <span className="text-xs text-gray-400">Drag a card to another column to change its stage</span>}
      </Toolbar>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cols.map((col) => {
          const tone = toneFor(col.stage);
          const isDragTarget = dragOverStage === col.stage && draggingId != null;
          return (
            <div
              key={col.stage}
              onDragOver={(e) => {
                if (!canWrite) return;
                e.preventDefault();
                if (dragOverStage !== col.stage) setDragOverStage(col.stage);
              }}
              onDragLeave={() => setDragOverStage((s) => (s === col.stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                dropOnStage(col.stage as LeadStage, e);
              }}
              className={`min-w-0 rounded-xl p-2 transition-colors ${
                isDragTarget ? 'bg-[var(--era-navy)]/[0.04] ring-2 ring-[var(--era-navy)]/25' : ''
              }`}
            >
              <div className="mb-2 flex min-w-0 items-center gap-2 px-1">
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${STAGE_DOT[tone]}`} />
                <span className="truncate text-sm font-bold text-[var(--era-navy)]">{titleCase(col.stage)}</span>
                <Badge tone="slate">{col.count}</Badge>
              </div>
              {col.value > 0 && (
                <div className="mb-2 px-1 text-xs font-medium text-gray-400">{money(col.value, { compact: true })}</div>
              )}
              <div className="space-y-2">
                {col.leads.map((l) => (
                  <button
                    key={l.id}
                    draggable={canWrite}
                    onDragStart={(e) => {
                      setDraggingId(l.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', l.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverStage(null);
                    }}
                    onClick={() => { setOpenId(l.id); setEditingLead(false); }}
                    className={`w-full rounded-xl border border-black/5 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--era-navy)]/30 hover:shadow-md ${
                      canWrite ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${draggingId === l.id ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${TEMP_AVATAR[l.temperature]}`}
                      >
                        {initials(l.contact.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-sm font-semibold text-[var(--era-navy)]">{l.contact.name}</span>
                          {l.temperature === 'HOT' && <Flame className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />}
                        </div>
                        <div className="mt-1 text-sm font-bold text-gray-800">
                          {l.budgetMax ? money(l.budgetMax, { compact: true }) : '—'}
                        </div>
                        <div className="truncate text-xs text-gray-500">
                          {l.unitTypeWanted ? titleCase(l.unitTypeWanted) : 'No preference yet'}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                          <span className="truncate">{userLabel(users, l.ownerId).split(' ')[0]}</span>
                          <span className="flex-shrink-0">{relDays(l.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {col.leads.length === 0 && (
                  <div
                    className={`rounded-xl border border-dashed py-6 text-center text-xs transition-colors ${
                      isDragTarget ? 'border-[var(--era-navy)]/40 text-[var(--era-navy)]/50' : 'border-gray-200 text-gray-300'
                    }`}
                  >
                    {isDragTarget ? 'Drop here' : 'No leads'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Drawer open={!!open} onClose={() => { setOpenId(null); setEditingLead(false); }} title={open?.contact.name ?? ''}>
        {open && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge value={open.stage} />
                <Badge tone={open.temperature === 'HOT' ? 'red' : open.temperature === 'WARM' ? 'amber' : 'blue'}>
                  {open.temperature}
                </Badge>
                <span className="text-sm text-gray-400">score {open.score}</span>
              </div>
              {canWrite && !editingLead && (
                <Button size="sm" variant="ghost" onClick={startEditingLead}>
                  Edit
                </Button>
              )}
            </div>

            {editingLead ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Temperature</span>
                    <Select
                      className="mt-1 w-full"
                      value={leadForm.temperature}
                      onChange={(e) => setLeadForm({ ...leadForm, temperature: e.target.value as Temperature })}
                    >
                      <option value="HOT">Hot</option>
                      <option value="WARM">Warm</option>
                      <option value="COLD">Cold</option>
                    </Select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Score (0–100)</span>
                    <TextInput
                      type="number"
                      className="mt-1"
                      value={leadForm.score}
                      onChange={(e) => setLeadForm({ ...leadForm, score: e.target.value })}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Budget min</span>
                    <TextInput
                      type="number"
                      className="mt-1"
                      value={leadForm.budgetMin}
                      onChange={(e) => setLeadForm({ ...leadForm, budgetMin: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Budget max</span>
                    <TextInput
                      type="number"
                      className="mt-1"
                      value={leadForm.budgetMax}
                      onChange={(e) => setLeadForm({ ...leadForm, budgetMax: e.target.value })}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Unit type wanted</span>
                  <TextInput
                    className="mt-1"
                    placeholder="e.g. 2 Bedroom"
                    value={leadForm.unitTypeWanted}
                    onChange={(e) => setLeadForm({ ...leadForm, unitTypeWanted: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Timeline</span>
                  <TextInput
                    className="mt-1"
                    placeholder="e.g. 3-6 months"
                    value={leadForm.timeline}
                    onChange={(e) => setLeadForm({ ...leadForm, timeline: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Lost reason</span>
                  <TextInput
                    className="mt-1"
                    placeholder="Only relevant if this lead ends up Lost"
                    value={leadForm.lostReason}
                    onChange={(e) => setLeadForm({ ...leadForm, lostReason: e.target.value })}
                  />
                </label>
                {updateLead.error && <p className="text-xs text-[var(--era-red)]">{updateLead.error.message}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveLeadEdit} disabled={updateLead.isPending}>
                    {updateLead.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingLead(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <FieldGrid>
                <Field label="Budget">
                  {money(open.budgetMin ?? 0)} – {money(open.budgetMax ?? 0)}
                </Field>
                <Field label="Wants">{open.unitTypeWanted ? titleCase(open.unitTypeWanted) : '—'}</Field>
                <Field label="Timeline">{open.timeline ?? '—'}</Field>
                <Field label="Source">{titleCase(open.source)}</Field>
                <Field label="Owner">{userLabel(users, open.ownerId)}</Field>
                <Field label="Created">{date(open.createdAt)}</Field>
                <Field label="Last activity">{date(open.updatedAt)}</Field>
                {open.lostReason && <Field label="Lost reason">{open.lostReason}</Field>}
              </FieldGrid>
            )}

            {!editingLead && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Preferred project</label>
              {canWrite ? (
                <div className="mt-1">
                  <ProjectPicker
                    value={open.preferredProjectId}
                    onChange={(preferredProjectId) => updateLead.mutate({ id: open.id, preferredProjectId })}
                  />
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-800">{projectLabel(projects, open.preferredProjectId)}</p>
              )}
            </div>
            )}

            {!editingLead && canWrite && (
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Move to stage</label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {LEAD_STAGES.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeStage.mutate({ id: open.id, to: s })}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        s === open.stage
                          ? 'bg-[var(--era-navy)] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {titleCase(s)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <section>
              <h4 className="mb-2 text-sm font-bold text-[var(--era-navy)]">Activities ({openActs?.length ?? 0})</h4>
              {(openActs ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-gray-50 py-1.5 text-sm">
                  <span>
                    <Badge tone="slate">{titleCase(a.type)}</Badge> <span className="text-gray-700">{a.subject}</span>
                  </span>
                  {a.type === 'TASK' && canWrite && (
                    <Button size="sm" variant="ghost" onClick={() => toggleActivityDone.mutate(a.id)}>
                      {a.done ? '✓ done' : 'mark done'}
                    </Button>
                  )}
                </div>
              ))}
            </section>
          </div>
        )}
      </Drawer>

      <NewLeadDrawer open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
