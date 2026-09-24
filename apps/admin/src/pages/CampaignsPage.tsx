import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import { PageHeader, StatCard, DataTable, StatusBadge, Badge, Tabs, Drawer, Select, TextInput, Button, type Column } from '@era/ui';
import {
  CAMPAIGN_STATUSES,
  useCampaignStats,
  useCampaigns,
  useChannelOptions,
  useChannelStats,
  useChannels,
  useCreateCampaign,
  useCreateChannel,
  useDeleteCampaign,
  useDeleteChannel,
  useMessagingStatus,
  useUpdateCampaign,
  useUpdateChannel,
  type CampaignFormInput,
  type CampaignStatus,
  type ChannelRow,
} from '../data/marketing';
import { useCan } from '../store/auth';
import { campaignRoiPct, costPerLead } from '../lib/analytics';
import { money, pct, date, titleCase } from '../lib/format';

type CampaignRow = NonNullable<ReturnType<typeof useCampaigns>['data']>[number];

const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || `http://${window.location.hostname}:5173`;
const adLink = (code: string) => `${CLIENT_URL}/?utm_campaign=${code}`;

const dash = <span className="text-gray-400">—</span>;

/* ── Create / edit drawer ── */

interface FormState {
  name: string;
  channel: string;
  status: CampaignStatus;
  budget: string;
  spend: string;
  startDate: string;
  endDate: string;
}

const toForm = (c?: CampaignRow): FormState => ({
  name: c?.name ?? '',
  channel: c?.channel ?? '',
  status: c?.status ?? 'DRAFT',
  budget: c ? String(c.budget) : '',
  spend: c ? String(c.spend) : '',
  startDate: c?.startDate ? c.startDate.slice(0, 10) : '',
  endDate: c?.endDate ? c.endDate.slice(0, 10) : '',
});

const toInput = (f: FormState, channel: string): CampaignFormInput => ({
  name: f.name.trim(),
  channel,
  status: f.status,
  budget: f.budget ? Math.round(Number(f.budget)) : 0,
  spend: f.spend ? Math.round(Number(f.spend)) : 0,
  startDate: f.startDate ? new Date(f.startDate) : null,
  endDate: f.endDate ? new Date(f.endDate) : null,
});

function CopyLink({ link, title, children }: { link: string; title: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-[var(--era-navy)]/15 bg-[var(--era-navy)]/5 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--era-navy)]">{title}</div>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-sm text-gray-800">{link}</code>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-2 text-xs text-gray-500">{children}</p>
    </div>
  );
}

/** Mounted only while open, so it always starts from the latest saved campaign. */
function CampaignDrawer({ campaign, canWrite, onClose }: { campaign?: CampaignRow; canWrite: boolean; onClose: () => void }) {
  const [form, setForm] = useState<FormState>(() => toForm(campaign));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const remove = useDeleteCampaign();
  const { data: messaging } = useMessagingStatus();
  const bot = messaging?.telegram.botUsername;
  const { options: channelOptions, pickDefault } = useChannelOptions(campaign?.channel);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  // A new campaign starts on Facebook (or the first channel) once the channel list has loaded.
  const channel = form.channel || pickDefault('FACEBOOK');
  const missing = !form.name.trim() || !channel;
  const datesBackwards = !!form.startDate && !!form.endDate && form.endDate < form.startDate;
  const error = create.error ?? update.error ?? remove.error;
  const busy = create.isPending || update.isPending || remove.isPending;

  const save = () => {
    if (missing || datesBackwards) return;
    if (campaign) update.mutate({ id: campaign.id, ...toInput(form, channel) }, { onSuccess: onClose });
    else create.mutate(toInput(form, channel), { onSuccess: onClose });
  };

  const field = 'text-xs font-medium uppercase tracking-wide text-gray-400';

  return (
    <Drawer open onClose={onClose} title={campaign ? 'Edit campaign' : 'New campaign'}>
      <div className="space-y-4">
        {campaign && (
          <CopyLink title="Website ad link" link={adLink(campaign.code)}>
            Use this link in the ad. Any website page works too — add <code>?utm_campaign={campaign.code}</code> to its address.
            Enquiries and AI-chat leads from visitors who arrive this way (up to 30 days later) are linked to this campaign
            automatically.
          </CopyLink>
        )}
        {campaign && bot && (
          <CopyLink title="Telegram bot link" link={`https://t.me/${bot}?start=${campaign.code}`}>
            Opens a chat with the ERA Telegram bot. Leads the bot collects from people who start the chat through this link
            are linked to this campaign automatically.
          </CopyLink>
        )}
        <label className="block">
          <span className={field}>Name</span>
          <TextInput className="mt-1" value={form.name} disabled={!canWrite} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={field}>Channel</span>
            <Select className="mt-1 w-full" value={channel} disabled={!canWrite} onChange={(e) => set({ channel: e.target.value })}>
              {channelOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                  {c.active ? '' : ' (hidden)'}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className={field}>Status</span>
            <Select className="mt-1 w-full" value={form.status} disabled={!canWrite} onChange={(e) => set({ status: e.target.value as CampaignStatus })}>
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className={field}>Budget (USD)</span>
            <TextInput type="number" min={0} className="mt-1" value={form.budget} disabled={!canWrite} onChange={(e) => set({ budget: e.target.value })} />
          </label>
          <label className="block">
            <span className={field}>Spend so far (USD)</span>
            <TextInput type="number" min={0} className="mt-1" value={form.spend} disabled={!canWrite} onChange={(e) => set({ spend: e.target.value })} />
          </label>
          <label className="block">
            <span className={field}>Start date</span>
            <TextInput type="date" className="mt-1" value={form.startDate} disabled={!canWrite} onChange={(e) => set({ startDate: e.target.value })} />
          </label>
          <label className="block">
            <span className={field}>End date</span>
            <TextInput type="date" className="mt-1" value={form.endDate} disabled={!canWrite} onChange={(e) => set({ endDate: e.target.value })} />
          </label>
        </div>
        {!campaign && <p className="text-xs text-gray-500">The ad link is created when you save.</p>}
        {missing && <p className="text-xs text-[var(--era-red)]">Required: Name.</p>}
        {datesBackwards && <p className="text-xs text-[var(--era-red)]">End date must be on or after the start date.</p>}
        {error && <p className="text-xs text-[var(--era-red)]">{error.message}</p>}
        {canWrite && (
          <div className="flex items-center justify-between gap-2">
            <Button onClick={save} disabled={missing || datesBackwards || busy}>
              {campaign ? 'Save changes' : 'Create campaign'}
            </Button>
            {campaign && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => (confirmingDelete ? remove.mutate(campaign.id, { onSuccess: onClose }) : setConfirmingDelete(true))}
              >
                {confirmingDelete ? 'Click again to delete' : 'Delete'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* ── Channel drawer ── */

/** Mounted only while open. The key is shown but never editable — records store it. */
function ChannelDrawer({ channel, canWrite, onClose }: { channel?: ChannelRow; canWrite: boolean; onClose: () => void }) {
  const [name, setName] = useState(channel?.name ?? '');
  const [description, setDescription] = useState(channel?.description ?? '');
  const [active, setActive] = useState(channel?.active ?? true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const create = useCreateChannel();
  const update = useUpdateChannel();
  const remove = useDeleteChannel();
  const error = create.error ?? update.error ?? remove.error;
  const busy = create.isPending || update.isPending || remove.isPending;
  const missing = !name.trim();

  const save = () => {
    if (missing) return;
    const input = { name: name.trim(), description: description.trim() || null, active };
    if (channel) update.mutate({ id: channel.id, ...input }, { onSuccess: onClose });
    else create.mutate(input, { onSuccess: onClose });
  };

  const field = 'text-xs font-medium uppercase tracking-wide text-gray-400';

  return (
    <Drawer open onClose={onClose} title={channel ? 'Edit channel' : 'New channel'}>
      <div className="space-y-4">
        <label className="block">
          <span className={field}>Name</span>
          <TextInput
            className="mt-1"
            placeholder="e.g. TikTok, Instagram, Google Ads, Khmer24"
            value={name}
            disabled={!canWrite}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={field}>Description (optional)</span>
          <TextInput
            className="mt-1"
            placeholder="e.g. ERA Cambodia TikTok account"
            value={description}
            disabled={!canWrite}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={active}
            disabled={!canWrite || channel?.isSystem}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span>
            <span className="font-medium text-gray-800">Active</span>
            <span className="block text-xs text-gray-500">
              {channel?.isSystem
                ? 'The website records its own enquiries under this channel, so it always stays active.'
                : 'Hidden channels disappear from the Source and Channel pickers, but records that already use them keep showing them.'}
            </span>
          </span>
        </label>
        {channel && (
          <p className="text-xs text-gray-500">
            Key: <code>{channel.key}</code> — stored on leads, contacts and campaigns, so renaming never changes old records.
          </p>
        )}
        {!channel && <p className="text-xs text-gray-500">New channels appear right away wherever a lead Source or campaign Channel is chosen.</p>}
        {missing && <p className="text-xs text-[var(--era-red)]">Required: Name.</p>}
        {error && <p className="text-xs text-[var(--era-red)]">{error.message}</p>}
        {canWrite && (
          <div className="flex items-center justify-between gap-2">
            <Button onClick={save} disabled={missing || busy}>
              {channel ? 'Save changes' : 'Create channel'}
            </Button>
            {channel && !channel.isSystem && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => (confirmingDelete ? remove.mutate(channel.id, { onSuccess: onClose }) : setConfirmingDelete(true))}
              >
                {confirmingDelete ? 'Click again to delete' : 'Delete'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}

type TelegramStatus = NonNullable<ReturnType<typeof useMessagingStatus>['data']>['telegram'];

function TelegramBotLine({ status }: { status: TelegramStatus }) {
  const connected = status.mode && !status.error;
  return (
    <div className={`mt-2 rounded-md px-2 py-1 text-xs ${connected ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
      {!status.configured
        ? 'AI bot not set up — add TELEGRAM_BOT_TOKEN to the API’s .env.'
        : status.error
          ? `AI bot problem: ${status.error}`
          : connected
            ? `AI bot on${status.botUsername ? ` · @${status.botUsername}` : ''} — replies automatically, leads go to CRM`
            : 'AI bot starting…'}
    </div>
  );
}

/* ── Page ── */

export function CampaignsPage() {
  const canWrite = useCan('marketing:write');
  const [tab, setTab] = useState('campaigns');
  const [editing, setEditing] = useState<CampaignRow | 'new' | null>(null);
  const [editingChannel, setEditingChannel] = useState<ChannelRow | 'new' | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const { data: campaigns } = useCampaigns();
  const { data: stats } = useCampaignStats();
  const { data: channels } = useChannels();
  const { data: channelStats } = useChannelStats();
  const { label: channelLabel } = useChannelOptions();
  const { data: messaging } = useMessagingStatus();
  const telegram = messaging?.telegram;

  const campaignRows = campaigns ?? [];
  const channelRows = channels ?? [];
  const activeChannels = channelRows.filter((c) => c.active);
  const hiddenCount = channelRows.length - activeChannels.length;
  const visibleChannels = showHidden ? channelRows : activeChannels;
  const statsById = new Map((stats ?? []).map((s) => [s.campaignId, s]));
  const statsFor = (id: string) => statsById.get(id) ?? { leads: 0, deals: 0, revenue: 0 };

  const totals = campaignRows.reduce(
    (a, c) => {
      const s = statsFor(c.id);
      a.spend += c.spend;
      a.revenue += s.revenue;
      a.leads += s.leads;
      a.deals += s.deals;
      return a;
    },
    { spend: 0, revenue: 0, leads: 0, deals: 0 },
  );
  const blendedRoi = campaignRoiPct(totals.spend, totals.revenue, totals.deals);

  const cols: Column<CampaignRow>[] = [
    {
      key: 'name',
      header: 'Campaign',
      render: (c) => (
        <div>
          <div className="font-semibold text-[var(--era-navy)]">{c.name}</div>
          <div className="text-xs text-gray-400">{c.code}</div>
        </div>
      ),
    },
    { key: 'channel', header: 'Channel', render: (c) => <Badge tone="slate">{channelLabel(c.channel)}</Badge> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
    {
      key: 'dates',
      header: 'Dates',
      render: (c) => (c.startDate || c.endDate ? `${date(c.startDate)} – ${date(c.endDate)}` : dash),
    },
    { key: 'budget', header: 'Budget', align: 'right', render: (c) => money(c.budget) },
    { key: 'spend', header: 'Spend', align: 'right', render: (c) => money(c.spend) },
    { key: 'leads', header: 'Leads', align: 'right', render: (c) => statsFor(c.id).leads },
    {
      key: 'cpl',
      header: 'Cost / lead',
      align: 'right',
      render: (c) => {
        const cpl = costPerLead(c.spend, statsFor(c.id).leads);
        return cpl == null ? dash : money(cpl);
      },
    },
    { key: 'deals', header: 'Deals', align: 'right', render: (c) => statsFor(c.id).deals },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (c) => money(statsFor(c.id).revenue) },
    {
      key: 'roi',
      header: 'ROI',
      align: 'right',
      render: (c) => {
        const s = statsFor(c.id);
        const roi = campaignRoiPct(c.spend, s.revenue, s.deals);
        return roi == null ? dash : <b>{pct(roi)}</b>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Marketing"
        subtitle={`${campaignRows.length} campaigns · ${activeChannels.length} active channels`}
        actions={
          canWrite &&
          (tab === 'channels' ? (
            <Button onClick={() => setEditingChannel('new')}>New channel</Button>
          ) : (
            <Button onClick={() => setEditing('new')}>New campaign</Button>
          ))
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Spend" value={money(totals.spend, { compact: true })} />
        <StatCard label="Attributed revenue" value={money(totals.revenue, { compact: true })} tone="green" />
        <StatCard label="Leads from campaigns" value={totals.leads} />
        <StatCard label="Blended ROI" value={blendedRoi == null ? '—' : pct(blendedRoi)} tone="amber" />
      </div>

      <Tabs
        tabs={[
          { id: 'campaigns', label: `Campaigns (${campaignRows.length})` },
          { id: 'channels', label: `Channels (${activeChannels.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'campaigns' ? (
        <DataTable
          columns={cols}
          rows={campaignRows}
          onRowClick={(c) => setEditing(c)}
          empty={
            canWrite
              ? 'No campaigns yet. Click "New campaign" to create one — you\'ll get an ad link that tracks its leads automatically.'
              : 'No campaigns yet.'
          }
        />
      ) : (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
            <span>
              Channels are the options for a lead or contact's <b>Source</b> and a campaign's <b>Channel</b>.
              {canWrite && ' Click a channel to rename, hide or delete it.'}
            </span>
            {hiddenCount > 0 && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
                Show hidden ({hiddenCount})
              </label>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {visibleChannels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setEditingChannel(ch)}
                className={`rounded-xl border border-black/5 bg-white p-4 text-left shadow-sm transition hover:border-[var(--era-navy)]/30 ${ch.active ? '' : 'opacity-60'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[var(--era-navy)]">{ch.name}</span>
                  {!ch.active ? <Badge tone="slate">Hidden</Badge> : ch.isSystem ? <Badge tone="blue">System</Badge> : null}
                </div>
                <div className="mt-1 min-h-5 text-sm text-gray-500">{ch.description ?? ''}</div>
                {ch.key === 'TELEGRAM' && telegram && <TelegramBotLine status={telegram} />}
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-gray-400">New leads, last 30 days</span>
                  <span className="font-semibold">{channelStats?.[ch.key] ?? 0}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <CampaignDrawer
          campaign={editing === 'new' ? undefined : editing}
          canWrite={canWrite}
          onClose={() => setEditing(null)}
        />
      )}
      {editingChannel && (
        <ChannelDrawer
          channel={editingChannel === 'new' ? undefined : editingChannel}
          canWrite={canWrite}
          onClose={() => setEditingChannel(null)}
        />
      )}
    </div>
  );
}
