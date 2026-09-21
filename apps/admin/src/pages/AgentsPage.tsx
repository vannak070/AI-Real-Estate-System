import { PageHeader, StatCard, DataTable, Badge, type Column } from '@era/ui';
import { useUsers } from '../data/identity';
import { useLeads } from '../data/crm';
import { useContracts } from '../data/sales';
import { useCommissions } from '../data/finance';
import { computeAgentLeaderboard, type AgentStats } from '../lib/analytics';
import { money, pct, num } from '../lib/format';

export function AgentsPage() {
  const { data: users } = useUsers();
  const { data: leads } = useLeads();
  const { data: contracts } = useContracts();
  const { data: commissions } = useCommissions();

  const board = computeAgentLeaderboard(users ?? [], leads ?? [], contracts ?? [], commissions ?? []);

  const totalRevenue = board.reduce((a, r) => a + r.revenue, 0);
  const totalTarget = board.reduce((a, r) => a + r.target, 0);
  const commissionPayable = (commissions ?? [])
    .filter((c) => c.status === 'APPROVED')
    .reduce((a, c) => a + c.amount, 0);

  type Row = AgentStats & { id: string };
  const rows: Row[] = board.map((r) => ({ ...r, id: r.agent.id }));

  const columns: Column<Row>[] = [
    {
      key: 'agent',
      header: 'Agent',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: r.agent.avatarColor ?? '#001F5B' }}
          >
            {r.agent.name
              .split(' ')
              .map((p) => p[0])
              .join('')}
          </span>
          <span>
            <span className="font-semibold text-[var(--era-navy)]">{r.agent.name}</span>
            <span className="ml-1 text-xs text-gray-400">{r.agent.role.key === 'SALES_MANAGER' ? 'Manager' : 'Agent'}</span>
          </span>
        </div>
      ),
    },
    { key: 'leads', header: 'Leads', align: 'right', render: (r) => num(r.leads) },
    { key: 'deals', header: 'Deals', align: 'right', render: (r) => r.deals },
    { key: 'conv', header: 'Conv.', align: 'right', render: (r) => pct(r.conversion) },
    { key: 'rev', header: 'Revenue', align: 'right', render: (r) => <b>{money(r.revenue)}</b> },
    { key: 'target', header: 'Target', align: 'right', render: (r) => money(r.target) },
    {
      key: 'att',
      header: 'Attainment',
      align: 'right',
      render: (r) => (
        <Badge tone={r.attainment >= 100 ? 'green' : r.attainment >= 60 ? 'amber' : 'red'}>{pct(r.attainment)}</Badge>
      ),
    },
    { key: 'com', header: 'Commission', align: 'right', render: (r) => money(r.commission) },
  ];

  return (
    <div>
      <PageHeader title="Agents & performance" subtitle={`${board.length} sales staff`} />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Team revenue" value={money(totalRevenue, { compact: true })} tone="green" />
        <StatCard label="Team target" value={money(totalTarget, { compact: true })} />
        <StatCard label="Attainment" value={pct(totalTarget ? (totalRevenue / totalTarget) * 100 : 0)} tone="amber" />
        <StatCard label="Commission payable" value={money(commissionPayable, { compact: true })} />
      </div>
      <DataTable columns={columns} rows={rows} />
    </div>
  );
}
