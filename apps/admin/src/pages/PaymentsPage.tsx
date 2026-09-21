import { PageHeader, StatCard, DataTable, Tabs, type Column } from '@era/ui';
import { useState } from 'react';
import { useFinanceStats, usePayments, useReceipts } from '../data/finance';
import { useContacts, contactLabel } from '../data/crm';
import { money, date, titleCase } from '../lib/format';

type PaymentRow = NonNullable<ReturnType<typeof usePayments>['data']>[number];
type ReceiptRow = NonNullable<ReturnType<typeof useReceipts>['data']>[number];

export function PaymentsPage() {
  const [tab, setTab] = useState('payments');
  const { data: payments } = usePayments();
  const { data: receipts } = useReceipts();
  const { data: stats } = useFinanceStats();
  const { data: contacts } = useContacts();

  const paymentRows = payments ?? [];
  const receiptRows = receipts ?? [];

  const payCols: Column<PaymentRow>[] = [
    { key: 'no', header: 'Payment', render: (p) => <span className="font-semibold text-[var(--era-navy)]">{p.number}</span> },
    { key: 'buyer', header: 'Buyer', render: (p) => contactLabel(contacts, p.contactId) },
    { key: 'method', header: 'Method', render: (p) => titleCase(p.method) },
    { key: 'ref', header: 'Reference', render: (p) => p.reference },
    { key: 'inv', header: 'Invoice', render: (p) => p.invoice?.number ?? '—' },
    { key: 'date', header: 'Received', render: (p) => date(p.receivedAt) },
    { key: 'amt', header: 'Amount', align: 'right', render: (p) => <b>{money(p.amount)}</b> },
  ];

  const rcpCols: Column<ReceiptRow>[] = [
    { key: 'no', header: 'Receipt', render: (r) => <span className="font-semibold text-[var(--era-navy)]">{r.number}</span> },
    { key: 'buyer', header: 'Buyer', render: (r) => contactLabel(contacts, r.contactId) },
    { key: 'pay', header: 'Payment', render: (r) => r.payment?.number ?? '—' },
    { key: 'date', header: 'Issued', render: (r) => date(r.issuedAt) },
    { key: 'amt', header: 'Amount', align: 'right', render: (r) => money(r.amount) },
  ];

  return (
    <div>
      <PageHeader title="Payments & receipts" subtitle={`${paymentRows.length} payments recorded`} />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total collected" value={money(stats?.totalCollected ?? 0, { compact: true })} tone="green" />
        <StatCard label="Collected this month" value={money(stats?.collectedThisMonth ?? 0, { compact: true })} />
        <StatCard label="Receipts issued" value={stats?.receiptsCount ?? 0} />
      </div>
      <Tabs
        tabs={[
          { id: 'payments', label: `Payments (${paymentRows.length})` },
          { id: 'receipts', label: `Receipts (${receiptRows.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'payments' ? (
        <DataTable columns={payCols} rows={paymentRows.slice(0, 120)} />
      ) : (
        <DataTable columns={rcpCols} rows={receiptRows.slice(0, 120)} />
      )}
    </div>
  );
}
