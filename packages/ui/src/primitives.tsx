import {
  type ReactNode,
  type HTMLAttributes,
  type SelectHTMLAttributes,
  type InputHTMLAttributes,
  useEffect,
  useState,
} from 'react';
import { cn } from './cn';

/* ── Badge ─────────────────────────────────────────────────────────────── */

const BADGE_TONES: Record<string, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  purple: 'bg-purple-100 text-purple-800',
  slate: 'bg-slate-200 text-slate-800',
};

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Map any status-ish string to a tone. */
export function toneFor(status: string): BadgeTone {
  const s = status.toUpperCase();
  if (/(PAID|ACTIVE|VERIFIED|CONFIRMED|WON|DONE|APPROVED|CONNECTED|AVAILABLE|COMPLETED|SUCCESS)/.test(s))
    return 'green';
  if (/(OVERDUE|REJECTED|LOST|CANCELLED|TERMINATED|ERROR|CLAWED_BACK|BLOCKED)/.test(s)) return 'red';
  if (/(PENDING|DRAFT|HELD|NEW|WARNING|EXPIRED|PARTIALLY_PAID)/.test(s)) return 'amber';
  if (/(SENT|ISSUED|CONTACTED|QUALIFIED|RESERVED|ACCRUED|NEGOTIATION|SELLING|BOOKED)/.test(s))
    return 'blue';
  if (/(CONVERTED|CONTRACTED|HANDOVER|VIEWING|SOLD|ACCEPTED)/.test(s)) return 'purple';
  return 'slate';
}

export function StatusBadge({ value }: { value: string }) {
  return <Badge tone={toneFor(value)}>{value.replace(/_/g, ' ').toLowerCase()}</Badge>;
}

/* ── PageHeader ────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[var(--era-navy)]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── StatCard ──────────────────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  hint,
  tone = 'navy',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'navy' | 'green' | 'red' | 'amber';
}) {
  const bar = {
    navy: 'bg-[var(--era-navy)]',
    green: 'bg-emerald-500',
    red: 'bg-[var(--era-red)]',
    amber: 'bg-amber-500',
  }[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-black/5 bg-white p-4 shadow-sm">
      <div className={cn('absolute left-0 top-0 h-full w-1', bar)} />
      <div className="pl-2">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
        <div className="mt-1 text-2xl font-bold text-[var(--era-navy)]">{value}</div>
        {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
      </div>
    </div>
  );
}

/* ── DataTable ─────────────────────────────────────────────────────────── */

export interface Column<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export function DataTable<Row extends { id: string }>({
  columns,
  rows,
  onRowClick,
  empty = 'Nothing here yet.',
}: {
  columns: Column<Row>[];
  rows: Row[];
  onRowClick?: (row: Row) => void;
  empty?: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/5 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-500">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn('px-4 py-3 font-semibold', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center')}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-gray-50 last:border-0',
                onRowClick && 'cursor-pointer hover:bg-[var(--era-navy)]/[0.03]',
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn('px-4 py-3 align-middle', c.align === 'right' && 'text-right tabular-nums', c.align === 'center' && 'text-center')}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Drawer ────────────────────────────────────────────────────────────── */

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={cn('relative flex h-full w-full flex-col bg-white shadow-2xl', width)}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="text-lg font-bold text-[var(--era-navy)]">{title}</div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Field / KeyVal ───────────────────────────────────────────────────── */

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{children}</dd>
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6">{children}</dl>;
}

/* ── Tabs ─────────────────────────────────────────────────────────────── */

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-4 flex gap-1 border-b border-gray-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            '-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
            active === t.id
              ? 'border-[var(--era-red)] text-[var(--era-navy)]'
              : 'border-transparent text-gray-500 hover:text-gray-800',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ── Form controls ────────────────────────────────────────────────────── */

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[var(--era-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--era-navy)]',
        props.className,
      )}
    />
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[var(--era-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--era-navy)]',
        props.className,
      )}
    />
  );
}

export interface ComboboxOption {
  value: string;
  label: ReactNode;
}

/**
 * A searchable dropdown for a long option list (hundreds of projects/units/
 * contacts) — a native `<select>` with that many `<option>`s renders as one
 * giant unstyled OS listbox that overflows past whatever container it's in
 * (confirmed broken this way in production). This instead shows a plain text
 * input; typing opens a small in-page scrollable panel of clickable rows
 * below it, closed on blur/selection — fully within normal document flow, no
 * native listbox involved.
 *
 * Filtering/capping the option list is the caller's job (`options` should
 * already be the filtered slice to render) — this component only owns the
 * open/closed input and the dropdown panel's presentation.
 */
export function Combobox({
  value,
  onChange,
  selectedLabel,
  query,
  onQueryChange,
  options,
  placeholder,
  emptyMessage = 'No matches.',
  clearLabel,
  moreHint,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** What the closed input shows for the current `value` (independent of the filtered `options`). */
  selectedLabel: string;
  query: string;
  onQueryChange: (q: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  /** Row shown at the top of the panel that clears the selection; omit to disable clearing. */
  clearLabel?: string;
  moreHint?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const pick = (v: string) => {
    onChange(v);
    onQueryChange('');
    setOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[var(--era-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--era-navy)]"
        placeholder={placeholder}
        value={open ? query : selectedLabel}
        onFocus={() => {
          onQueryChange('');
          setOpen(true);
        }}
        onChange={(e) => onQueryChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {clearLabel && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick('')}
              className="block w-full px-3 py-1.5 text-left text-sm text-gray-400 hover:bg-gray-50"
            >
              {clearLabel}
            </button>
          )}
          {options.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">{emptyMessage}</div>}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o.value)}
              className={cn(
                'block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-gray-50',
                o.value === value ? 'bg-[var(--era-navy)]/5 font-medium text-[var(--era-navy)]' : 'text-gray-700',
              )}
            >
              {o.label}
            </button>
          ))}
          {moreHint && <div className="border-t border-gray-100 px-3 py-1.5 text-xs text-gray-400">{moreHint}</div>}
        </div>
      )}
    </div>
  );
}

export function Toolbar({ children }: HTMLAttributes<HTMLDivElement>) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center">
      <div className="font-semibold text-gray-600">{title}</div>
      {hint && <div className="mt-1 text-sm text-gray-400">{hint}</div>}
    </div>
  );
}
