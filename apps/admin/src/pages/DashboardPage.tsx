import { Link } from 'react-router';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { PageHeader, StatCard, Card, CardTitle, StatusBadge, Badge } from '@era/ui';
import { useApprovals } from '../data/ops';
import { useContacts, contactLabel, useLeads, useMyWork, groupLeadsByStage } from '../data/crm';
import { useContracts } from '../data/sales';
import { useCommissions, useFinanceStats, useInvoices, usePayments } from '../data/finance';
import { useProjects } from '../data/inventory';
import { useUsers } from '../data/identity';
import { computeAgentLeaderboard, contractedValue, hotLeadCount, pipelineValue } from '../lib/analytics';
import { money, pct, date, relDays, titleCase } from '../lib/format';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function DashboardPage() {
  const { data: contacts } = useContacts();
  const { data: leads } = useLeads();
  const { data: contracts } = useContracts();
  const { data: invoices } = useInvoices();
  const { data: payments } = usePayments();
  const { data: financeStats } = useFinanceStats();
  const { data: projects } = useProjects();
  const { data: pendingApprovals } = useApprovals({ status: 'PENDING' });
  const { data: users } = useUsers();
  const { data: commissions } = useCommissions();
  const { data: myWork } = useMyWork();

  const allLeads = leads ?? [];
  const allContracts = contracts ?? [];
  const allInvoices = invoices ?? [];
  const allPayments = payments ?? [];
  const allProjects = projects ?? [];

  const activeContracts = allContracts.filter((c) => c.status === 'ACTIVE' || c.status === 'COMPLETED');
  const arOutstanding = allInvoices
    .filter((i) => ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status))
    .reduce((a, i) => a + (i.total - i.amountPaid), 0);
  const overdueCount = allInvoices.filter((i) => i.status === 'OVERDUE').length;
  const available = allProjects.reduce((a, p) => a + p.available, 0);
  const reserved = allProjects.reduce((a, p) => a + p.reserved, 0);
  const sold = allProjects.reduce((a, p) => a + p.sold, 0);
  const absorption = sold + reserved === 0 ? 0 : ((sold + reserved) / (sold + reserved + available)) * 100;

  const k = {
    contractedValue: contractedValue(allContracts),
    contractCount: activeContracts.length,
    collected: financeStats?.totalCollected ?? 0,
    arOutstanding,
    overdueCount,
    pipelineValue: pipelineValue(allLeads),
    hotLeads: hotLeadCount(allLeads),
    pendingApprovals: pendingApprovals?.length ?? 0,
    available,
    reserved,
    sold,
    absorption,
  };

  const funnel = groupLeadsByStage(allLeads).filter((s) => !['WON', 'LOST'].includes(s.stage));
  const top = computeAgentLeaderboard(users ?? [], allLeads, allContracts, commissions ?? []).slice(0, 5);
  const recent = [...allContracts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const now = Date.now();
  const myTasks = myWork ?? [];
  const overdueMyTasks = myTasks.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < now).length;

  const monthly: Record<string, number> = {};
  for (const p of allPayments) {
    const m = p.receivedAt.slice(0, 7);
    monthly[m] = (monthly[m] ?? 0) + p.amount;
  }
  const months = Object.keys(monthly).sort().slice(-6);

  return (
    <div>
      <PageHeader title="Executive dashboard" subtitle="ERA Cambodia — live sales, inventory & collections" />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Contracted value" value={money(k.contractedValue, { compact: true })} hint={`${k.contractCount} contracts`} tone="navy" />
        <StatCard label="Collected" value={money(k.collected, { compact: true })} tone="green" />
        <StatCard label="AR outstanding" value={money(k.arOutstanding, { compact: true })} hint={`${k.overdueCount} overdue`} tone="amber" />
        <StatCard label="Pipeline (weighted)" value={money(k.pipelineValue, { compact: true })} hint={`${k.hotLeads} hot leads`} tone="red" />
      </div>

      {(k.pendingApprovals > 0 || k.overdueCount > 0) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {k.pendingApprovals > 0 && (
            <Link to="/approvals">
              <Badge tone="amber">⚠ {k.pendingApprovals} approvals awaiting decision</Badge>
            </Link>
          )}
          {k.overdueCount > 0 && (
            <Link to="/invoices">
              <Badge tone="red">⚠ {k.overdueCount} overdue invoices</Badge>
            </Link>
          )}
        </div>
      )}

      {myTasks.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <CardTitle>My work today</CardTitle>
            <div className="flex items-center gap-2">
              {overdueMyTasks > 0 && <Badge tone="red">{overdueMyTasks} overdue</Badge>}
              <Link to="/tasks" className="text-sm font-medium text-[var(--era-navy)] hover:text-[var(--era-red)]">
                View all tasks →
              </Link>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {myTasks.slice(0, 5).map((t) => {
              const overdue = !!t.dueAt && new Date(t.dueAt).getTime() < now;
              return (
                <div key={t.id} className="flex items-center justify-between border-b border-gray-50 py-1.5 text-sm last:border-0">
                  <span className="text-gray-700">
                    {t.subject}
                    {t.lead && <span className="text-gray-400"> · {t.lead.contact.name}</span>}
                  </span>
                  {t.dueAt && <Badge tone={overdue ? 'red' : 'amber'}>{relDays(t.dueAt, now)}</Badge>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Inventory</CardTitle>
          <div className="mt-3 h-52">
            <Doughnut
              data={{
                labels: ['Available', 'Reserved', 'Sold'],
                datasets: [
                  {
                    data: [k.available, k.reserved, k.sold],
                    backgroundColor: ['#10B981', '#F59E0B', '#EF2D2C'],
                    borderColor: '#fff',
                    borderWidth: 2,
                  },
                ],
              }}
              options={{ plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-gray-500">{pct(k.absorption)} absorbed</p>
        </Card>

        <Card>
          <CardTitle>Monthly collections</CardTitle>
          <div className="mt-3 h-52">
            <Bar
              data={{
                labels: months,
                datasets: [
                  {
                    label: 'Collected',
                    data: months.map((m) => monthly[m] ?? 0),
                    backgroundColor: '#001F5B',
                    borderRadius: 4,
                  },
                ],
              }}
              options={{
                plugins: { legend: { display: false } },
                maintainAspectRatio: false,
                scales: { y: { ticks: { callback: (v) => `$${Number(v) / 1000}k` } } },
              }}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>Pipeline</CardTitle>
          <div className="mt-3 space-y-2">
            {funnel.map((f) => {
              const max = Math.max(...funnel.map((x) => x.count), 1);
              return (
                <div key={f.stage} className="flex items-center gap-2 text-sm">
                  <span className="w-24 text-gray-500">{titleCase(f.stage)}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded bg-gray-100">
                    <div className="h-full bg-[var(--era-navy)]" style={{ width: `${(f.count / max) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right">{f.count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Top agents</CardTitle>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {top.map((r) => (
                <tr key={r.agent.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 font-medium text-[var(--era-navy)]">{r.agent.name}</td>
                  <td className="py-2 text-right text-gray-500">{r.deals} deals</td>
                  <td className="py-2 text-right font-semibold">{money(r.revenue, { compact: true })}</td>
                  <td className="py-2 text-right">
                    <Badge tone={r.attainment >= 100 ? 'green' : 'amber'}>{pct(r.attainment)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardTitle>Recent contracts</CardTitle>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {recent.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2">
                    <Link to={`/contracts/${c.id}`} className="font-medium text-[var(--era-navy)] hover:text-[var(--era-red)]">
                      {c.number}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-500">{contactLabel(contacts, c.contactId)}</td>
                  <td className="py-2 text-right">{money(c.netPrice, { compact: true })}</td>
                  <td className="py-2 text-right text-xs text-gray-400">{date(c.createdAt)}</td>
                  <td className="py-2 text-right">
                    <StatusBadge value={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
