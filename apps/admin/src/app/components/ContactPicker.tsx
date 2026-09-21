import { useMemo, useState } from 'react';
import { Combobox } from '@era/ui';
import { useContacts, contactLabel } from '../../data/crm';

/**
 * Searchable contact picker — a plain <select> over the full contact list
 * (dozens today, more over time) forces scrolling through names with no way
 * to disambiguate two "Sarah Smith"s. Same text-filter-then-dropdown pattern
 * as ProjectPicker/UnitPicker: search matches name, phone, or email.
 */
export function ContactPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data: contacts } = useContacts();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const all = contacts ?? [];
    if (!q.trim()) return all.slice(0, 50);
    const needle = q.toLowerCase();
    return all
      .filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          (c.phone ?? '').toLowerCase().includes(needle) ||
          (c.email ?? '').toLowerCase().includes(needle),
      )
      .slice(0, 50);
  }, [contacts, q]);

  return (
    <Combobox
      value={value}
      onChange={onChange}
      selectedLabel={value ? contactLabel(contacts, value) : ''}
      query={q}
      onQueryChange={setQ}
      placeholder="Search by name, phone, or email…"
      clearLabel="Select a contact"
      emptyMessage="No contacts match."
      options={filtered.map((c) => ({
        value: c.id,
        label: `${c.name}${c.phone ? ` — ${c.phone}` : c.email ? ` — ${c.email}` : ''}`,
      }))}
      moreHint={filtered.length === 50 ? 'Showing the first 50 matches — refine your search for more.' : undefined}
    />
  );
}
