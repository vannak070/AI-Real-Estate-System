import { useState } from 'react';
import {
  PageHeader,
  Tabs,
  Card,
  CardTitle,
  DataTable,
  Drawer,
  Field,
  FieldGrid,
  Badge,
  Select,
  TextInput,
  Button,
  type Column,
} from '@era/ui';
import { useCompany, useSequences, useTaxRates, useUpdateCompany } from '../data/settings';
import {
  useCreatePaymentPlan,
  useDeletePaymentPlan,
  usePaymentPlans,
  useUpdatePaymentPlan,
  type PaymentPlanInstallmentInput,
} from '../data/sales';
import { useCan } from '../store/auth';
import { pct } from '../lib/format';

type Company = NonNullable<ReturnType<typeof useCompany>['data']>;
type SequenceRow = NonNullable<ReturnType<typeof useSequences>['data']>[number];
type TaxRateRow = NonNullable<ReturnType<typeof useTaxRates>['data']>[number];
type PaymentPlanRow = NonNullable<ReturnType<typeof usePaymentPlans>['data']>[number];

/** Each row's timing is exactly one of "days after signing", "at a milestone", or "on booking" (neither). */
type InstallmentTiming = 'days' | 'milestone' | 'booking';

interface InstallmentFormRow {
  label: string;
  percent: number;
  timing: InstallmentTiming;
  dueOffsetDays: string;
  milestone: string;
}

function toFormRow(inst: PaymentPlanInstallmentInput): InstallmentFormRow {
  return {
    label: inst.label,
    percent: inst.percent,
    timing: inst.milestone ? 'milestone' : inst.dueOffsetDays != null ? 'days' : 'booking',
    dueOffsetDays: inst.dueOffsetDays != null ? String(inst.dueOffsetDays) : '',
    milestone: inst.milestone ?? '',
  };
}

function toInstallmentInput(row: InstallmentFormRow): PaymentPlanInstallmentInput {
  return {
    label: row.label,
    percent: row.percent,
    dueOffsetDays: row.timing === 'days' ? Number(row.dueOffsetDays) || 0 : undefined,
    milestone: row.timing === 'milestone' ? row.milestone : undefined,
  };
}

const EMPTY_INSTALLMENT: InstallmentFormRow = { label: '', percent: 0, timing: 'booking', dueOffsetDays: '', milestone: '' };

/** Repeatable label+%+timing rows, shared by the create and edit payment-plan drawers. */
function InstallmentsEditor({
  installments,
  setInstallments,
}: {
  installments: InstallmentFormRow[];
  setInstallments: (rows: InstallmentFormRow[]) => void;
}) {
  const total = installments.reduce((sum, i) => sum + (Number(i.percent) || 0), 0);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Installments</span>
        <Button size="sm" variant="outline" onClick={() => setInstallments([...installments, { ...EMPTY_INSTALLMENT }])}>
          Add installment
        </Button>
      </div>
      <div className="space-y-2">
        {installments.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <TextInput
              className="flex-1"
              placeholder="Label (e.g. Booking deposit)"
              value={row.label}
              onChange={(e) => {
                const next = [...installments];
                next[i] = { ...row, label: e.target.value };
                setInstallments(next);
              }}
            />
            <TextInput
              type="number"
              className="w-20"
              placeholder="%"
              value={row.percent}
              onChange={(e) => {
                const next = [...installments];
                next[i] = { ...row, percent: Number(e.target.value) };
                setInstallments(next);
              }}
            />
            <Select
              className="w-40"
              value={row.timing}
              onChange={(e) => {
                const next = [...installments];
                next[i] = { ...row, timing: e.target.value as InstallmentTiming };
                setInstallments(next);
              }}
            >
              <option value="booking">On booking</option>
              <option value="days">Days after signing</option>
              <option value="milestone">At milestone</option>
            </Select>
            {row.timing === 'days' && (
              <TextInput
                type="number"
                className="w-24"
                placeholder="Days"
                value={row.dueOffsetDays}
                onChange={(e) => {
                  const next = [...installments];
                  next[i] = { ...row, dueOffsetDays: e.target.value };
                  setInstallments(next);
                }}
              />
            )}
            {row.timing === 'milestone' && (
              <TextInput
                className="w-40"
                placeholder="e.g. Handover"
                value={row.milestone}
                onChange={(e) => {
                  const next = [...installments];
                  next[i] = { ...row, milestone: e.target.value };
                  setInstallments(next);
                }}
              />
            )}
            <Button size="sm" variant="ghost" onClick={() => setInstallments(installments.filter((_, j) => j !== i))}>
              Remove
            </Button>
          </div>
        ))}
      </div>
      <p className={`mt-2 text-xs ${Math.round(total) === 100 ? 'text-gray-400' : 'text-[var(--era-red)]'}`}>
        Total: {Math.round(total * 100) / 100}% {Math.round(total) !== 100 && '(must add up to 100%)'}
      </p>
    </div>
  );
}

function PaymentPlanDrawer({
  plan,
  onClose,
}: {
  plan: PaymentPlanRow | 'new' | null;
  onClose: () => void;
}) {
  const isNew = plan === 'new';
  const existing = plan && plan !== 'new' ? plan : null;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [installments, setInstallments] = useState<InstallmentFormRow[]>([{ ...EMPTY_INSTALLMENT }]);
  const [lastPlanKey, setLastPlanKey] = useState<string | null>(null);
  const createPlan = useCreatePaymentPlan();
  const updatePlan = useUpdatePaymentPlan();
  const deletePlan = useDeletePaymentPlan();

  // `plan` changes without remounting this component (it's rendered once, toggled via `open`),
  // so re-sync form state during render whenever a different plan (or "new") is opened —
  // same fix as UnitDetailDrawer's `lastUnitId` re-sync in ProjectDetailPage.tsx.
  const planKey = isNew ? 'new' : (existing?.id ?? null);
  if (planKey !== lastPlanKey) {
    setLastPlanKey(planKey);
    setName(existing?.name ?? '');
    setDescription(existing?.description ?? '');
    setInstallments(existing ? existing.installments.map(toFormRow) : [{ ...EMPTY_INSTALLMENT }]);
    // A stale error from the previously-viewed plan (e.g. a blocked delete) shouldn't linger onto this one.
    createPlan.reset();
    updatePlan.reset();
    deletePlan.reset();
  }

  const total = installments.reduce((sum, i) => sum + (Number(i.percent) || 0), 0);
  const missing = [
    !name.trim() && 'Name',
    installments.length === 0 && 'At least one installment',
    Math.round(total) !== 100 && 'Installments totalling 100%',
  ].filter((v): v is string => !!v);

  const mutation = isNew ? createPlan : updatePlan;

  function submit() {
    if (missing.length > 0) return;
    const payload = { name, description: description || undefined, installments: installments.map(toInstallmentInput) };
    if (isNew) {
      createPlan.mutate(payload, { onSuccess: onClose });
    } else if (existing) {
      updatePlan.mutate({ id: existing.id, ...payload }, { onSuccess: onClose });
    }
  }

  return (
    <Drawer open={!!plan} onClose={onClose} title={isNew ? 'New payment plan' : (existing?.name ?? '')} width="max-w-xl">
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Name</span>
          <TextInput className="mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Description</span>
          <TextInput className="mt-1 w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <InstallmentsEditor installments={installments} setInstallments={setInstallments} />
        {missing.length > 0 && <p className="text-xs text-[var(--era-red)]">Required: {missing.join(', ')}.</p>}
        {mutation.error && <p className="text-xs text-[var(--era-red)]">{mutation.error.message}</p>}
        {deletePlan.error && <p className="text-xs text-[var(--era-red)]">{deletePlan.error.message}</p>}
        <div className="flex items-center justify-between">
          <Button onClick={submit} disabled={missing.length > 0 || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          {existing && (
            <Button
              variant="ghost"
              disabled={deletePlan.isPending}
              onClick={() => deletePlan.mutate(existing.id, { onSuccess: onClose })}
            >
              {deletePlan.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  );
}

const COMPANY_FIELDS = [
  ['name', 'Trading name'],
  ['legalName', 'Legal name'],
  ['address', 'Address'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['taxId', 'Tax ID'],
  ['currency', 'Currency'],
  ['timezone', 'Timezone'],
] as const;

function CompanyTab({ company }: { company: Company }) {
  const [form, setForm] = useState(company);
  const [saved, setSaved] = useState(false);
  const updateCompany = useUpdateCompany();

  const missing = !form.name?.trim() ? ['Trading name'] : [];

  function submit() {
    if (missing.length > 0) return;
    updateCompany.mutate(form, { onSuccess: () => setSaved(true) });
  }

  return (
    <Card>
      <CardTitle>Company profile</CardTitle>
      <div className="mt-4 grid max-w-lg gap-3">
        {COMPANY_FIELDS.map(([k, label]) => (
          <label key={k} className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
            <TextInput
              className="mt-1"
              value={form[k] ?? ''}
              onChange={(e) => { setForm({ ...form, [k]: e.target.value }); setSaved(false); }}
            />
          </label>
        ))}
        {missing.length > 0 && <p className="text-xs text-[var(--era-red)]">Required: {missing.join(', ')}.</p>}
        {updateCompany.error && <p className="text-xs text-[var(--era-red)]">{updateCompany.error.message}</p>}
        {saved && !updateCompany.isPending && <p className="text-xs text-emerald-600">Saved.</p>}
        <div>
          <Button onClick={submit} disabled={missing.length > 0 || updateCompany.isPending}>
            {updateCompany.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState('company');
  const { data: company } = useCompany();
  const { data: sequences } = useSequences();
  const { data: taxRates } = useTaxRates();
  const { data: paymentPlans } = usePaymentPlans();
  const canWrite = useCan('settings:write');
  const [editingPlan, setEditingPlan] = useState<PaymentPlanRow | 'new' | null>(null);

  const plans = paymentPlans ?? [];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Company, numbering, tax & payment plans" />
      <Tabs
        tabs={[
          { id: 'company', label: 'Company' },
          { id: 'sequences', label: 'Numbering' },
          { id: 'tax', label: 'Tax' },
          { id: 'plans', label: `Payment plans (${plans.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'company' && (company ? <CompanyTab company={company} /> : null)}

      {tab === 'sequences' && (
        <DataTable
          columns={
            [
              { key: 'doc', header: 'Document', render: (s) => <span className="font-semibold text-[var(--era-navy)]">{s.doc}</span> },
              { key: 'prefix', header: 'Prefix', render: (s) => s.prefix },
              { key: 'pad', header: 'Padding', align: 'right', render: (s) => s.padding },
              {
                key: 'next',
                header: 'Next number',
                align: 'right',
                render: (s) => `${s.prefix}-${new Date().getFullYear()}-${String(s.nextNumber).padStart(s.padding, '0')}`,
              },
            ] as Column<SequenceRow>[]
          }
          rows={sequences ?? []}
        />
      )}

      {tab === 'tax' && (
        <DataTable
          columns={
            [
              { key: 'name', header: 'Tax rate', render: (t) => <span className="font-semibold text-[var(--era-navy)]">{t.name}</span> },
              { key: 'rate', header: 'Rate', align: 'right', render: (t) => pct(t.ratePct) },
              { key: 'def', header: 'Default', render: (t) => (t.isDefault ? <Badge tone="green">default</Badge> : '—') },
            ] as Column<TaxRateRow>[]
          }
          rows={taxRates ?? []}
        />
      )}

      {tab === 'plans' && (
        <div className="space-y-4">
          {canWrite && (
            <div>
              <Button size="sm" onClick={() => setEditingPlan('new')}>
                + New plan
              </Button>
            </div>
          )}
          {plans.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <CardTitle>{p.name}</CardTitle>
                {canWrite && (
                  <Button size="sm" variant="ghost" onClick={() => setEditingPlan(p)}>
                    Edit
                  </Button>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{p.description}</p>
              <div className="mt-3">
                <FieldGrid>
                  {p.installments.map((inst, i) => (
                    <Field key={i} label={inst.label}>
                      {pct(inst.percent, 1)}
                      {inst.milestone ? ` · at ${inst.milestone}` : inst.dueOffsetDays ? ` · +${inst.dueOffsetDays}d` : ' · on booking'}
                    </Field>
                  ))}
                </FieldGrid>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PaymentPlanDrawer plan={editingPlan} onClose={() => setEditingPlan(null)} />
    </div>
  );
}
