import { useMemo, useState } from 'react';
import { Select, Combobox } from '@era/ui';
import { useProjects, useUnits, useUnitTypes, unitLabel } from '../../data/inventory';
import { ProjectPicker } from './ProjectPicker';
import { money } from '../../lib/format';
import type { PropertyCategory } from '../../data/types';

/**
 * Searchable unit picker for a sales quotation — a flat <select> over 300+
 * available units across 40+ projects is unusable, so this narrows by
 * listing type (Sale/Rent), then project, then a code/type text filter,
 * before rendering options. Only AVAILABLE units are ever offered.
 */
export function UnitPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data: units } = useUnits();
  const { data: projects } = useProjects();
  const { data: unitTypes } = useUnitTypes();
  const [category, setCategory] = useState<PropertyCategory | ''>('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const projectById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);
  const unitTypeById = useMemo(() => new Map((unitTypes ?? []).map((t) => [t.id, t])), [unitTypes]);

  const available = useMemo(() => (units ?? []).filter((u) => u.status === 'AVAILABLE'), [units]);

  const filtered = useMemo(() => {
    let list = available;
    if (category) list = list.filter((u) => projectById.get(u.projectId)?.category === category);
    if (projectId) list = list.filter((u) => u.projectId === projectId);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((u) => {
        const project = projectById.get(u.projectId);
        const type = u.unitTypeId ? unitTypeById.get(u.unitTypeId) : null;
        return (
          u.code.toLowerCase().includes(needle) ||
          (project?.name.toLowerCase().includes(needle) ?? false) ||
          (type?.name.toLowerCase().includes(needle) ?? false)
        );
      });
    }
    return list.slice(0, 50);
  }, [available, category, projectId, q, projectById, unitTypeById]);

  return (
    <div className="space-y-2 rounded-lg border border-gray-100 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Listing type</span>
          <Select
            className="mt-1 w-full"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as PropertyCategory | '');
              setProjectId(null);
            }}
          >
            <option value="">Sale &amp; Rent</option>
            <option value="SALE">Sale</option>
            <option value="RENT">Rent</option>
          </Select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Project</span>
          <div className="mt-1">
            <ProjectPicker value={projectId} onChange={setProjectId} category={category || undefined} />
          </div>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Unit</span>
        <div className="mt-1">
          <Combobox
            value={value}
            onChange={onChange}
            selectedLabel={value ? unitLabel(units, projects, value) : ''}
            query={q}
            onQueryChange={setQ}
            placeholder="Search by unit code or type (e.g. A-0101, Penthouse)…"
            clearLabel="Select a unit"
            emptyMessage="No available units match."
            options={filtered.map((u) => {
              const type = u.unitTypeId ? unitTypeById.get(u.unitTypeId) : null;
              const project = projectById.get(u.projectId);
              return {
                value: u.id,
                label: `${project?.name ?? 'Unknown project'} · ${u.code}${type ? ` · ${type.name}` : ''} — ${money(u.listPrice)}`,
              };
            })}
            moreHint={filtered.length === 50 ? 'Showing the first 50 matches — refine your search for more.' : undefined}
          />
        </div>
      </label>
    </div>
  );
}
