export const money = (n: number, opts: { compact?: boolean } = {}) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.compact ? 1 : 0,
  }).format(n || 0);

export const num = (n: number) => new Intl.NumberFormat('en-US').format(n || 0);

export const pct = (n: number, digits = 0) => `${(n || 0).toFixed(digits)}%`;

export const date = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const relDays = (iso: string, now: number = Date.now()) => {
  const d = Math.round((new Date(iso).getTime() - now) / 86400000);
  if (d === 0) return 'today';
  if (d > 0) return `in ${d}d`;
  return `${-d}d ago`;
};

export const titleCase = (s: string) =>
  s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
