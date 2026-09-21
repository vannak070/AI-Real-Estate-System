import { useState } from 'react';
import {
  PageHeader,
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
  useAcceptQuotation,
  useCreateQuotation,
  useGenerateQuotationPdf,
  usePaymentPlans,
  useQuotations,
  useReservations,
  useUpdateQuotation,
  type DiscountTierInput,
} from '../data/sales';
import { useAuth, useCan } from '../store/auth';
import { useContact, useContacts, contactLabel } from '../data/crm';
import { useUsers, userLabel } from '../data/identity';
import { useProjects, useUnits, unitLabel } from '../data/inventory';
import { UnitPicker } from '../app/components/UnitPicker';
import { resolveUploadUrl } from '../lib/api';
import { money, pct, date, titleCase } from '../lib/format';
import { QUOTE_STATUSES, type QuoteStatus } from '../data/types';

type QuotationRow = NonNullable<ReturnType<typeof useQuotations>['data']>[number];

function applyDiscountTiers(listPrice: number, discounts: DiscountTierInput[]) {
  let price = listPrice;
  for (const d of discounts) {
    price -= Math.round((price * d.pct) / 100);
  }
  return price;
}

/** Repeatable label+% rows, shared by the create form and the DRAFT-only edit form. */
function DiscountTiersEditor({
  discounts,
  setDiscounts,
}: {
  discounts: DiscountTierInput[];
  setDiscounts: (d: DiscountTierInput[]) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Discount tiers (applied in sequence)</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDiscounts([...discounts, { label: `Discount ${discounts.length + 1}`, pct: 0 }])}
        >
          Add tier
        </Button>
      </div>
      <div className="space-y-2">
        {discounts.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <TextInput
              className="flex-1"
              placeholder="Label (e.g. 1st discount)"
              value={d.label}
              onChange={(e) => {
                const next = [...discounts];
                next[i] = { ...d, label: e.target.value };
                setDiscounts(next);
              }}
            />
            <TextInput
              type="number"
              className="w-24"
              placeholder="%"
              value={d.pct}
              onChange={(e) => {
                const next = [...discounts];
                next[i] = { ...d, pct: Number(e.target.value) };
                setDiscounts(next);
              }}
            />
            <Button size="sm" variant="ghost" onClick={() => setDiscounts(discounts.filter((_, j) => j !== i))}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewQuotationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { data: contacts } = useContacts();
  const { data: units } = useUnits();
  const { data: paymentPlans } = usePaymentPlans();
  const { data: agents } = useUsers();
  const createQuotation = useCreateQuotation();

  const [contactId, setContactId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [ownerId, setOwnerId] = useState(user?.id ?? '');
  const [paymentPlanId, setPaymentPlanId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discounts, setDiscounts] = useState<DiscountTierInput[]>([]);

  const { data: contact } = useContact(contactId || null);
  const availableUnits = (units ?? []).filter((u) => u.status === 'AVAILABLE');
  const unit = availableUnits.find((u) => u.id === unitId);
  const listPrice = unit?.listPrice ?? 0;
  const netPrice = applyDiscountTiers(listPrice, discounts);

  const missing = [
    !contactId && 'Contact',
    !unitId && 'Unit',
    !ownerId && 'Agent',
    !paymentPlanId && 'Payment plan',
  ].filter((m): m is string => typeof m === 'string');

  const reset = () => {
    setContactId('');
    setLeadId('');
    setUnitId('');
    setOwnerId(user?.id ?? '');
    setPaymentPlanId('');
    setValidUntil('');
    setDiscounts([]);
  };

  const submit = () => {
    if (missing.length > 0) return;
    createQuotation.mutate(
      {
        contactId,
        leadId: leadId || undefined,
        unitId,
        ownerId,
        listPrice,
        discounts,
        paymentPlanId,
        validUntil: validUntil ? new Date(validUntil) : undefined,
      },
      { onSuccess: () => { onClose(); reset(); } },
    );
  };

  return (
    <Drawer open={open} onClose={onClose} title="New quotation">
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Contact</span>
          <Select
            className="mt-1 w-full"
            value={contactId}
            onChange={(e) => {
              setContactId(e.target.value);
              setLeadId('');
            }}
          >
            <option value="">Select a contact</option>
            {(contacts ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>

        {contact && contact.leads.length > 0 && (
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Link to lead (optional)</span>
            <Select className="mt-1 w-full" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">No linked lead</option>
              {contact.leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {titleCase(l.stage)} · {l.unitTypeWanted ? titleCase(l.unitTypeWanted) : 'No preference'}
                  {l.budgetMax ? ` · ${money(l.budgetMax, { compact: true })}` : ''}
                </option>
              ))}
            </Select>
          </label>
        )}

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Unit (available only)</span>
          <div className="mt-1">
            <UnitPicker value={unitId} onChange={setUnitId} />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Agent</span>
          <Select className="mt-1 w-full" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Select an agent</option>
            {(agents ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Payment plan</span>
          <Select className="mt-1 w-full" value={paymentPlanId} onChange={(e) => setPaymentPlanId(e.target.value)}>
            <option value="">Select a payment plan</option>
            {(paymentPlans ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Valid until</span>
          <TextInput type="date" className="mt-1" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </label>

        <DiscountTiersEditor discounts={discounts} setDiscounts={setDiscounts} />

        {unit && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">List price</span>
              <span>{money(listPrice)}</span>
            </div>
            <div className="mt-1 flex justify-between font-bold text-[var(--era-navy)]">
              <span>Net price</span>
              <span>{money(netPrice)}</span>
            </div>
          </div>
        )}

        {missing.length > 0 && <p className="text-xs text-[var(--era-red)]">Required: {missing.join(', ')}.</p>}
        {createQuotation.error && <p className="text-sm text-[var(--era-red)]">{createQuotation.error.message}</p>}

        <Button onClick={submit} disabled={missing.length > 0 || createQuotation.isPending}>
          {createQuotation.isPending ? 'Creating…' : 'Create quotation'}
        </Button>
      </div>
    </Drawer>
  );
}

export function QuotationsPage() {
  const canWrite = useCan('sales:write');
  const canSeeAll = useCan('sales:read:all');
  const { user } = useAuth();
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [status, setStatus] = useState<QuoteStatus | 'ALL'>('ALL');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: quotations } = useQuotations(canSeeAll && scope === 'mine' ? { ownerId: user?.id } : undefined);
  const { data: reservations } = useReservations();
  const { data: contacts } = useContacts();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const { data: projects } = useProjects();
  const { data: paymentPlans } = usePaymentPlans();
  const acceptQuotation = useAcceptQuotation();
  const generatePdf = useGenerateQuotationPdf();
  const updateQuotation = useUpdateQuotation();

  const [editing, setEditing] = useState(false);
  const [editLeadId, setEditLeadId] = useState('');
  const [editPaymentPlanId, setEditPaymentPlanId] = useState('');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [editDiscounts, setEditDiscounts] = useState<DiscountTierInput[]>([]);

  const all = quotations ?? [];
  const rows = all.filter((q) => status === 'ALL' || q.status === status);

  const columns: Column<QuotationRow>[] = [
    { key: 'no', header: 'Number', render: (q) => <span className="font-semibold text-[var(--era-navy)]">{q.number}</span> },
    { key: 'buyer', header: 'Contact', render: (q) => contactLabel(contacts, q.contactId) },
    { key: 'unit', header: 'Unit', render: (q) => unitLabel(units, projects, q.unitId) },
    { key: 'list', header: 'List', align: 'right', render: (q) => money(q.listPrice) },
    { key: 'disc', header: 'Disc.', align: 'right', render: (q) => (q.discountPct ? pct(q.discountPct) : '—') },
    { key: 'net', header: 'Net price', align: 'right', render: (q) => <b>{money(q.netPrice)}</b> },
    { key: 'agent', header: 'Agent', render: (q) => userLabel(users, q.ownerId) },
    {
      key: 'status',
      header: 'Status',
      render: (q) => (
        <span className="flex items-center gap-1.5">
          <StatusBadge value={q.status} />
          {q.pendingApproval && <Badge tone="amber">discount approval</Badge>}
        </span>
      ),
    },
  ];

  const q = openId ? all.find((x) => x.id === openId) : null;
  const converted = q ? (reservations ?? []).some((r) => r.quotationId === q.id) : false;
  const installments = q?.paymentPlan.installments ?? [];

  const { data: qContact } = useContact(q?.contactId ?? null);
  const editNetPrice = q ? applyDiscountTiers(q.listPrice, editDiscounts) : 0;

  function startEditing() {
    if (!q) return;
    setEditLeadId(q.leadId ?? '');
    setEditPaymentPlanId(q.paymentPlanId);
    setEditValidUntil(q.validUntil ? q.validUntil.slice(0, 10) : '');
    setEditDiscounts(q.discounts);
    setEditing(true);
  }

  function saveEdit() {
    if (!q) return;
    updateQuotation.mutate(
      {
        id: q.id,
        leadId: editLeadId || null,
        paymentPlanId: editPaymentPlanId,
        validUntil: editValidUntil ? new Date(editValidUntil) : null,
        discounts: editDiscounts,
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle={`${all.length} quotations`}
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
                    {s === 'mine' ? 'My quotations' : 'Everyone'}
                  </button>
                ))}
              </div>
            )}
            {canWrite && <Button onClick={() => setCreating(true)}>New quotation</Button>}
          </>
        }
      />
      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value as QuoteStatus | 'ALL')}>
          <option value="ALL">All statuses</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <span className="text-sm text-gray-400">{rows.length} shown</span>
      </Toolbar>
      <DataTable columns={columns} rows={rows} onRowClick={(x) => { setOpenId(x.id); setEditing(false); }} />

      <Drawer open={!!q} onClose={() => { setOpenId(null); setEditing(false); }} title={q?.number ?? ''}>
        {q && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge value={q.status} />
              {canWrite && q.status === 'DRAFT' && !editing && (
                <Button size="sm" variant="ghost" onClick={startEditing}>
                  Edit
                </Button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                {qContact && qContact.leads.length > 0 && (
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Link to lead</span>
                    <Select className="mt-1 w-full" value={editLeadId} onChange={(e) => setEditLeadId(e.target.value)}>
                      <option value="">No linked lead</option>
                      {qContact.leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {titleCase(l.stage)} · {l.unitTypeWanted ? titleCase(l.unitTypeWanted) : 'No preference'}
                          {l.budgetMax ? ` · ${money(l.budgetMax, { compact: true })}` : ''}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Payment plan</span>
                  <Select className="mt-1 w-full" value={editPaymentPlanId} onChange={(e) => setEditPaymentPlanId(e.target.value)}>
                    {(paymentPlans ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Valid until</span>
                  <TextInput type="date" className="mt-1" value={editValidUntil} onChange={(e) => setEditValidUntil(e.target.value)} />
                </label>

                <DiscountTiersEditor discounts={editDiscounts} setDiscounts={setEditDiscounts} />

                <div className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">List price</span>
                    <span>{money(q.listPrice)}</span>
                  </div>
                  <div className="mt-1 flex justify-between font-bold text-[var(--era-navy)]">
                    <span>Net price</span>
                    <span>{money(editNetPrice)}</span>
                  </div>
                </div>

                {updateQuotation.error && <p className="text-xs text-[var(--era-red)]">{updateQuotation.error.message}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} disabled={!editPaymentPlanId || updateQuotation.isPending}>
                    {updateQuotation.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <FieldGrid>
                  <Field label="Contact">{contactLabel(contacts, q.contactId)}</Field>
                  <Field label="Agent">{userLabel(users, q.ownerId)}</Field>
                  <Field label="Unit">{unitLabel(units, projects, q.unitId)}</Field>
                  <Field label="Valid until">{date(q.validUntil)}</Field>
                  <Field label="List price">{money(q.listPrice)}</Field>
                  <Field label="Discount">
                    {q.discountPct ? `${pct(q.discountPct)} (${money(q.discountAmount)})` : 'None'}
                  </Field>
                  <Field label="Net price">
                    <b>{money(q.netPrice)}</b>
                  </Field>
                  <Field label="Payment plan">{q.paymentPlan.name}</Field>
                </FieldGrid>

                <section>
                  <h4 className="mb-2 text-sm font-bold text-[var(--era-navy)]">Payment schedule</h4>
                  {installments.map((inst, i) => (
                    <div key={i} className="flex justify-between border-b border-gray-50 py-1.5 text-sm">
                      <span className="text-gray-700">{inst.label}</span>
                      <span className="tabular-nums">
                        {pct(inst.percent, 1)} · {money((q.netPrice * inst.percent) / 100)}
                      </span>
                    </div>
                  ))}
                </section>
              </>
            )}

            {!editing && q.pendingApproval && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                This quotation's discount needs a manager's sign-off before it can be accepted — see{' '}
                <span className="font-semibold">Approvals</span>.
              </div>
            )}

            {!editing && (
            <div className="flex items-center gap-2">
              {canWrite && q.status !== 'ACCEPTED' && !converted && !q.pendingApproval && (
                <Button onClick={() => acceptQuotation.mutate(q.id)}>Accept → create reservation</Button>
              )}
              <Button
                variant="outline"
                disabled={generatePdf.isPending}
                onClick={() =>
                  generatePdf.mutate(q.id, {
                    onSuccess: (result) => window.open(resolveUploadUrl(result.url), '_blank'),
                  })
                }
              >
                {generatePdf.isPending ? 'Generating…' : 'Download PDF'}
              </Button>
            </div>
            )}
            {generatePdf.error && <p className="text-sm text-[var(--era-red)]">{generatePdf.error.message}</p>}
            {converted && <p className="text-sm text-emerald-600">Reservation created for this quotation.</p>}
          </div>
        )}
      </Drawer>

      <NewQuotationDrawer open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
