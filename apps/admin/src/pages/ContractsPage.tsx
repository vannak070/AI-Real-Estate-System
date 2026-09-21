import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { PageHeader, DataTable, StatusBadge, Badge, Select, TextInput, Toolbar, type Column } from '@era/ui';
import { useContracts } from '../data/sales';
import { useContractBalances } from '../data/finance';
import { useAuth, useCan } from '../store/auth';
import { useContacts, contactLabel } from '../data/crm';
import { useUsers, userLabel } from '../data/identity';
import { useProjects, useUnits, unitLabel } from '../data/inventory';
import { money, date } from '../lib/format';
import { CONTRACT_STATUSES, type ContractStatus } from '../data/types';

type ContractRow = NonNullable<ReturnType<typeof useContracts>['data']>[number];

export function ContractsPage() {
  const nav = useNavigate();
  const canSeeAll = useCan('sales:read:all');
  const { user } = useAuth();
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [status, setStatus] = useState<ContractStatus | 'ALL'>('ALL');
  const [q, setQ] = useState('');

  const { data: contracts } = useContracts(canSeeAll && scope === 'mine' ? { agentId: user?.id } : undefined);
  const { data: contacts } = useContacts();
  const { data: users } = useUsers();
  const { data: units } = useUnits();
  const { data: projects } = useProjects();

  const all = contracts ?? [];
  const contractIds = useMemo(() => (contracts ?? []).map((c) => c.id), [contracts]);
  const { data: balances } = useContractBalances(contractIds);

  const needle = q.trim().toLowerCase();
  const rows = all.filter((c) => {
    if (status !== 'ALL' && c.status !== status) return false;
    if (!needle) return true;
    return (
      c.number.toLowerCase().includes(needle) ||
      contactLabel(contacts, c.contactId).toLowerCase().includes(needle) ||
      unitLabel(units, projects, c.unitId).toLowerCase().includes(needle)
    );
  });
  const emptyBalance = { billed: 0, paid: 0, outstanding: 0, overdue: 0 };

  const columns: Column<ContractRow>[] = [
    { key: 'no', header: 'Number', render: (c) => <span className="font-semibold text-[var(--era-navy)]">{c.number}</span> },
    { key: 'buyer', header: 'Buyer', render: (c) => contactLabel(contacts, c.contactId) },
    { key: 'unit', header: 'Unit', render: (c) => unitLabel(units, projects, c.unitId) },
    { key: 'net', header: 'Net price', align: 'right', render: (c) => <b>{money(c.netPrice)}</b> },
    {
      key: 'collected',
      header: 'Collected',
      align: 'right',
      render: (c) => {
        const b = balances?.[c.id] ?? emptyBalance;
        return `${money(b.paid, { compact: true })} / ${money(b.billed, { compact: true })}`;
      },
    },
    {
      key: 'overdue',
      header: 'Overdue',
      align: 'right',
      render: (c) => {
        const b = balances?.[c.id] ?? emptyBalance;
        return b.overdue > 0 ? <Badge tone="red">{money(b.overdue, { compact: true })}</Badge> : '—';
      },
    },
    { key: 'agent', header: 'Agent', render: (c) => userLabel(users, c.agentId) },
    { key: 'signed', header: 'Signed', render: (c) => (c.signedAt ? date(c.signedAt) : '—') },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
  ];

  const activeContracts = all.filter((c) => c.status === 'ACTIVE' || c.status === 'COMPLETED');

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle={`${all.filter((c) => c.status === 'ACTIVE').length} active · ${money(
          activeContracts.reduce((a, c) => a + c.netPrice, 0),
          { compact: true },
        )} contracted value`}
        actions={
          canSeeAll && (
            <div className="flex overflow-hidden rounded-lg border border-gray-200">
              {(['mine', 'all'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`px-3 py-1.5 text-sm font-medium ${
                    scope === s ? 'bg-[var(--era-navy)] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s === 'mine' ? 'My contracts' : 'Everyone'}
                </button>
              ))}
            </div>
          )
        }
      />
      <Toolbar>
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <TextInput placeholder="Search number, buyer, or unit…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as ContractStatus | 'ALL')}>
          <option value="ALL">All statuses</option>
          {CONTRACT_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <span className="text-sm text-gray-400">{rows.length} shown</span>
      </Toolbar>
      <DataTable columns={columns} rows={rows} onRowClick={(c) => nav(`/contracts/${c.id}`)} />
    </div>
  );
}
