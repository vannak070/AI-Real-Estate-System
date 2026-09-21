import { useMemo, useState } from 'react';
import { PageHeader, StatCard, DataTable, Badge, Toolbar, type Column } from '@era/ui';
import { useCan } from '../store/auth';
import { useActivities, useToggleActivityDone } from '../data/crm';
import { useUsers, userLabel } from '../data/identity';
import { date, relDays, initials } from '../lib/format';

type ActivityRow = NonNullable<ReturnType<typeof useActivities>['data']>[number];
type Filter = 'OPEN' | 'OVERDUE' | 'ALL';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'OPEN', label: 'Open' },
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'ALL', label: 'All' },
];

export function TasksPage() {
  const canWrite = useCan('crm:write');
  const [filter, setFilter] = useState<Filter>('OPEN');

  const { data: activities } = useActivities({});
  const { data: users } = useUsers();
  const toggleActivityDone = useToggleActivityDone();

  const now = Date.now();
  const today = new Date(now).toDateString();
  const allTasks = (activities ?? []).filter((a) => a.type === 'TASK');

  const stats = useMemo(() => {
    const open = allTasks.filter((a) => !a.done);
    const overdue = open.filter((a) => a.dueAt && new Date(a.dueAt).getTime() < now);
    const dueToday = open.filter((a) => a.dueAt && new Date(a.dueAt).toDateString() === today && new Date(a.dueAt).getTime() >= now);
    return { open: open.length, overdue: overdue.length, dueToday: dueToday.length };
  }, [allTasks, now, today]);

  const tasks = allTasks
    .filter((a) =>
      filter === 'ALL'
        ? true
        : filter === 'OPEN'
          ? !a.done
          : !a.done && a.dueAt !== null && new Date(a.dueAt).getTime() < now,
    )
    .sort((x, y) => (x.dueAt ?? '').localeCompare(y.dueAt ?? ''));

  const columns: Column<ActivityRow>[] = [
    {
      key: 'done',
      header: '',
      width: '44px',
      render: (t) => (
        <input
          type="checkbox"
          checked={t.done}
          disabled={!canWrite}
          onChange={() => toggleActivityDone.mutate(t.id)}
          className="h-4 w-4 accent-[var(--era-red)] disabled:opacity-40"
        />
      ),
    },
    { key: 'subject', header: 'Task', render: (t) => <span className={t.done ? 'text-gray-400 line-through' : 'font-medium'}>{t.subject}</span> },
    {
      key: 'lead',
      header: 'Contact',
      render: (t) =>
        t.lead ? (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
              {initials(t.lead.contact.name)}
            </div>
            <span>{t.lead.contact.name}</span>
          </div>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    { key: 'owner', header: 'Owner', render: (t) => userLabel(users, t.ownerId) },
    {
      key: 'due',
      header: 'Due',
      render: (t) => {
        if (!t.dueAt) return '—';
        const dueMs = new Date(t.dueAt).getTime();
        const overdue = !t.done && dueMs < now;
        const dueToday = !t.done && !overdue && new Date(t.dueAt).toDateString() === today;
        const tone = overdue ? 'red' : dueToday ? 'amber' : 'slate';
        return (
          <Badge tone={tone}>
            {relDays(t.dueAt, now)} · {date(t.dueAt)}
          </Badge>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Tasks" subtitle={`${stats.open} open`} />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Overdue" value={stats.overdue} tone="red" />
        <StatCard label="Due today" value={stats.dueToday} tone="amber" />
        <StatCard label="Open" value={stats.open} tone="navy" />
      </div>

      <Toolbar>
        <div className="flex overflow-hidden rounded-lg border border-gray-200">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-sm font-medium ${
                filter === f.key ? 'bg-[var(--era-navy)] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400">{tasks.length} shown</span>
      </Toolbar>

      <DataTable columns={columns} rows={tasks} empty="No tasks match." />
    </div>
  );
}
