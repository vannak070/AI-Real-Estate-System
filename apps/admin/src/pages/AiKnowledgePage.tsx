import { useState } from 'react';
import { PageHeader, DataTable, Badge, Drawer, TextInput, Button, type Column } from '@era/ui';
import {
  useCreateKnowledge,
  useDeleteKnowledge,
  useKnowledge,
  useUpdateKnowledge,
  type KnowledgeEntry,
} from '../data/assistant';
import { useCan } from '../store/auth';
import { date } from '../lib/format';

/** Starting points for the team — each opens a new entry with that topic filled in. */
const SUGGESTED_TOPICS = [
  'Office address, opening hours and how to contact us',
  'Can foreigners buy property in Cambodia?',
  'What documents do I need to buy a property?',
  'Fees and taxes when buying',
  'Payment plans and instalments',
  'Renting: deposit, contract length and what’s included',
  'How property viewings work',
  'Services ERA offers (buy, sell, rent, property management)',
  'Selling or renting out my property with ERA',
  'Areas and provinces ERA covers',
];

const field = 'text-xs font-medium uppercase tracking-wide text-gray-400';

/** Mounted only while open, so it always starts from the latest saved entry. */
function KnowledgeDrawer({
  entry,
  initialTitle,
  canWrite,
  onClose,
}: {
  entry?: KnowledgeEntry;
  initialTitle?: string;
  canWrite: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? initialTitle ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [active, setActive] = useState(entry?.active ?? true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const create = useCreateKnowledge();
  const update = useUpdateKnowledge();
  const remove = useDeleteKnowledge();
  const error = create.error ?? update.error ?? remove.error;
  const busy = create.isPending || update.isPending || remove.isPending;
  const missing = [!title.trim() && 'Topic', !content.trim() && 'Answer'].filter(Boolean);

  const save = () => {
    if (missing.length) return;
    const input = { title: title.trim(), content: content.trim(), active };
    if (entry) update.mutate({ id: entry.id, ...input }, { onSuccess: onClose });
    else create.mutate(input, { onSuccess: onClose });
  };

  return (
    <Drawer open onClose={onClose} title={entry ? 'Edit knowledge' : 'New knowledge'}>
      <div className="space-y-4">
        <label className="block">
          <span className={field}>Topic or customer question</span>
          <TextInput
            className="mt-1"
            placeholder="e.g. Can foreigners buy a condo?"
            value={title}
            maxLength={200}
            disabled={!canWrite}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={field}>ERA’s answer</span>
          <textarea
            rows={12}
            maxLength={8000}
            value={content}
            disabled={!canWrite}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write it the way you'd answer a customer. Include the specifics — addresses, phone numbers, fees, steps."
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[var(--era-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--era-navy)]"
          />
          <span className="mt-1 block text-right text-xs text-gray-400">{content.length.toLocaleString()} / 8,000</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={active} disabled={!canWrite} onChange={(e) => setActive(e.target.checked)} />
          <span>
            <span className="font-medium text-gray-800">Active</span>
            <span className="block text-xs text-gray-500">
              Only active entries are given to the AI. Untick to keep a draft or seasonal info without the AI using it.
            </span>
          </span>
        </label>
        <p className="rounded-lg bg-[var(--era-navy)]/5 p-3 text-xs text-gray-600">
          The AI answers questions about ERA only from what’s written here — it won’t fill gaps from general knowledge. If
          something isn’t covered, it offers to have an agent follow up. Changes apply to the next message, on the website
          chat and on Telegram.
        </p>
        {missing.length > 0 && <p className="text-xs text-[var(--era-red)]">Required: {missing.join(', ')}.</p>}
        {error && <p className="text-xs text-[var(--era-red)]">{error.message}</p>}
        {canWrite && (
          <div className="flex items-center justify-between gap-2">
            <Button onClick={save} disabled={missing.length > 0 || busy}>
              {entry ? 'Save changes' : 'Add to AI knowledge'}
            </Button>
            {entry && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => (confirmingDelete ? remove.mutate(entry.id, { onSuccess: onClose }) : setConfirmingDelete(true))}
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

export function AiKnowledgePage() {
  const canWrite = useCan('marketing:write');
  const { data, isLoading } = useKnowledge();
  const [editing, setEditing] = useState<{ entry?: KnowledgeEntry; title?: string } | null>(null);

  const entries = data?.entries ?? [];
  const used = data?.usedChars ?? 0;
  const max = data?.maxChars ?? 1;
  const usedPct = Math.min(100, Math.round((used / max) * 100));
  const writtenTitles = new Set(entries.map((e) => e.title.trim().toLowerCase()));
  const suggestions = SUGGESTED_TOPICS.filter((t) => !writtenTitles.has(t.toLowerCase()));

  const cols: Column<KnowledgeEntry>[] = [
    {
      key: 'topic',
      header: 'Topic',
      render: (e) => (
        <div className="max-w-2xl">
          <div className="font-semibold text-[var(--era-navy)]">{e.title}</div>
          <div className="truncate text-xs text-gray-500">{e.content}</div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (e) => (e.active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Hidden</Badge>) },
    { key: 'updated', header: 'Updated', render: (e) => date(e.updatedAt) },
  ];

  return (
    <div>
      <PageHeader
        title="AI Knowledge"
        subtitle="What the AI assistant knows about ERA — used by the website chat and the Telegram bot"
        actions={canWrite && <Button onClick={() => setEditing({})}>New entry</Button>}
      />

      <div className="mb-6 rounded-xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-gray-600">
            The AI already knows every published listing. Add what it can’t look up: your office, services, fees, buying
            and renting process, policies.
          </span>
          <span className="font-medium text-gray-700">
            {used.toLocaleString()} of {max.toLocaleString()} characters used
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${usedPct > 90 ? 'bg-[var(--era-red)]' : 'bg-[var(--era-navy)]'}`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </div>

      <DataTable
        columns={cols}
        rows={entries}
        onRowClick={(e) => setEditing({ entry: e })}
        empty={isLoading ? 'Loading…' : 'Nothing written yet — the AI currently offers an agent for every question about ERA itself.'}
      />

      {canWrite && suggestions.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Suggested topics</h3>
          <p className="mb-3 text-sm text-gray-500">Questions customers commonly ask. Click one to write ERA’s answer.</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEditing({ title: t })}
                className="rounded-full border border-[var(--era-navy)]/20 bg-white px-3 py-1.5 text-sm text-[var(--era-navy)] hover:bg-[var(--era-navy)]/5"
              >
                + {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <KnowledgeDrawer entry={editing.entry} initialTitle={editing.title} canWrite={canWrite} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
