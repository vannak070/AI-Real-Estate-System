import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowUpRight, Flame, Search } from 'lucide-react';
import {
  PageHeader,
  StatCard,
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
import { useAuth, useCan } from '../store/auth';
import {
  useContact,
  useContacts,
  useCreateContact,
  useFindDuplicateContact,
  useLeads,
  useUpdateContact,
  useVerifyKyc,
} from '../data/crm';
import { useUsers, userLabel } from '../data/identity';
import { useProjects, projectLabel } from '../data/inventory';
import { CONTACT_TYPES } from '../data/types';
import { LEAD_SOURCES, type ContactType, type LeadSource } from '../data/types';
import { date, initials, money, titleCase } from '../lib/format';

type ContactRow = NonNullable<ReturnType<typeof useContacts>['data']>[number];
type LeadListItem = NonNullable<ReturnType<typeof useLeads>['data']>[number];
type ProjectListItem = NonNullable<ReturnType<typeof useProjects>['data']>[number];

/** Most relevant lead to summarize as "what this contact is interested in" — the
 * most recently-touched still-open lead, falling back to the most recent overall. */
function pickPrimaryLead(list: LeadListItem[] | undefined): LeadListItem | null {
  if (!list || list.length === 0) return null;
  const active = list.filter((l) => l.stage !== 'WON' && l.stage !== 'LOST');
  const pool = active.length > 0 ? active : list;
  return [...pool].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function interestLabel(
  l: { preferredProjectId: string | null; unitTypeWanted: string | null },
  projects: ProjectListItem[] | undefined,
): string {
  if (l.preferredProjectId) return projectLabel(projects, l.preferredProjectId);
  if (l.unitTypeWanted) return titleCase(l.unitTypeWanted);
  return 'No preference yet';
}

const TYPE_AVATAR: Record<string, string> = {
  PROSPECT: 'bg-slate-100 text-slate-600',
  BUYER: 'bg-emerald-100 text-emerald-700',
  TENANT: 'bg-blue-100 text-blue-700',
  OWNER: 'bg-[var(--era-navy)]/10 text-[var(--era-navy)]',
  BROKER: 'bg-amber-100 text-amber-700',
  REFERRER: 'bg-purple-100 text-purple-700',
};

interface ContactFormState {
  name: string;
  email: string;
  phone: string;
  nationality: string;
  company: string;
  type: ContactType;
  consentMarketing: boolean;
}

const EMPTY_CONTACT_FORM: ContactFormState = {
  name: '',
  email: '',
  phone: '',
  nationality: '',
  company: '',
  type: 'PROSPECT',
  consentMarketing: false,
};

/** Shared field set for both creating a contact and editing one in place. */
function ContactFields({ form, setForm }: { form: ContactFormState; setForm: (f: ContactFormState) => void }) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Name</span>
        <TextInput className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</span>
        <TextInput className="mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Phone</span>
        <TextInput className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+855 …" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Nationality</span>
          <TextInput className="mt-1" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Company</span>
          <TextInput className="mt-1" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Type</span>
        <Select className="mt-1 w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })}>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {titleCase(t)}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={form.consentMarketing}
          onChange={(e) => setForm({ ...form, consentMarketing: e.target.checked })}
        />
        Consents to marketing contact
      </label>
    </div>
  );
}

function NewContactDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const createContact = useCreateContact();

  const [form, setForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM);
  const [source, setSource] = useState<LeadSource>('WALK_IN');

  const { data: duplicate } = useFindDuplicateContact({ email: form.email || undefined, phone: form.phone || undefined });
  const missing = !form.name.trim() ? ['Name'] : [];

  function reset() {
    setForm(EMPTY_CONTACT_FORM);
    setSource('WALK_IN');
  }

  function submit() {
    if (missing.length > 0) return;
    createContact.mutate(
      {
        name: form.name.trim(),
        email: form.email || undefined,
        phone: form.phone || undefined,
        nationality: form.nationality || undefined,
        company: form.company || undefined,
        consentMarketing: form.consentMarketing,
        type: form.type,
        source,
      },
      { onSuccess: () => { reset(); onClose(); } },
    );
  }

  return (
    <Drawer open={open} onClose={() => { reset(); onClose(); }} title="New contact">
      <div className="space-y-4">
        <ContactFields form={form} setForm={setForm} />

        {duplicate && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            A contact matching this email/phone already exists: <span className="font-semibold">{duplicate.name}</span>.
            Double-check before creating a second record for the same person.
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

        <p className="text-xs text-gray-400">This contact will be assigned to you ({user?.name}).</p>

        {missing.length > 0 && <p className="text-xs text-[var(--era-red)]">Required: {missing.join(', ')}.</p>}
        {createContact.error && <p className="text-xs text-[var(--era-red)]">{createContact.error.message}</p>}
        <Button onClick={submit} disabled={missing.length > 0 || createContact.isPending}>
          {createContact.isPending ? 'Creating…' : 'Create contact'}
        </Button>
      </div>
    </Drawer>
  );
}

export function ContactsPage() {
  const navigate = useNavigate();
  const canWrite = useCan('crm:write');
  const canSeeAll = useCan('crm:read:all');
  const { user } = useAuth();
  // crm:read:all holders (managers, admins, …) are rarely assigned contacts
  // themselves — default them to the team-wide view instead of "My contacts",
  // which would otherwise look empty. Safe as a lazy initializer: <RequireAuth>
  // guarantees auth has already resolved before this page ever renders.
  const [scope, setScope] = useState<'mine' | 'all'>(() => (canSeeAll ? 'all' : 'mine'));
  const [q, setQ] = useState('');
  const [type, setType] = useState('ALL');
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const ownerFilter = canSeeAll && scope === 'mine' ? user?.id : undefined;
  const { data: contacts, isLoading } = useContacts(
    type === 'ALL' ? { q: q || undefined, ownerId: ownerFilter } : { q: q || undefined, type: type as ContactRow['type'], ownerId: ownerFilter },
  );
  const { data: leads } = useLeads(ownerFilter ? { ownerId: ownerFilter } : undefined);
  const { data: users } = useUsers();
  const { data: projects } = useProjects();
  const { data: open } = useContact(openId);
  const verifyKyc = useVerifyKyc();
  const updateContact = useUpdateContact();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM);

  const rows = useMemo(() => contacts ?? [], [contacts]);

  const leadsByContact = useMemo(() => {
    const map = new Map<string, LeadListItem[]>();
    for (const l of leads ?? []) {
      const arr = map.get(l.contactId) ?? [];
      arr.push(l);
      map.set(l.contactId, arr);
    }
    return map;
  }, [leads]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      prospects: rows.filter((c) => c.type === 'PROSPECT').length,
      verified: rows.filter((c) => c.kycStatus === 'VERIFIED').length,
      withLeads: rows.filter((c) => (leadsByContact.get(c.id)?.length ?? 0) > 0).length,
    }),
    [rows, leadsByContact],
  );

  const columns: Column<ContactRow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${TYPE_AVATAR[c.type] ?? TYPE_AVATAR.PROSPECT}`}
          >
            {initials(c.name)}
          </div>
          <span className="font-semibold text-[var(--era-navy)]">{c.name}</span>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (c) => <Badge tone="slate">{titleCase(c.type)}</Badge> },
    { key: 'phone', header: 'Phone', render: (c) => c.phone },
    { key: 'nat', header: 'Nationality', render: (c) => c.nationality },
    { key: 'kyc', header: 'KYC', render: (c) => <StatusBadge value={c.kycStatus} /> },
    {
      key: 'leads',
      header: 'Leads',
      render: (c) => {
        const list = leadsByContact.get(c.id);
        if (!list || list.length === 0) return <span className="text-gray-300">—</span>;
        return (
          <span className="inline-flex items-center gap-1">
            <Badge tone="slate">{list.length}</Badge>
            {list.some((l) => l.temperature === 'HOT') && <Flame className="h-3.5 w-3.5 text-red-500" />}
          </span>
        );
      },
    },
    {
      key: 'interest',
      header: 'Interested In',
      render: (c) => {
        const primary = pickPrimaryLead(leadsByContact.get(c.id));
        if (!primary) return <span className="text-gray-300">—</span>;
        return (
          <div className="text-sm leading-tight">
            <div className="font-medium text-gray-700">{interestLabel(primary, projects)}</div>
            {(primary.budgetMin || primary.budgetMax) && (
              <div className="text-xs text-gray-400">
                {money(primary.budgetMin ?? 0, { compact: true })}–{money(primary.budgetMax ?? 0, { compact: true })}
              </div>
            )}
          </div>
        );
      },
    },
    { key: 'src', header: 'Source', render: (c) => titleCase(c.source) },
    { key: 'owner', header: 'Owner', render: (c) => userLabel(users, c.ownerId) },
  ];

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${rows.length} people & companies`}
        actions={canWrite ? <Button onClick={() => setNewOpen(true)}>+ New contact</Button> : undefined}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total contacts" value={stats.total} tone="navy" />
        <StatCard label="Prospects" value={stats.prospects} tone="amber" />
        <StatCard label="KYC verified" value={stats.verified} tone="green" />
        <StatCard label="With active leads" value={stats.withLeads} tone="red" />
      </div>

      <Toolbar>
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <TextInput placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="ALL">All types</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {titleCase(t)}
            </option>
          ))}
        </Select>
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
                {s === 'mine' ? 'My contacts' : 'Everyone'}
              </button>
            ))}
          </div>
        )}
        <span className="text-sm text-gray-400">{isLoading ? '…' : `${rows.length} shown`}</span>
      </Toolbar>

      <DataTable columns={columns} rows={rows} onRowClick={(c) => { setOpenId(c.id); setEditing(false); }} />

      <Drawer open={!!open} onClose={() => { setOpenId(null); setEditing(false); }} title={open?.name ?? ''}>
        {open && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-base font-bold ${TYPE_AVATAR[open.type] ?? TYPE_AVATAR.PROSPECT}`}
              >
                {initials(open.name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="slate">{titleCase(open.type)}</Badge>
                    <StatusBadge value={open.kycStatus} />
                  </div>
                  {canWrite && !editing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditForm({
                          name: open.name,
                          email: open.email ?? '',
                          phone: open.phone ?? '',
                          nationality: open.nationality ?? '',
                          company: open.company ?? '',
                          type: open.type,
                          consentMarketing: open.consentMarketing,
                        });
                        setEditing(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-400">Contact since {date(open.createdAt)}</p>
              </div>
            </div>

            {editing ? (
              <div className="space-y-4">
                <ContactFields form={editForm} setForm={setEditForm} />
                {!editForm.name.trim() && <p className="text-xs text-[var(--era-red)]">Required: Name.</p>}
                {updateContact.error && <p className="text-xs text-[var(--era-red)]">{updateContact.error.message}</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!editForm.name.trim() || updateContact.isPending}
                    onClick={() =>
                      updateContact.mutate(
                        {
                          id: open.id,
                          name: editForm.name.trim(),
                          type: editForm.type,
                          email: editForm.email || null,
                          phone: editForm.phone || null,
                          nationality: editForm.nationality || null,
                          company: editForm.company || null,
                          consentMarketing: editForm.consentMarketing,
                        },
                        { onSuccess: () => setEditing(false) },
                      )
                    }
                  >
                    {updateContact.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <FieldGrid>
                <Field label="Email">{open.email ?? '—'}</Field>
                <Field label="Phone">{open.phone ?? '—'}</Field>
                <Field label="Nationality">{open.nationality ?? '—'}</Field>
                <Field label="Company">{open.company ?? '—'}</Field>
                <Field label="Source">{titleCase(open.source)}</Field>
                <Field label="Marketing consent">{open.consentMarketing ? 'Yes' : 'No'}</Field>
                <Field label="Owner">{userLabel(users, open.ownerId)}</Field>
                <Field label="Since">{date(open.createdAt)}</Field>
              </FieldGrid>
            )}

            {canWrite && open.kycStatus !== 'VERIFIED' && (
              <Button size="sm" variant="outline" onClick={() => verifyKyc.mutate(open.id)}>
                Mark KYC verified
              </Button>
            )}

            <section>
              <h4 className="mb-2 text-sm font-bold text-[var(--era-navy)]">Interests & leads ({open.leads.length})</h4>
              <div className="space-y-2">
                {open.leads.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => navigate(`/leads?open=${l.id}`)}
                    title="Open in Pipeline"
                    className="w-full rounded-lg border border-gray-100 p-2.5 text-left transition hover:border-[var(--era-navy)]/30 hover:bg-[var(--era-navy)]/[0.02]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                        {interestLabel(l, projects)}
                        <ArrowUpRight className="h-3.5 w-3.5 text-gray-300" />
                      </span>
                      <StatusBadge value={l.stage} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      {(l.budgetMin || l.budgetMax) && (
                        <span>
                          Budget: {money(l.budgetMin ?? 0, { compact: true })}–{money(l.budgetMax ?? 0, { compact: true })}
                        </span>
                      )}
                      {l.timeline && <span>Timeline: {l.timeline}</span>}
                      <Badge tone={l.temperature === 'HOT' ? 'red' : l.temperature === 'WARM' ? 'amber' : 'blue'}>
                        {l.temperature}
                      </Badge>
                    </div>
                  </button>
                ))}
                {open.leads.length === 0 && (
                  <p className="text-sm text-gray-400">No leads yet — nothing on file for what this contact wants.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </Drawer>

      <NewContactDrawer open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
