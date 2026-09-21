import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader, StatCard, DataTable, StatusBadge, Badge, Select, Toolbar, Button, type Column } from '@era/ui';
import { useArAging, useInvoices } from '../data/finance';
import { useContacts, contactLabel } from '../data/crm';
import { money, date } from '../lib/format';
import type { InvoiceStatus } from '../data/types';

type InvoiceRow = NonNullable<ReturnType<typeof useInvoices>['data']>[number];
type StatusFilter = InvoiceStatus | 'OUTSTANDING' | 'ALL';

export function InvoicesPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<StatusFilter>('OUTSTANDING');

  const { data: invoices } = useInvoices(
    status === 'OUTSTANDING' ? { outstandingOnly: true } : status === 'ALL' ? {} : { status },
  );
  const { data: aging } = useArAging();
  const { data: contacts } = useContacts();

  const rows = invoices ?? [];
  const totalOutstanding = rows.reduce((a, i) => a + (i.total - i.amountPaid), 0);
  const overdueCount = rows.filter((i) => i.status === 'OVERDUE').length;

  const columns: Column<InvoiceRow>[] = [
    { key: 'no', header: 'Invoice', render: (i) => <span className="font-semibold text-[var(--era-navy)]">{i.number}</span> },
    { key: 'buyer', header: 'Buyer', render: (i) => contactLabel(contacts, i.contactId) },
    { key: 'label', header: 'Instalment', render: (i) => i.label },
    { key: 'due', header: 'Due', render: (i) => date(i.dueDate) },
    { key: 'total', header: 'Total', align: 'right', render: (i) => money(i.total) },
    { key: 'out', header: 'Outstanding', align: 'right', render: (i) => money(i.total - i.amountPaid) },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge value={i.status} /> },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: (i) => (
        <Button size="sm" variant="ghost" onClick={() => nav(`/contracts/${i.contractId}`)}>
          Open contract
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices & receivables"
        subtitle={`${money(totalOutstanding)} outstanding · ${overdueCount} overdue`}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Current" value={money(aging?.current ?? 0, { compact: true })} tone="green" />
        <StatCard label="1–30 days" value={money(aging?.d30 ?? 0, { compact: true })} tone="amber" />
        <StatCard label="31–60 days" value={money(aging?.d60 ?? 0, { compact: true })} tone="amber" />
        <StatCard label="61–90 days" value={money(aging?.d90 ?? 0, { compact: true })} tone="red" />
        <StatCard label="90+ days" value={money(aging?.d90plus ?? 0, { compact: true })} tone="red" />
      </div>

      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="OUTSTANDING">Outstanding</option>
          <option value="OVERDUE">Overdue</option>
          <option value="ISSUED">Issued</option>
          <option value="PAID">Paid</option>
          <option value="DRAFT">Draft</option>
          <option value="ALL">All</option>
        </Select>
        <span className="text-sm text-gray-400">{rows.length} shown</span>
        {overdueCount > 0 && <Badge tone="red">{overdueCount} demand letters to send</Badge>}
      </Toolbar>

      <DataTable columns={columns} rows={rows.slice(0, 150)} />
      {rows.length > 150 && <p className="mt-2 text-xs text-gray-400">Showing first 150.</p>}
    </div>
  );
}
