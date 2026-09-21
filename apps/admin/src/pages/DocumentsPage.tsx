import { useState } from 'react';
import { PageHeader, DataTable, Badge, Select, Toolbar, type Column } from '@era/ui';
import { useDocuments } from '../data/ops';
import { useContacts, contactLabel } from '../data/crm';
import { useContracts } from '../data/sales';
import { useProjects } from '../data/inventory';
import { useUsers, userLabel } from '../data/identity';
import { date, titleCase, num } from '../lib/format';
import { DOC_TYPES, type DocType } from '../data/types';

type DocumentRow = NonNullable<ReturnType<typeof useDocuments>['data']>[number];

export function DocumentsPage() {
  const [type, setType] = useState<DocType | 'ALL'>('ALL');
  const { data: documents } = useDocuments(type === 'ALL' ? undefined : { type });
  const { data: contacts } = useContacts();
  const { data: contracts } = useContracts();
  const { data: projects } = useProjects();
  const { data: users } = useUsers();

  const rows = documents ?? [];

  const refName = (d: DocumentRow) => {
    if (d.refType === 'CONTACT') return contactLabel(contacts, d.refId);
    if (d.refType === 'CONTRACT') return contracts?.find((c) => c.id === d.refId)?.number ?? d.refId;
    if (d.refType === 'PROJECT') return projects?.find((p) => p.id === d.refId)?.name ?? d.refId;
    return d.refId;
  };

  const columns: Column<DocumentRow>[] = [
    { key: 'name', header: 'Document', render: (d) => <span className="font-medium text-[var(--era-navy)]">{d.name}</span> },
    { key: 'type', header: 'Type', render: (d) => <Badge tone="slate">{titleCase(d.type)}</Badge> },
    { key: 'ref', header: 'Linked to', render: (d) => `${titleCase(d.refType)} · ${refName(d)}` },
    { key: 'by', header: 'Uploaded by', render: (d) => userLabel(users, d.uploadedBy) },
    { key: 'when', header: 'Date', render: (d) => date(d.uploadedAt) },
    { key: 'size', header: 'Size', align: 'right', render: (d) => `${num(d.sizeKb)} KB` },
  ];

  return (
    <div>
      <PageHeader title="Documents" subtitle={`${rows.length} files`} />
      <Toolbar>
        <Select value={type} onChange={(e) => setType(e.target.value as DocType | 'ALL')}>
          <option value="ALL">All types</option>
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {titleCase(t)}
            </option>
          ))}
        </Select>
        <span className="text-sm text-gray-400">{rows.length} shown</span>
      </Toolbar>
      <DataTable columns={columns} rows={rows} />
    </div>
  );
}
