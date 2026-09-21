import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader, StatCard, DataTable, StatusBadge, Select, Toolbar, Button, type Column } from '@era/ui';
import { useApproveCommission, useCommissions, useMarkCommissionPaid } from '../data/finance';
import { useCan } from '../store/auth';
import { useUsers, userLabel } from '../data/identity';
import { money, date } from '../lib/format';
import { COMMISSION_STATUSES, type CommissionStatus } from '../data/types';

type CommissionRow = NonNullable<ReturnType<typeof useCommissions>['data']>[number];
type StatusFilter = CommissionStatus | 'ALL';

export function CommissionsPage() {
  const canApprove = useCan('commission:approve');
  const nav = useNavigate();
  const [status, setStatus] = useState<StatusFilter>('ALL');

  const { data: commissions } = useCommissions(status === 'ALL' ? undefined : { status });
  const { data: users } = useUsers();
  const approve = useApproveCommission();
  const markPaid = useMarkCommissionPaid();

  const rows = commissions ?? [];
  const sum = (s: CommissionStatus) => rows.filter((c) => c.status === s).reduce((a, c) => a + c.amount, 0);

  const columns: Column<CommissionRow>[] = [
    { key: 'ctr', header: 'Contract', render: (c) => c.contractNumber },
    { key: 'agent', header: 'Agent', render: (c) => userLabel(users, c.agentId) },
    { key: 'basis', header: 'Basis', align: 'right', render: (c) => money(c.basis) },
    { key: 'rate', header: 'Rate', align: 'right', render: (c) => `${c.ratePct}%` },
    { key: 'amt', header: 'Amount', align: 'right', render: (c) => <b>{money(c.amount)}</b> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
    { key: 'paid', header: 'Paid', render: (c) => (c.paidAt ? date(c.paidAt) : '—') },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          {canApprove && c.status === 'ACCRUED' && (
            <Button size="sm" variant="ghost" onClick={() => approve.mutate(c.id)}>
              Approve
            </Button>
          )}
          {canApprove && c.status === 'APPROVED' && (
            <Button size="sm" variant="ghost" onClick={() => markPaid.mutate(c.id)}>
              Mark paid
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => nav(`/contracts/${c.contractId}`)}>
            Open
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Commissions" subtitle={`${rows.length} commission records`} />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Accrued" value={money(sum('ACCRUED'), { compact: true })} tone="amber" />
        <StatCard label="Approved (payable)" value={money(sum('APPROVED'), { compact: true })} />
        <StatCard label="Paid" value={money(sum('PAID'), { compact: true })} tone="green" />
      </div>
      <Toolbar>
        <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="ALL">All statuses</option>
          {COMMISSION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <span className="text-sm text-gray-400">{rows.length} shown</span>
      </Toolbar>
      <DataTable columns={columns} rows={rows} />
    </div>
  );
}
