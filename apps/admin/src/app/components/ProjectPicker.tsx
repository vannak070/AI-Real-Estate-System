import { useMemo, useState } from 'react';
import { Combobox } from '@era/ui';
import { useProjects, projectLabel } from '../../data/inventory';
import type { PropertyCategory } from '../../data/types';

/**
 * Searchable project picker for a lead's "preferred project" — a plain
 * <select> over 600+ real projects is unusable, so a text filter narrows it
 * to a manageable list before rendering options.
 */
export function ProjectPicker({
  value,
  onChange,
  category,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  /** Restrict to projects listed for Sale or Rent (e.g. when picking a unit for a sales quotation). */
  category?: PropertyCategory;
}) {
  const { data: projects } = useProjects();
  const [q, setQ] = useState('');

  const scoped = useMemo(
    () => (projects ?? []).filter((p) => !category || p.category === category),
    [projects, category],
  );

  const filtered = useMemo(() => {
    if (!q.trim()) return scoped.slice(0, 50);
    const needle = q.toLowerCase();
    return scoped.filter((p) => p.name.toLowerCase().includes(needle) || p.location.toLowerCase().includes(needle)).slice(0, 50);
  }, [scoped, q]);

  return (
    <Combobox
      value={value ?? ''}
      onChange={(v) => onChange(v || null)}
      selectedLabel={value ? projectLabel(projects, value) : ''}
      query={q}
      onQueryChange={setQ}
      placeholder="Search project by name or location…"
      clearLabel="No project selected"
      emptyMessage="No projects match."
      options={filtered.map((p) => ({ value: p.id, label: `${p.name} — ${p.location}` }))}
      moreHint={filtered.length === 50 ? 'Showing the first 50 matches — refine your search for more.' : undefined}
    />
  );
}
