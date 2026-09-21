import { PageHeader, StatCard, Card, StatusBadge, Badge, Button } from '@era/ui';
import { useApprovals, useDecideApproval } from '../data/ops';
import { useQuotations, useReservations, useContracts } from '../data/sales';
import { useUsers, userLabel } from '../data/identity';
import { money, pct, date, titleCase } from '../lib/format';
import type { ApprovalRefType } from '../data/types';

export function ApprovalsPage() {
  const { data: approvals } = useApprovals();
  const { data: users } = useUsers();
  const { data: quotations } = useQuotations();
  const { data: reservations } = useReservations();
  const { data: contracts } = useContracts();
  const decide = useDecideApproval();

  const all = approvals ?? [];
  const pending = all.filter((a) => a.status === 'PENDING');
  const history = all.filter((a) => a.status !== 'PENDING');

  const refLabel = (refType: ApprovalRefType, refId: string) => {
    if (refType === 'QUOTATION') return quotations?.find((q) => q.id === refId)?.number ?? refId;
    if (refType === 'RESERVATION') return reservations?.find((r) => r.id === refId)?.number ?? refId;
    if (refType === 'CONTRACT') return contracts?.find((c) => c.id === refId)?.number ?? refId;
    return refId;
  };

  return (
    <div>
      <PageHeader title="Approvals" subtitle={`${pending.length} awaiting decision`} />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Pending" value={pending.length} tone="amber" />
        <StatCard label="Discount requests" value={all.filter((a) => a.type === 'DISCOUNT').length} />
        <StatCard label="Cancellations" value={all.filter((a) => a.type === 'CANCELLATION').length} />
        <StatCard label="Refunds" value={all.filter((a) => a.type === 'REFUND').length} />
      </div>

      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Pending</h3>
      <div className="space-y-3">
        {pending.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="purple">{titleCase(a.type)}</Badge>
                  <span className="font-semibold text-[var(--era-navy)]">
                    {refLabel(a.refType, a.refId)}
                  </span>
                  {a.pct != null && <span className="text-sm text-gray-500">{pct(a.pct)}</span>}
                  {a.amount != null && <span className="text-sm text-gray-500">{money(a.amount)}</span>}
                </div>
                <p className="mt-1 text-sm text-gray-600">{a.reason}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Requested by {userLabel(users, a.requestedBy)} · {date(a.createdAt)}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Button size="sm" onClick={() => decide.mutate({ id: a.id, decision: 'APPROVED' })}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a.id, decision: 'REJECTED' })}>
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {pending.length === 0 && <p className="text-sm text-gray-400">Nothing pending. 🎉</p>}
      </div>

      <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-gray-500">History</h3>
      <div className="space-y-2">
        {history.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-4 py-2.5 text-sm shadow-sm">
            <span>
              <Badge tone="slate">{titleCase(a.type)}</Badge>{' '}
              <span className="font-medium">{refLabel(a.refType, a.refId)}</span>{' '}
              <span className="text-gray-400">— {a.reason.slice(0, 60)}…</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{a.decidedAt ? date(a.decidedAt) : '—'}</span>
              <StatusBadge value={a.status} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
