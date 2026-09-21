import { PageHeader, Card, CardTitle, DataTable, Badge, type Column } from '@era/ui';
import { useArAging } from '../data/finance';
import { useLeads, groupLeadsByStage } from '../data/crm';
import { useProjects } from '../data/inventory';
import { useCampaigns } from '../data/marketing';
import { useContracts } from '../data/sales';
import { useUsers } from '../data/identity';
import { useCommissions } from '../data/finance';
import { computeAgentLeaderboard, computeCampaignStats } from '../lib/analytics';
import { money, pct, num, titleCase } from '../lib/format';

type ProjectRow = NonNullable<ReturnType<typeof useProjects>['data']>[number];
type CampaignRow = NonNullable<ReturnType<typeof useCampaigns>['data']>[number];

export function ReportsPage() {
  const { data: aging } = useArAging();
  const { data: leads } = useLeads();
  const { data: projects } = useProjects();
  const { data: campaigns } = useCampaigns();
  const { data: contracts } = useContracts();
  const { data: users } = useUsers();
  const { data: commissions } = useCommissions();

  const allLeads = leads ?? [];
  const allContracts = contracts ?? [];
  const agingBuckets = aging ?? { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
  const agingMax = Math.max(...Object.values(agingBuckets), 1);
  const funnel = groupLeadsByStage(allLeads).filter((s) => !['WON', 'LOST'].includes(s.stage));
  const funnelMax = Math.max(...funnel.map((f) => f.count), 1);

  const projRows = projects ?? [];
  const projCols: Column<ProjectRow>[] = [
    { key: 'name', header: 'Project', render: (r) => <span className="font-semibold text-[var(--era-navy)]">{r.name}</span> },
    { key: 'units', header: 'Units', align: 'right', render: (r) => r.totalUnits },
    { key: 'sold', header: 'Sold+Res', align: 'right', render: (r) => r.totalUnits - r.available },
    { key: 'abs', header: 'Absorption', align: 'right', render: (r) => <Badge tone={r.absorption > 50 ? 'green' : 'amber'}>{pct(r.absorption)}</Badge> },
    { key: 'gdv', header: 'GDV', align: 'right', render: (r) => money(r.gdv, { compact: true }) },
    { key: 'sv', header: 'Sold value', align: 'right', render: (r) => money(r.soldValue, { compact: true }) },
  ];

  const campRows = [...(campaigns ?? [])].sort((a, b) => {
    const sa = computeCampaignStats(a.id, allLeads, allContracts);
    const sb = computeCampaignStats(b.id, allLeads, allContracts);
    return sb.revenue - b.spend - (sa.revenue - a.spend);
  });

  const leaderboard = computeAgentLeaderboard(users ?? [], allLeads, allContracts, commissions ?? []);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales, collections, pipeline & marketing" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>AR aging</CardTitle>
          <div className="mt-3 space-y-2">
            {(
              [
                ['Current', agingBuckets.current, 'bg-emerald-500'],
                ['1–30 days', agingBuckets.d30, 'bg-amber-400'],
                ['31–60 days', agingBuckets.d60, 'bg-amber-500'],
                ['61–90 days', agingBuckets.d90, 'bg-red-400'],
                ['90+ days', agingBuckets.d90plus, 'bg-red-600'],
              ] as const
            ).map(([label, val, color]) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-gray-500">{label}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-gray-100">
                  <div className={`h-full ${color}`} style={{ width: `${(val / agingMax) * 100}%` }} />
                </div>
                <span className="w-24 text-right tabular-nums">{money(val)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Pipeline funnel</CardTitle>
          <div className="mt-3 space-y-2">
            {funnel.map((f) => (
              <div key={f.stage} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-gray-500">{titleCase(f.stage)}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-gray-100">
                  <div className="h-full bg-[var(--era-navy)]" style={{ width: `${(f.count / funnelMax) * 100}%` }} />
                </div>
                <span className="w-20 text-right tabular-nums">
                  {f.count} · {money(f.value, { compact: true })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-gray-500">Sales by project</h3>
      <DataTable columns={projCols} rows={projRows} />

      <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-gray-500">Campaign ROI</h3>
      <DataTable
        columns={[
          { key: 'n', header: 'Campaign', render: (c: CampaignRow) => c.name },
          { key: 'p', header: 'Channel', render: (c: CampaignRow) => titleCase(c.platform) },
          { key: 's', header: 'Spend', align: 'right', render: (c: CampaignRow) => money(c.spend) },
          { key: 'l', header: 'Leads', align: 'right', render: (c: CampaignRow) => num(computeCampaignStats(c.id, allLeads, allContracts).leads) },
          { key: 'd', header: 'Deals', align: 'right', render: (c: CampaignRow) => computeCampaignStats(c.id, allLeads, allContracts).deals },
          { key: 'r', header: 'Revenue', align: 'right', render: (c: CampaignRow) => money(computeCampaignStats(c.id, allLeads, allContracts).revenue) },
          {
            key: 'roi',
            header: 'ROI',
            align: 'right',
            render: (c: CampaignRow) => {
              const revenue = computeCampaignStats(c.id, allLeads, allContracts).revenue;
              return (
                <Badge tone={revenue > c.spend ? 'green' : 'red'}>
                  {pct(((revenue - c.spend) / Math.max(c.spend, 1)) * 100)}
                </Badge>
              );
            },
          },
        ]}
        rows={campRows}
      />

      <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-gray-500">Agent performance</h3>
      <DataTable
        columns={[
          { key: 'a', header: 'Agent', render: (r) => r.agent.name },
          { key: 'l', header: 'Leads', align: 'right', render: (r) => r.leads },
          { key: 'd', header: 'Deals', align: 'right', render: (r) => r.deals },
          { key: 'c', header: 'Conversion', align: 'right', render: (r) => pct(r.conversion) },
          { key: 'rev', header: 'Revenue', align: 'right', render: (r) => money(r.revenue) },
          { key: 'att', header: 'vs target', align: 'right', render: (r) => pct(r.attainment) },
        ]}
        rows={leaderboard.map((r) => ({ ...r, id: r.agent.id }))}
      />
    </div>
  );
}
