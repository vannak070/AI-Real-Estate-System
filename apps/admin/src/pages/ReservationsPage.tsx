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
  useCancelReservation,
  useConfirmDeposit,
  usePaymentPlans,
  useRequestReservation,
  useReservations,
  useSignContract,
  useUpdateReservationDeposit,
} from '../data/sales';
import { useAuth, useCan } from '../store/auth';
import { useContacts, contactLabel } from '../data/crm';
import { useUsers, userLabel } from '../data/identity';
import { useProjects, useUnits, unitLabel } from '../data/inventory';
import { ContactPicker } from '../app/components/ContactPicker';
import { UnitPicker } from '../app/components/UnitPicker';
import { money, date, relDays } from '../lib/format';
import { RESERVATION_STATUSES, type ReservationStatus } from '../data/types';

type ReservationRow = NonNullable<ReturnType<typeof useReservations>['data']>[number];

function NewReservationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { data: agents } = useUsers();
  const requestReservation = useRequestReservation();

  // Only users who can actually work a reservation — Finance/Marketing/Viewer
  // accounts are real identity users but not agents, and listing every one of
  // them here would make the current agent's own name harder to find.
  const salesAgents = (agents ?? []).filter((a) => a.role.capabilities.includes('sales:write'));

  const [contactId, setContactId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [agentId, setAgentId] = useState(user?.id ?? '');
  const [depositAmount, setDepositAmount] = useState('');

  const missing = [!contactId && 'Contact', !unitId && 'Unit', !agentId && 'Agent'].filter(
    (m): m is string => typeof m === 'string',
  );

  const reset = () => {
    setContactId('');
    setUnitId('');
    setAgentId(user?.id ?? '');
    setDepositAmount('');
  };

  const submit = () => {
    if (missing.length > 0) return;
    requestReservation.mutate(
      {
        unitId,
        contactId,
        agentId,
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
      },
      { onSuccess: () => { onClose(); reset(); } },
    );
  };

  return (
    <Drawer open={open} onClose={onClose} title="New reservation">
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Contact</span>
          <div className="mt-1">
            <ContactPicker value={contactId} onChange={setContactId} />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Unit (available only)</span>
          <div className="mt-1">
            <UnitPicker value={unitId} onChange={setUnitId} />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Agent</span>
          <Select className="mt-1 w-full" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">Select an agent</option>
            {salesAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Deposit amount (optional)</span>
          <TextInput
            className="mt-1 w-full"
            type="number"
            placeholder="0"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
        </label>

        {missing.length > 0 && <p className="text-xs text-[var(--era-red)]">Required: {missing.join(', ')}.</p>}
        {requestReservation.error && <p className="text-xs text-[var(--era-red)]">{requestReservation.error.message}</p>}

        <Button onClick={submit} disabled={missing.length > 0 || requestReservation.isPending}>
          {requestReservation.isPending ? 'Requesting…' : 'Request reservation'}
        </Button>
      </div>
    </Drawer>
  );
}

export function ReservationsPage() {
  const canWrite = useCan('sales:write');
  const canSign = useCan('sales:sign');
  const canSeeAll = useCan('sales:read:all');
  const { user } = useAuth();
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [status, setStatus] = useState<ReservationStatus | 'ALL'>('ALL');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signSalePrice, setSignSalePrice] = useState('');
  const [signPaymentPlanId, setSignPaymentPlanId] = useState('');
  const [editingDeposit, setEditingDeposit] = useState(false);
  const [depositInput, setDepositInput] = useState('');

  const { data: reservations } = useReservations(canSeeAll && scope === 'mine' ? { agentId: user?.id } : undefined);
  const { data: contacts } = useContacts();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const { data: projects } = useProjects();
  const { data: paymentPlans } = usePaymentPlans();
  const confirmDeposit = useConfirmDeposit();
  const updateDeposit = useUpdateReservationDeposit();
  const cancelReservation = useCancelReservation();
  const signContract = useSignContract();

  const all = reservations ?? [];
  const rows = all.filter((r) => status === 'ALL' || r.status === status);
  const now = Date.now();

  const columns: Column<ReservationRow>[] = [
    { key: 'no', header: 'Number', render: (r) => <span className="font-semibold text-[var(--era-navy)]">{r.number}</span> },
    { key: 'buyer', header: 'Contact', render: (r) => contactLabel(contacts, r.contactId) },
    { key: 'unit', header: 'Unit', render: (r) => unitLabel(units, projects, r.unitId) },
    { key: 'deposit', header: 'Deposit', align: 'right', render: (r) => money(r.depositAmount) },
    { key: 'paid', header: 'Paid', align: 'center', render: (r) => (r.depositPaid ? '✓' : '—') },
    {
      key: 'expires',
      header: 'Expires',
      render: (r) =>
        (r.status === 'HELD' || r.status === 'CONFIRMED') && r.expiresAt ? (
          <Badge tone={new Date(r.expiresAt).getTime() < now ? 'red' : 'amber'}>{relDays(r.expiresAt, now)}</Badge>
        ) : (
          '—'
        ),
    },
    { key: 'agent', header: 'Agent', render: (r) => userLabel(users, r.agentId) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge value={r.status} /> },
  ];

  const r = openId ? all.find((x) => x.id === openId) : null;
  const unit = r ? units?.find((u) => u.id === r.unitId) : null;
  const hasContract = !!r?.contract;

  function openRow(id: string) {
    setOpenId(id);
    setSigning(false);
    setEditingDeposit(false);
    confirmDeposit.reset();
    cancelReservation.reset();
    signContract.reset();
    updateDeposit.reset();
  }

  function closeDrawer() {
    setOpenId(null);
    setSigning(false);
    setEditingDeposit(false);
  }

  function startSigning() {
    if (!r) return;
    setSignSalePrice(String(r.quotation?.netPrice ?? unit?.listPrice ?? ''));
    setSignPaymentPlanId(r.quotation?.paymentPlanId ?? '');
    signContract.reset();
    setSigning(true);
  }

  function submitSign() {
    if (!r || !signSalePrice) return;
    signContract.mutate(
      {
        reservationId: r.id,
        salePrice: Number(signSalePrice),
        paymentPlanId: signPaymentPlanId || undefined,
      },
      { onSuccess: () => { closeDrawer(); } },
    );
  }

  function startEditingDeposit() {
    if (!r) return;
    setDepositInput(String(r.depositAmount));
    updateDeposit.reset();
    setEditingDeposit(true);
  }

  function saveDeposit() {
    if (!r || !depositInput) return;
    updateDeposit.mutate(
      { id: r.id, depositAmount: Number(depositInput) },
      { onSuccess: () => setEditingDeposit(false) },
    );
  }

  return (
    <div>
      <PageHeader
        title="Reservations"
        subtitle={`${all.filter((x) => x.status === 'HELD' || x.status === 'CONFIRMED').length} active holds`}
        actions={
          <div className="flex items-center gap-2">
            {canWrite && <Button onClick={() => setCreating(true)}>+ New reservation</Button>}
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
                    {s === 'mine' ? 'My reservations' : 'Everyone'}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />
      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value as ReservationStatus | 'ALL')}>
          <option value="ALL">All statuses</option>
          {RESERVATION_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <span className="text-sm text-gray-400">{rows.length} shown</span>
      </Toolbar>
      <DataTable columns={columns} rows={rows} onRowClick={(x) => openRow(x.id)} />

      <Drawer open={!!r} onClose={closeDrawer} title={r?.number ?? ''}>
        {r && (
          <div className="space-y-5">
            <StatusBadge value={r.status} />
            <FieldGrid>
              <Field label="Contact">{contactLabel(contacts, r.contactId)}</Field>
              <Field label="Agent">{userLabel(users, r.agentId)}</Field>
              <Field label="Unit">{unitLabel(units, projects, r.unitId)}</Field>
              <Field label="Deposit">
                {editingDeposit ? (
                  <div className="flex items-center gap-2">
                    <TextInput
                      type="number"
                      className="w-32"
                      value={depositInput}
                      onChange={(e) => setDepositInput(e.target.value)}
                    />
                    <Button size="sm" disabled={updateDeposit.isPending} onClick={saveDeposit}>
                      {updateDeposit.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingDeposit(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{money(r.depositAmount)}</span>
                    {canWrite && !r.depositPaid && (r.status === 'HELD' || r.status === 'CONFIRMED') && (
                      <button className="text-xs text-[var(--era-navy)] hover:underline" onClick={startEditingDeposit}>
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </Field>
              <Field label="Deposit paid">{r.depositPaid ? 'Yes' : 'No'}</Field>
              <Field label="Created">{date(r.createdAt)}</Field>
              <Field label="Expires">{r.expiresAt ? date(r.expiresAt) : '—'}</Field>
            </FieldGrid>
            {updateDeposit.error && <p className="text-xs text-[var(--era-red)]">{updateDeposit.error.message}</p>}

            {!signing && (
              <div className="flex flex-wrap gap-2">
                {canWrite && !r.depositPaid && (r.status === 'HELD' || r.status === 'CONFIRMED') && (
                  <Button size="sm" disabled={confirmDeposit.isPending} onClick={() => confirmDeposit.mutate(r.id)}>
                    {confirmDeposit.isPending ? 'Marking…' : 'Mark deposit received'}
                  </Button>
                )}
                {canSign && r.status === 'CONFIRMED' && !hasContract && (
                  <Button size="sm" variant="secondary" onClick={startSigning}>
                    Convert to contract
                  </Button>
                )}
                {canWrite && (r.status === 'HELD' || r.status === 'CONFIRMED') && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cancelReservation.isPending}
                    onClick={() => cancelReservation.mutate(r.id)}
                  >
                    {cancelReservation.isPending ? 'Cancelling…' : 'Cancel'}
                  </Button>
                )}
              </div>
            )}
            {confirmDeposit.error && <p className="text-xs text-[var(--era-red)]">{confirmDeposit.error.message}</p>}
            {cancelReservation.error && <p className="text-xs text-[var(--era-red)]">{cancelReservation.error.message}</p>}

            {signing && (
              <div className="space-y-3 rounded-lg border border-gray-100 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Sign contract</p>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Sale price</span>
                  <TextInput
                    type="number"
                    className="mt-1 w-full"
                    value={signSalePrice}
                    onChange={(e) => setSignSalePrice(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Payment plan</span>
                  <Select className="mt-1 w-full" value={signPaymentPlanId} onChange={(e) => setSignPaymentPlanId(e.target.value)}>
                    <option value="">Select a payment plan</option>
                    {(paymentPlans ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </label>
                {!signSalePrice && <p className="text-xs text-[var(--era-red)]">Required: Sale price.</p>}
                {signContract.error && <p className="text-xs text-[var(--era-red)]">{signContract.error.message}</p>}
                <div className="flex gap-2">
                  <Button size="sm" disabled={!signSalePrice || signContract.isPending} onClick={submitSign}>
                    {signContract.isPending ? 'Signing…' : 'Sign contract'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSigning(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {r.status === 'HELD' && (
              <p className="text-xs text-gray-400">Waiting for Inventory to confirm the hold — refreshes automatically.</p>
            )}
            {hasContract && <p className="text-sm text-emerald-600">Contract created from this reservation.</p>}
          </div>
        )}
      </Drawer>

      <NewReservationDrawer open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
