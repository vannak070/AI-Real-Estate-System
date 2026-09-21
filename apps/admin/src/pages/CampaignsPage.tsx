import { useState } from 'react';
import { PageHeader, StatCard, DataTable, StatusBadge, Badge, Tabs, type Column } from '@era/ui';
import { useCampaigns, useChannels } from '../data/marketing';
import { useLeads } from '../data/crm';
import { useContracts } from '../data/sales';
import { computeCampaignStats } from '../lib/analytics';
import { money, pct, titleCase } from '../lib/format';

type CampaignRow = NonNullable<ReturnType<typeof useCampaigns>['data']>[number];
type ChannelRow = NonNullable<ReturnType<typeof useChannels>['data']>[number];

const THIRTY_DAYS_MS = 30 * 86_400_000;

export function CampaignsPage() {
  const [tab, setTab] = useState('campaigns');
  const { data: campaigns } = useCampaigns();
  const { data: channels } = useChannels();
  const { data: leads } = useLeads();
  const { data: contracts } = useContracts();

  const campaignRows = campaigns ?? [];
  const channelRows = channels ?? [];
  const allLeads = leads ?? [];
  const allContracts = contracts ?? [];

  // Leads/deals/revenue aren't stored on Campaign — derived here from
  // crm.leads (Lead.campaignId) and sales.contracts (Contract.contactId),
  // the same "admin composes two clean API calls" pattern used elsewhere.
  const statsFor = (campaignId: string) => computeCampaignStats(campaignId, allLeads, allContracts);

  const totals = campaignRows.reduce(
    (a, c) => {
      const s = statsFor(c.id);
      a.spend += c.spend;
      a.revenue += s.revenue;
      a.leads += s.leads;
      return a;
    },
    { spend: 0, revenue: 0, leads: 0 },
  );

  const cols: Column<CampaignRow>[] = [
    { key: 'name', header: 'Campaign', render: (c) => <span className="font-semibold text-[var(--era-navy)]">{c.name}</span> },
    { key: 'platform', header: 'Channel', render: (c) => <Badge tone="slate">{titleCase(c.platform)}</Badge> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
    { key: 'budget', header: 'Budget', align: 'right', render: (c) => money(c.budget) },
    { key: 'spend', header: 'Spend', align: 'right', render: (c) => money(c.spend) },
    { key: 'leads', header: 'Leads', align: 'right', render: (c) => statsFor(c.id).leads },
    {
      key: 'cpl',
      header: 'CPL',
      align: 'right',
      render: (c) => money(c.spend / Math.max(statsFor(c.id).leads, 1)),
    },
    { key: 'deals', header: 'Deals', align: 'right', render: (c) => statsFor(c.id).deals },
    {
      key: 'roi',
      header: 'ROI',
      align: 'right',
      render: (c) => {
        const s = statsFor(c.id);
        return <b>{pct(((s.revenue - c.spend) / Math.max(c.spend, 1)) * 100)}</b>;
      },
    },
  ];

  const leads30dFor = (platform: ChannelRow['platform']) => {
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    return allLeads.filter((l) => l.source === platform && new Date(l.createdAt).getTime() >= cutoff).length;
  };

  return (
    <div>
      <PageHeader title="Marketing" subtitle={`${campaignRows.length} campaigns · ${channelRows.length} channels`} />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Spend" value={money(totals.spend, { compact: true })} />
        <StatCard label="Attributed revenue" value={money(totals.revenue, { compact: true })} tone="green" />
        <StatCard label="Leads generated" value={totals.leads} />
        <StatCard
          label="Blended ROI"
          value={pct(totals.spend ? ((totals.revenue - totals.spend) / totals.spend) * 100 : 0)}
          tone="amber"
        />
      </div>

      <Tabs
        tabs={[
          { id: 'campaigns', label: `Campaigns (${campaignRows.length})` },
          { id: 'channels', label: `Channels (${channelRows.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'campaigns' ? (
        <DataTable columns={cols} rows={campaignRows} />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {channelRows.map((ch) => (
            <div key={ch.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--era-navy)]">{titleCase(ch.platform)}</span>
                <Badge tone={ch.connected ? 'green' : 'red'}>{ch.connected ? 'connected' : 'offline'}</Badge>
              </div>
              <div className="mt-1 text-sm text-gray-500">{ch.name}</div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-gray-400">Leads / 30d</span>
                <span className="font-semibold">{leads30dFor(ch.platform)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-gray-400">AI auto-reply</span>
                <span>{ch.autoReply ? 'On' : 'Off'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
