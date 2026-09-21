import { useState } from 'react';
import { Link, useParams } from 'react-router';
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
  Button,
  Select,
  TextInput,
  type Column,
} from '@era/ui';
import { useCompleteContract, useCompleteMilestone, useContract, useTerminateContract, useUpdateMilestone } from '../data/sales';
import {
  useCommissions,
  useInvoices,
  useIssueInvoice,
  usePayments,
  useReceipts,
  useRecordPayment,
} from '../data/finance';
import { useDocuments } from '../data/ops';
import { useCan } from '../store/auth';
import { contactLabel, useContacts } from '../data/crm';
import { userLabel, useUsers } from '../data/identity';
import { unitLabel, useProjects, useUnits } from '../data/inventory';
import { money, date, titleCase, relDays } from '../lib/format';
import { PAYMENT_METHODS, type PaymentMethod } from '../data/types';

type InvoiceRow = NonNullable<ReturnType<typeof useInvoices>['data']>[number];
type MilestoneRow = NonNullable<ReturnType<typeof useContract>['data']>['milestones'][number];

export function ContractDetailPage() {
  const { id = '' } = useParams();
  const { data: c } = useContract(id);
  const canFinance = useCan('finance:write');
  const canCommission = useCan('commission:approve');
  const canSign = useCan('sales:sign');
  const [tab, setTab] = useState('schedule');
  const [payFor, setPayFor] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [ref, setRef] = useState('');
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneDueInput, setMilestoneDueInput] = useState('');

  const { data: contacts } = useContacts();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const { data: projects } = useProjects();
  const { data: documents } = useDocuments({ refType: 'CONTRACT', refId: id });

  const { data: invoices } = useInvoices({ contractId: id });
  const { data: payments } = usePayments({ contractId: id });
  const { data: receipts } = useReceipts({ contractId: id });
  const { data: commissions } = useCommissions({ contractId: id });
  const issueInvoice = useIssueInvoice();
  const recordPayment = useRecordPayment();
  const completeMilestone = useCompleteMilestone();
  const updateMilestone = useUpdateMilestone();
  const terminateContract = useTerminateContract();
  const completeContract = useCompleteContract();

  if (!c) return <p>Contract not found. <Link to="/contracts" className="text-[var(--era-red)]">Back</Link></p>;

  function startEditingMilestone(m: MilestoneRow) {
    setEditingMilestoneId(m.id);
    setMilestoneDueInput(m.dueDate ? String(m.dueDate).slice(0, 10) : '');
    updateMilestone.reset();
  }

  function saveMilestoneDue(milestoneId: string) {
    updateMilestone.mutate(
      { id: milestoneId, dueDate: milestoneDueInput ? new Date(milestoneDueInput) : null },
      { onSuccess: () => setEditingMilestoneId(null) },
    );
  }

  const invoiceRows = invoices ?? [];
  const paymentRows = payments ?? [];
  const receiptRows = receipts ?? [];
  const milestones = c.milestones;
  const docs = documents ?? [];
  const commission = (commissions ?? [])[0];
  const payInv = payFor ? invoiceRows.find((i) => i.id === payFor) : null;

  const billed = invoiceRows.reduce((a, i) => a + i.total, 0);
  const paid = invoiceRows.reduce((a, i) => a + i.amountPaid, 0);
  const overdue = invoiceRows
    .filter((i) => i.status === 'OVERDUE')
    .reduce((a, i) => a + (i.total - i.amountPaid), 0);

  const invCols: Column<InvoiceRow>[] = [
    { key: 'no', header: 'Invoice', render: (i) => i.number },
    { key: 'label', header: 'Instalment', render: (i) => i.label },
    { key: 'due', header: 'Due', render: (i) => date(i.dueDate) },
    { key: 'amount', header: 'Amount', align: 'right', render: (i) => money(i.total) },
    { key: 'paid', header: 'Paid', align: 'right', render: (i) => money(i.amountPaid) },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge value={i.status} /> },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: (i) =>
        !canFinance ? null : i.status === 'DRAFT' ? (
          <Button size="sm" variant="ghost" onClick={() => issueInvoice.mutate(i.id)}>
            Issue
          </Button>
        ) : i.status !== 'PAID' && i.status !== 'CANCELLED' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setPayFor(i.id);
              setRef(`TT${Math.floor(100000 + Math.random() * 899999)}`);
            }}
          >
            Record payment
          </Button>
        ) : null,
    },
  ];

  const msCols: Column<MilestoneRow>[] = [
    { key: 'label', header: 'Milestone', render: (m) => <span className="font-medium">{m.label}</span> },
    {
      key: 'due',
      header: 'Target',
      render: (m) =>
        editingMilestoneId === m.id ? (
          <TextInput type="date" value={milestoneDueInput} onChange={(e) => setMilestoneDueInput(e.target.value)} />
        ) : m.dueDate ? (
          `${date(m.dueDate)} (${relDays(m.dueDate, Date.now())})`
        ) : (
          '—'
        ),
    },
    { key: 'status', header: 'Status', render: (m) => <StatusBadge value={m.status} /> },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: (m) =>
        editingMilestoneId === m.id ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" disabled={updateMilestone.isPending} onClick={() => saveMilestoneDue(m.id)}>
              {updateMilestone.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingMilestoneId(null)}>
              Cancel
            </Button>
          </div>
        ) : m.status === 'PENDING' ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => startEditingMilestone(m)}>
              Edit date
            </Button>
            <Button size="sm" variant="ghost" disabled={completeMilestone.isPending} onClick={() => completeMilestone.mutate(m.id)}>
              {completeMilestone.isPending ? 'Marking…' : 'Mark done'}
            </Button>
          </div>
        ) : (
          date(m.completedAt)
        ),
    },
  ];

  return (
    <div>
      <Link to="/contracts" className="text-sm text-gray-500 hover:text-[var(--era-red)]">
        ← Contracts
      </Link>
      <PageHeader
        title={c.number}
        subtitle={`${contactLabel(contacts, c.contactId)} · ${unitLabel(units, projects, c.unitId)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge value={c.status} />
            {canSign && c.status === 'ACTIVE' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={completeContract.isPending}
                  onClick={() => completeContract.mutate(c.id)}
                >
                  {completeContract.isPending ? 'Marking…' : 'Mark completed'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={terminateContract.isPending}
                  onClick={() => terminateContract.mutate(c.id)}
                >
                  {terminateContract.isPending ? 'Terminating…' : 'Terminate'}
                </Button>
              </>
            )}
          </div>
        }
      />
      {(terminateContract.error || completeContract.error) && (
        <p className="mb-4 text-xs text-[var(--era-red)]">
          {(terminateContract.error ?? completeContract.error)?.message}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Net price" value={money(c.netPrice)} hint={c.discountAmount ? `disc ${money(c.discountAmount)}` : undefined} />
        <StatCard label="Collected" value={money(paid)} tone="green" hint={`${((paid / billed) * 100 || 0).toFixed(0)}% of billed`} />
        <StatCard label="Outstanding" value={money(billed - paid)} tone="amber" />
        <StatCard label="Overdue" value={money(overdue)} tone="red" />
      </div>

      <div className="mb-6 rounded-xl border border-black/5 bg-white p-4 shadow-sm">
        <FieldGrid>
          <Field label="Buyer">{contactLabel(contacts, c.contactId)}</Field>
          <Field label="Agent">{userLabel(users, c.agentId)}</Field>
          <Field label="Unit">{unitLabel(units, projects, c.unitId)}</Field>
          <Field label="Payment plan">{c.paymentPlan.name}</Field>
          <Field label="Signed">{c.signedAt ? date(c.signedAt) : '—'}</Field>
          <Field label="Created">{date(c.createdAt)}</Field>
        </FieldGrid>
      </div>

      <Tabs
        tabs={[
          { id: 'schedule', label: `Schedule (${invoiceRows.length})` },
          { id: 'milestones', label: `Milestones (${milestones.filter((m) => m.status === 'DONE').length}/${milestones.length})` },
          { id: 'payments', label: `Payments (${paymentRows.length})` },
          { id: 'docs', label: `Documents (${docs.length})` },
          { id: 'commission', label: 'Commission' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'schedule' && <DataTable columns={invCols} rows={invoiceRows} empty="No invoices." />}
      {tab === 'milestones' && (
        <>
          <DataTable columns={msCols} rows={milestones} empty="No milestones." />
          {(completeMilestone.error || updateMilestone.error) && (
            <p className="mt-2 text-xs text-[var(--era-red)]">
              {(completeMilestone.error ?? updateMilestone.error)?.message}
            </p>
          )}
        </>
      )}
      {tab === 'payments' && (
        <DataTable
          columns={[
            { key: 'no', header: 'Payment', render: (p) => p.number },
            { key: 'method', header: 'Method', render: (p) => titleCase(p.method) },
            { key: 'ref', header: 'Reference', render: (p) => p.reference },
            { key: 'date', header: 'Received', render: (p) => date(p.receivedAt) },
            { key: 'amt', header: 'Amount', align: 'right', render: (p) => money(p.amount) },
            {
              key: 'rcp',
              header: 'Receipt',
              render: (p) => receiptRows.find((r) => r.paymentId === p.id)?.number ?? '—',
            },
          ]}
          rows={paymentRows}
          empty="No payments recorded."
        />
      )}
      {tab === 'docs' && (
        <div className="space-y-1">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-4 py-2 text-sm shadow-sm">
              <span>{d.name}</span>
              <Badge tone="slate">{titleCase(d.type)}</Badge>
            </div>
          ))}
          {docs.length === 0 && <p className="text-sm text-gray-400">No documents.</p>}
        </div>
      )}
      {tab === 'commission' && (
        <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
          {commission ? (
            <div className="space-y-4">
              <FieldGrid>
                <Field label="Agent">{userLabel(users, commission.agentId)}</Field>
                <Field label="Basis">{money(commission.basis)}</Field>
                <Field label="Rate">{commission.ratePct}%</Field>
                <Field label="Amount">
                  <b>{money(commission.amount)}</b>
                </Field>
                <Field label="Status">
                  <StatusBadge value={commission.status} />
                </Field>
                <Field label="Paid">{commission.paidAt ? date(commission.paidAt) : '—'}</Field>
              </FieldGrid>
              {canCommission && (
                <div className="flex gap-2">
                  {commission.status === 'ACCRUED' && (
                    <p className="text-sm text-gray-400">Approve/mark paid from the Commissions screen.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Commission accrues when the contract is signed.</p>
          )}
        </div>
      )}

      <Drawer
        open={!!payInv}
        onClose={() => { setPayFor(null); setMethod('BANK_TRANSFER'); setRef(''); }}
        title={`Record payment · ${payInv?.number ?? ''}`}
        width="max-w-md"
      >
        {payInv && (
          <div className="space-y-4">
            <FieldGrid>
              <Field label="Instalment">{payInv.label}</Field>
              <Field label="Due">{date(payInv.dueDate)}</Field>
              <Field label="Invoice total">{money(payInv.total)}</Field>
              <Field label="Already paid">{money(payInv.amountPaid)}</Field>
            </FieldGrid>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Method</label>
              <div className="mt-1">
                <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {titleCase(m)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Reference</label>
              <TextInput value={ref} onChange={(e) => setRef(e.target.value)} className="mt-1" />
            </div>
            {recordPayment.error && <p className="text-xs text-[var(--era-red)]">{recordPayment.error.message}</p>}
            <Button
              disabled={recordPayment.isPending}
              onClick={() => {
                recordPayment.mutate(
                  {
                    invoiceId: payInv.id,
                    method,
                    reference: ref || undefined,
                    amount: payInv.total - payInv.amountPaid,
                  },
                  {
                    onSuccess: () => {
                      setPayFor(null);
                      setMethod('BANK_TRANSFER');
                      setRef('');
                    },
                  },
                );
              }}
            >
              {recordPayment.isPending ? 'Recording…' : `Record ${money(payInv.total - payInv.amountPaid)} & issue receipt`}
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
