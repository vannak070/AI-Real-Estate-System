/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Deterministic generated ERP seed. Regenerating gives the same data every time.

import type {
  Activity,
  ApprovalRequest,
  Block,
  Campaign,
  Channel,
  CompanyProfile,
  Contact,
  Contract,
  ContractMilestone,
  Commission,
  DocumentFile,
  ErpSeed,
  Invoice,
  Lead,
  LeadSource,
  NumberSequence,
  Notification,
  Payment,
  PaymentPlanTemplate,
  PriceList,
  Project,
  Quotation,
  Receipt,
  Reservation,
  TaxRate,
  Team,
  Unit,
  UnitType,
  User,
} from './types';

/* ── rng + helpers ──────────────────────────────────────────────────────── */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260910);
const pick = <const T>(a: readonly T[]): T => a[Math.floor(rand() * a.length)]!;
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;
const round = (n: number, step = 1000) => Math.round(n / step) * step;

const DAY = 86400000;
const NOW = new Date('2026-09-10T09:00:00Z').getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const daysAgo = (d: number) => iso(NOW - d * DAY);
const daysAhead = (d: number) => iso(NOW + d * DAY);

let seqCounter: Record<string, number> = {};
const docNo = (prefix: string) => {
  seqCounter[prefix] = (seqCounter[prefix] ?? 0) + 1;
  return `${prefix}-2026-${String(seqCounter[prefix]).padStart(4, '0')}`;
};

const FIRST = [
  'Sokha', 'Dara', 'Chan', 'Ratana', 'Nita', 'Vibol', 'Sopheak', 'Kunthea', 'Sinuon', 'Rithy',
  'James', 'Michael', 'Wei', 'Ling', 'Ahmad', 'Priya', 'David', 'Sarah', 'Kenji', 'Mei',
];
const LAST = [
  'Chhun', 'Sok', 'Meas', 'Ly', 'Hor', 'Chea', 'Pich', 'Ngin', 'Tep', 'Yim',
  'Tan', 'Lim', 'Wong', 'Chen', 'Khan', 'Singh', 'Smith', 'Brown', 'Yamamoto', 'Zhang',
];
const name = () => `${pick(FIRST)} ${pick(LAST)}`;
const NAT = ['Cambodian', 'Chinese', 'Singaporean', 'Malaysian', 'Korean', 'Japanese', 'French', 'American'];

/* ── Identity ───────────────────────────────────────────────────────────── */

const COLORS = ['#001F5B', '#EF2D2C', '#8B0A1C', '#0F766E', '#7C3AED', '#B45309', '#1D4ED8'];

const teams: Team[] = [
  { id: 'team-1', name: 'Sales — Central', branch: 'BKK1 HQ', managerId: 'user-2' },
  { id: 'team-2', name: 'Sales — Riverside', branch: 'Riverside', managerId: 'user-3' },
  { id: 'team-3', name: 'Finance & Ops', branch: 'BKK1 HQ', managerId: 'user-11' },
];

const users: User[] = [
  { id: 'user-1', name: 'Admin User', email: 'admin@eracambodia.com', phone: '+855 12 000 001', role: 'ADMIN', teamId: null, active: true, avatarColor: '#001F5B' },
  { id: 'user-2', name: 'Sopheak Meas', email: 'sopheak@eracambodia.com', phone: '+855 12 000 002', role: 'SALES_MANAGER', teamId: 'team-1', active: true, avatarColor: '#EF2D2C', target: 1_500_000 },
  { id: 'user-3', name: 'Dara Ly', email: 'dara@eracambodia.com', phone: '+855 12 000 003', role: 'SALES_MANAGER', teamId: 'team-2', active: true, avatarColor: '#8B0A1C', target: 1_200_000 },
  ...Array.from({ length: 8 }, (_, i): User => ({
    id: `user-a${i + 1}`,
    name: name(),
    email: `agent${i + 1}@eracambodia.com`,
    phone: `+855 12 100 0${String(i + 10)}`,
    role: 'AGENT',
    teamId: i < 4 ? 'team-1' : 'team-2',
    active: chance(0.92),
    avatarColor: COLORS[i % COLORS.length]!,
    target: pick([250_000, 300_000, 350_000, 400_000]),
  })),
  { id: 'user-11', name: 'Kunthea Tep', email: 'kunthea@eracambodia.com', phone: '+855 12 000 011', role: 'FINANCE', teamId: 'team-3', active: true, avatarColor: '#0F766E' },
  { id: 'user-12', name: 'Rithy Yim', email: 'rithy@eracambodia.com', phone: '+855 12 000 012', role: 'FINANCE', teamId: 'team-3', active: true, avatarColor: '#1D4ED8' },
  { id: 'user-13', name: 'Nita Pich', email: 'nita@eracambodia.com', phone: '+855 12 000 013', role: 'MARKETING', teamId: null, active: true, avatarColor: '#7C3AED' },
];
const agents = users.filter((u) => u.role === 'AGENT' || u.role === 'SALES_MANAGER');
const agentId = () => pick(agents).id;

/* ── Inventory ──────────────────────────────────────────────────────────── */

const AMENITIES = ['Infinity Pool', 'Sky Gym', 'Co-working', 'Kids Club', 'Sky Garden', 'Concierge', 'EV Charging', 'Retail Podium'];

const projects: Project[] = [
  { id: 'prj-1', name: 'BKK1 Residences', location: 'Street 240, BKK1', city: 'Phnom Penh', phase: 'Phase 2', status: 'SELLING', category: 'SALE', handoverDate: daysAhead(420), totalUnits: 0, amenities: AMENITIES.slice(0, 5), coverColor: '#001F5B' },
  { id: 'prj-2', name: 'Riverside Elite Tower', location: 'Sisowath Quay', city: 'Phnom Penh', phase: 'Phase 1', status: 'SELLING', category: 'SALE', handoverDate: daysAhead(300), totalUnits: 0, amenities: AMENITIES.slice(1, 6), coverColor: '#8B0A1C' },
  { id: 'prj-3', name: 'Chamkarmon Garden', location: 'Street 163, Chamkarmon', city: 'Phnom Penh', phase: 'Phase 1', status: 'HANDOVER', category: 'SALE', handoverDate: daysAgo(30), totalUnits: 0, amenities: AMENITIES.slice(0, 4), coverColor: '#0F766E' },
  { id: 'prj-4', name: 'Diamond Island Lofts', location: 'Koh Pich', city: 'Phnom Penh', phase: 'Phase 3', status: 'SELLING', category: 'SALE', handoverDate: daysAhead(560), totalUnits: 0, amenities: AMENITIES.slice(2, 8), coverColor: '#7C3AED' },
  { id: 'prj-5', name: 'TK Avenue Suites', location: 'Toul Kork', city: 'Phnom Penh', phase: 'Phase 1', status: 'PLANNING', category: 'SALE', handoverDate: daysAhead(720), totalUnits: 0, amenities: AMENITIES.slice(0, 3), coverColor: '#B45309' },
  { id: 'prj-6', name: 'BKK1 Rental Collection', location: 'Street 51, BKK1', city: 'Phnom Penh', phase: '—', status: 'SELLING', category: 'RENT', handoverDate: daysAgo(200), totalUnits: 0, amenities: AMENITIES.slice(3, 7), coverColor: '#1D4ED8' },
];

const unitTypes: UnitType[] = [
  { id: 'ut-studio', name: 'Studio', bedrooms: 0, bathrooms: 1, areaSqm: 38, description: 'Open-plan studio with kitchenette' },
  { id: 'ut-1br', name: '1 Bedroom', bedrooms: 1, bathrooms: 1, areaSqm: 52, description: 'One bedroom with separate living' },
  { id: 'ut-2br', name: '2 Bedroom', bedrooms: 2, bathrooms: 2, areaSqm: 78, description: 'Two bedroom, dual bathroom' },
  { id: 'ut-3br', name: '3 Bedroom', bedrooms: 3, bathrooms: 2, areaSqm: 112, description: 'Family three bedroom' },
  { id: 'ut-ph', name: 'Penthouse', bedrooms: 4, bathrooms: 4, areaSqm: 210, description: 'Top-floor penthouse with terrace' },
  { id: 'ut-duplex', name: 'Duplex', bedrooms: 3, bathrooms: 3, areaSqm: 165, description: 'Two-level duplex' },
];
const utById = Object.fromEntries(unitTypes.map((u) => [u.id, u]));

const VIEWS = ['City', 'River', 'Pool', 'Garden', 'Boulevard'];
const ORIENT = ['North', 'South', 'East', 'West', 'North-East', 'South-West'];

const blocks: Block[] = [];
const units: Unit[] = [];
const priceLists: PriceList[] = [];

for (const prj of projects) {
  const blockCount = prj.status === 'PLANNING' ? 2 : int(3, 5);
  const psfBase = prj.category === 'RENT' ? 15 : pick([1900, 2100, 2400, 2800, 3200]);
  priceLists.push(
    { id: `pl-${prj.id}-1`, projectId: prj.id, name: 'Launch Price List', version: 1, effectiveFrom: daysAgo(220), active: false, psf: psfBase, floorPremiumPct: 0.006, viewPremiumUsd: prj.category === 'RENT' ? 40 : 4000 },
    { id: `pl-${prj.id}-2`, projectId: prj.id, name: `${prj.phase} Price List`, version: 2, effectiveFrom: daysAgo(45), active: true, psf: Math.round(psfBase * 1.08), floorPremiumPct: 0.007, viewPremiumUsd: prj.category === 'RENT' ? 50 : 5000 },
  );
  const activePl = priceLists[priceLists.length - 1]!;

  let unitInProject = 0;
  for (let b = 0; b < blockCount; b++) {
    const floors = int(8, 22);
    const blockId = `blk-${prj.id}-${b + 1}`;
    blocks.push({ id: blockId, projectId: prj.id, name: `Block ${String.fromCharCode(65 + b)}`, floors });
    const perFloor = int(2, 4);
    for (let f = 1; f <= floors; f++) {
      for (let u = 0; u < perFloor; u++) {
        const ut =
          f === floors && chance(0.5)
            ? pick([utById['ut-ph'], utById['ut-duplex']])!
            : pick([utById['ut-studio'], utById['ut-1br'], utById['ut-1br'], utById['ut-2br'], utById['ut-2br'], utById['ut-3br']])!;
        const area = ut.areaSqm + int(-4, 10);
        const listPrice = round(
          activePl.psf * area * (1 + f * activePl.floorPremiumPct) +
            (chance(0.35) ? activePl.viewPremiumUsd : 0),
          prj.category === 'RENT' ? 25 : 500,
        );
        unitInProject++;
        units.push({
          id: `unit-${prj.id}-${b + 1}-${f}-${u + 1}`,
          projectId: prj.id,
          blockId,
          unitTypeId: ut.id,
          code: `${String.fromCharCode(65 + b)}-${String(f).padStart(2, '0')}${String(u + 1).padStart(2, '0')}`,
          floor: f,
          areaSqm: area,
          view: pick(VIEWS),
          orientation: pick(ORIENT),
          parking: ut.bedrooms >= 2 ? 1 : chance(0.4) ? 1 : 0,
          status: 'AVAILABLE',
          listPrice,
          holdExpiresAt: null,
        });
      }
    }
  }
  prj.totalUnits = unitInProject;
}

/* ── Contacts + leads + activities ─────────────────────────────────────── */

const SOURCES: LeadSource[] = ['FACEBOOK', 'TELEGRAM', 'WHATSAPP', 'WEBSITE', 'WALK_IN', 'REFERRAL', 'CAMPAIGN'];
const contacts: Contact[] = Array.from({ length: 52 }, (_, i): Contact => {
  const type = i < 6 ? 'OWNER' : i < 10 ? 'BROKER' : chance(0.15) ? 'BUYER' : 'PROSPECT';
  return {
    id: `ct-${i + 1}`,
    name: name(),
    type,
    email: `contact${i + 1}@example.com`,
    phone: `+855 9${int(1, 9)} ${int(100, 999)} ${int(100, 999)}`,
    nationality: pick(NAT),
    company: chance(0.25) ? `${pick(LAST)} Holdings` : undefined,
    kycStatus: type === 'BUYER' ? pick(['VERIFIED', 'VERIFIED', 'PENDING']) : pick(['NONE', 'NONE', 'PENDING']),
    source: pick(SOURCES),
    consentMarketing: chance(0.7),
    ownerId: agentId(),
    tags: chance(0.3) ? [pick(['investor', 'end-user', 'VIP', 'foreigner', 'repeat'])] : [],
    createdAt: daysAgo(int(1, 260)),
  };
});

const STAGES: Lead['stage'][] = ['NEW', 'CONTACTED', 'QUALIFIED', 'VIEWING', 'NEGOTIATION', 'WON', 'LOST'];
const leads: Lead[] = contacts
  .filter((c) => c.type === 'PROSPECT' || c.type === 'BUYER')
  .map((c, i): Lead => {
    const stage = i < 4 ? 'WON' : pick(STAGES);
    const bmin = pick([60000, 90000, 120000, 180000, 250000]);
    return {
      id: `ld-${i + 1}`,
      contactId: c.id,
      stage,
      score: int(20, 98),
      temperature: pick(['HOT', 'WARM', 'WARM', 'COLD']),
      budgetMin: bmin,
      budgetMax: bmin + pick([40000, 80000, 120000]),
      preferredProjectId: chance(0.7) ? pick(projects).id : null,
      unitTypeWanted: pick(unitTypes).name,
      timeline: pick(['This month', '1-3 months', '3-6 months', '6-12 months']),
      ownerId: c.ownerId,
      source: c.source,
      campaignId: c.source === 'CAMPAIGN' || c.source === 'FACEBOOK' ? `cmp-${int(1, 8)}` : null,
      lostReason: stage === 'LOST' ? pick(['Budget', 'Bought elsewhere', 'No response', 'Timing', 'Financing declined']) : undefined,
      createdAt: c.createdAt,
      lastActivityAt: daysAgo(int(0, 40)),
    };
  });

const ACT_SUBJECTS: Record<string, string[]> = {
  CALL: ['Intro call', 'Follow-up call', 'Discuss payment plan', 'Answer questions'],
  EMAIL: ['Sent brochure', 'Sent quotation', 'Price list follow-up', 'Reminder — reservation expiring'],
  MEETING: ['Office meeting', 'Contract review', 'Handover walkthrough'],
  VIEWING: ['Show unit', 'Second viewing', 'Show-flat tour'],
  NOTE: ['Client prefers high floor', 'Waiting on spouse decision', 'Needs bank financing'],
  TASK: ['Prepare quotation', 'Collect KYC documents', 'Chase deposit', 'Send demand letter', 'Confirm handover date'],
};
const activities: Activity[] = [];
for (const ld of leads) {
  const n = int(1, 5);
  for (let k = 0; k < n; k++) {
    const type = pick(['CALL', 'EMAIL', 'MEETING', 'VIEWING', 'NOTE', 'TASK'] as const);
    const isTask = type === 'TASK';
    activities.push({
      id: `act-${activities.length + 1}`,
      type,
      subject: pick(ACT_SUBJECTS[type]!),
      contactId: ld.contactId,
      leadId: ld.id,
      contractId: null,
      ownerId: ld.ownerId,
      dueAt: isTask ? (chance(0.5) ? daysAhead(int(1, 10)) : daysAgo(int(1, 6))) : null,
      done: isTask ? chance(0.45) : true,
      createdAt: daysAgo(int(0, 45)),
    });
  }
}

/* ── Payment plans ─────────────────────────────────────────────────────── */

const paymentPlans: PaymentPlanTemplate[] = [
  {
    id: 'pp-1',
    name: '10 / 10 / 80',
    description: '10% booking, 10% on SPA, 80% on handover',
    installments: [
      { label: 'Booking deposit', dueOffsetDays: 0, percent: 10 },
      { label: 'On SPA signing', dueOffsetDays: 14, percent: 10 },
      { label: 'On handover', milestone: 'Handover', percent: 80 },
    ],
  },
  {
    id: 'pp-2',
    name: 'Construction-linked (30/40/30)',
    description: 'Staged with construction progress',
    installments: [
      { label: 'Booking deposit', dueOffsetDays: 0, percent: 10 },
      { label: 'On SPA signing', dueOffsetDays: 21, percent: 20 },
      { label: '50% construction', milestone: '50% construction', percent: 20 },
      { label: '80% construction', milestone: '80% construction', percent: 20 },
      { label: 'On handover', milestone: 'Handover', percent: 30 },
    ],
  },
  {
    id: 'pp-3',
    name: 'Installments 24 months',
    description: 'Equal monthly instalments over 2 years',
    installments: [
      { label: 'Booking deposit', dueOffsetDays: 0, percent: 10 },
      ...Array.from({ length: 12 }, (_, i) => ({ label: `Month ${(i + 1) * 2}`, dueOffsetDays: (i + 1) * 60, percent: 7.5 })),
    ],
  },
  {
    id: 'pp-4',
    name: 'Post-handover 50/50',
    description: '50% before handover, 50% over 3 years after',
    installments: [
      { label: 'Booking deposit', dueOffsetDays: 0, percent: 15 },
      { label: 'On SPA signing', dueOffsetDays: 30, percent: 35 },
      ...Array.from({ length: 6 }, (_, i) => ({ label: `Post-handover Q${i + 1}`, milestone: 'Handover', percent: 8.33 })),
    ],
  },
];

/* ── Quotations → reservations → contracts ─────────────────────────────── */

const wonLeads = leads.filter((l) => l.stage === 'WON' || l.stage === 'NEGOTIATION' || l.stage === 'VIEWING');
const quotations: Quotation[] = [];
const reservations: Reservation[] = [];
const contracts: Contract[] = [];
const milestones: ContractMilestone[] = [];
const invoices: Invoice[] = [];
const payments: Payment[] = [];
const receipts: Receipt[] = [];
const commissions: Commission[] = [];
const approvals: ApprovalRequest[] = [];
const documents: DocumentFile[] = [];

// shuffle so sales spread across projects, not just the first tower
const availableUnits = units.filter((u) => u.status === 'AVAILABLE');
for (let s = availableUnits.length - 1; s > 0; s--) {
  const j = Math.floor(rand() * (s + 1));
  [availableUnits[s], availableUnits[j]] = [availableUnits[j]!, availableUnits[s]!];
}
let unitCursor = 0;
const takeUnit = () => availableUnits[unitCursor++ % availableUnits.length]!;
const defaultTax = 0; // Cambodia residential often 0% VAT to buyer; keep configurable

function buildInvoicesFor(contract: Contract) {
  const plan = paymentPlans.find((p) => p.id === contract.paymentPlanId)!;
  const created = new Date(contract.createdAt).getTime();
  plan.installments.forEach((inst, idx) => {
    const amount = round((contract.netPrice * inst.percent) / 100, 1);
    const due = inst.milestone
      ? daysAhead(int(120, 420))
      : iso(created + (inst.dueOffsetDays ?? 0) * DAY);
    const dueMs = new Date(due).getTime();
    const issued = contract.status === 'COMPLETED' || idx <= 3 || dueMs < NOW + 90 * DAY;
    const tax = Math.round(amount * defaultTax);
    inv: {
      const invoice: Invoice = {
        id: `inv-${invoices.length + 1}`,
        number: docNo('INV'),
        contractId: contract.id,
        contactId: contract.contactId,
        label: inst.label,
        dueDate: due,
        amount,
        taxAmount: tax,
        total: amount + tax,
        amountPaid: 0,
        status: issued ? 'ISSUED' : 'DRAFT',
        issuedAt: issued ? iso(Math.min(NOW, dueMs) - int(2, 20) * DAY) : contract.createdAt,
      };
      invoices.push(invoice);
      // pay: everything for COMPLETED contracts; due/early instalments for ACTIVE ones
      const shouldPay =
        issued &&
        (contract.status === 'COMPLETED' ||
          (contract.status === 'ACTIVE' && (idx < 3 || dueMs < NOW + 10 * DAY) && chance(0.85)));
      if (shouldPay) {
        const method = pick(['BANK_TRANSFER', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'CASH'] as const);
        const payment: Payment = {
          id: `pay-${payments.length + 1}`,
          number: docNo('PAY'),
          contractId: contract.id,
          contactId: contract.contactId,
          invoiceId: invoice.id,
          method,
          amount: invoice.total,
          reference: `${method === 'CHEQUE' ? 'CHQ' : 'TT'}${int(100000, 999999)}`,
          receivedAt: iso(new Date(invoice.issuedAt).getTime() + int(1, 15) * DAY),
          recordedBy: pick(['user-11', 'user-12']),
        };
        payments.push(payment);
        invoice.amountPaid = invoice.total;
        invoice.status = 'PAID';
        receipts.push({
          id: `rcp-${receipts.length + 1}`,
          number: docNo('RCP'),
          paymentId: payment.id,
          contactId: contract.contactId,
          amount: payment.amount,
          issuedAt: payment.receivedAt,
        });
      } else if (invoice.status === 'ISSUED' && new Date(due).getTime() < NOW) {
        invoice.status = 'OVERDUE';
      }
      break inv;
    }
  });
}

for (let i = 0; i < 46; i++) {
  const lead = wonLeads[i % wonLeads.length]!;
  const contact = contacts.find((c) => c.id === lead.contactId)!;
  const unit = takeUnit();
  const pl = priceLists.find((p) => p.projectId === unit.projectId && p.active)!;
  const plan = pick(paymentPlans);
  const discountPct = chance(0.5) ? pick([0, 0, 2, 3, 5, 7]) : 0;
  const discountAmount = round((unit.listPrice * discountPct) / 100, 100);
  const netPrice = unit.listPrice - discountAmount;
  const createdAt = daysAgo(int(5, 200));
  const qStatus: Quotation['status'] =
    i < 28 ? 'ACCEPTED' : pick(['DRAFT', 'SENT', 'SENT', 'DECLINED', 'EXPIRED']);

  const quote: Quotation = {
    id: `qt-${i + 1}`,
    number: docNo('QT'),
    contactId: contact.id,
    unitId: unit.id,
    leadId: lead.id,
    ownerId: lead.ownerId,
    priceListId: pl.id,
    listPrice: unit.listPrice,
    discountPct,
    discountAmount,
    netPrice,
    paymentPlanId: plan.id,
    status: qStatus,
    validUntil: iso(new Date(createdAt).getTime() + 21 * DAY),
    createdAt,
  };
  quotations.push(quote);

  if (discountPct >= 5) {
    approvals.push({
      id: `apr-${approvals.length + 1}`,
      type: 'DISCOUNT',
      refType: 'QUOTATION',
      refId: quote.id,
      requestedBy: lead.ownerId,
      amount: discountAmount,
      pct: discountPct,
      reason: `Client comparing with competitor; ${discountPct}% to close`,
      status: pick(['PENDING', 'APPROVED', 'APPROVED', 'REJECTED']),
      decidedBy: chance(0.7) ? 'user-2' : null,
      decidedAt: chance(0.7) ? iso(new Date(createdAt).getTime() + 2 * DAY) : null,
      createdAt: iso(new Date(createdAt).getTime() + DAY),
    });
  }

  if (quote.status !== 'ACCEPTED') continue;

  // reservation
  const resStatus: Reservation['status'] =
    i < 22 ? 'CONVERTED' : pick(['CONFIRMED', 'CONFIRMED', 'HELD', 'CANCELLED', 'EXPIRED']);
  const deposit = round(netPrice * 0.02, 100);
  const resCreated = iso(new Date(createdAt).getTime() + int(2, 10) * DAY);
  const reservation: Reservation = {
    id: `rs-${reservations.length + 1}`,
    number: docNo('RSV'),
    quotationId: quote.id,
    unitId: unit.id,
    contactId: contact.id,
    ownerId: lead.ownerId,
    depositAmount: deposit,
    depositPaid: resStatus !== 'HELD',
    status: resStatus,
    createdAt: resCreated,
    expiresAt: iso(new Date(resCreated).getTime() + 14 * DAY),
  };
  reservations.push(reservation);
  unit.status = resStatus === 'CONVERTED' ? 'CONTRACTED' : resStatus === 'CANCELLED' || resStatus === 'EXPIRED' ? 'AVAILABLE' : 'RESERVED';
  if (unit.status === 'RESERVED') unit.holdExpiresAt = reservation.expiresAt;

  if (resStatus !== 'CONVERTED') continue;

  // contract
  const cStatus: Contract['status'] =
    i < 14 ? 'ACTIVE' : i < 18 ? 'COMPLETED' : pick(['ACTIVE', 'PENDING_SIGNATURE', 'DRAFT']);
  const cCreated = iso(new Date(resCreated).getTime() + int(5, 20) * DAY);
  const contract: Contract = {
    id: `ctr-${contracts.length + 1}`,
    number: docNo('SPA'),
    reservationId: reservation.id,
    unitId: unit.id,
    contactId: contact.id,
    ownerId: lead.ownerId,
    salePrice: unit.listPrice,
    discountAmount,
    netPrice,
    paymentPlanId: plan.id,
    status: cStatus,
    signedAt: cStatus === 'DRAFT' || cStatus === 'PENDING_SIGNATURE' ? null : iso(new Date(cCreated).getTime() + int(1, 7) * DAY),
    createdAt: cCreated,
  };
  contracts.push(contract);
  unit.status = cStatus === 'COMPLETED' ? 'HANDED_OVER' : cStatus === 'ACTIVE' ? 'SOLD' : 'CONTRACTED';
  contact.type = 'BUYER';
  contact.kycStatus = 'VERIFIED';

  // milestones
  ['Booking', 'SPA signed', '30% construction', '60% construction', '90% construction', 'Handover', 'Title transfer'].forEach((label, mi) => {
    const doneCount = cStatus === 'COMPLETED' ? 7 : cStatus === 'ACTIVE' ? int(2, 5) : 1;
    milestones.push({
      id: `ms-${milestones.length + 1}`,
      contractId: contract.id,
      label,
      dueDate: daysAhead(mi * 90 - 120),
      status: mi < doneCount ? 'DONE' : 'PENDING',
      completedAt: mi < doneCount ? daysAgo(int(1, 200)) : null,
    });
  });

  buildInvoicesFor(contract);

  // commission
  const rate = pick([2, 2.5, 3]);
  commissions.push({
    id: `com-${commissions.length + 1}`,
    contractId: contract.id,
    agentId: contract.ownerId,
    basis: netPrice,
    ratePct: rate,
    amount: round((netPrice * rate) / 100, 10),
    status: cStatus === 'COMPLETED' ? 'PAID' : cStatus === 'ACTIVE' ? pick(['ACCRUED', 'APPROVED', 'APPROVED']) : 'ACCRUED',
    approvedBy: cStatus === 'ACTIVE' || cStatus === 'COMPLETED' ? 'user-2' : null,
    paidAt: cStatus === 'COMPLETED' ? iso(new Date(cCreated).getTime() + 30 * DAY) : null,
  });

  // documents
  const docTypes = ['ID', 'PROOF_OF_FUNDS', 'RESERVATION_FORM', 'SPA'] as const;
  docTypes.forEach((dt) => {
    documents.push({
      id: `doc-${documents.length + 1}`,
      name: `${dt.replace('_', ' ')} — ${contact.name}.pdf`,
      type: dt,
      refType: dt === 'ID' || dt === 'PROOF_OF_FUNDS' ? 'CONTACT' : 'CONTRACT',
      refId: dt === 'ID' || dt === 'PROOF_OF_FUNDS' ? contact.id : contract.id,
      uploadedBy: contract.ownerId,
      uploadedAt: daysAgo(int(1, 120)),
      sizeKb: int(120, 4200),
    });
  });
}

// a couple of cancellation/refund approvals (push separately so ids stay unique)
approvals.push({
  id: `apr-${approvals.length + 1}`,
  type: 'CANCELLATION',
  refType: 'CONTRACT',
  refId: contracts[0]?.id ?? 'ctr-1',
  requestedBy: agentId(),
  amount: null,
  pct: null,
  reason: 'Buyer financing fell through — requesting cancellation with 50% deposit forfeit',
  status: 'PENDING',
  decidedBy: null,
  decidedAt: null,
  createdAt: daysAgo(3),
});
approvals.push(
  {
    id: `apr-${approvals.length + 1}`,
    type: 'REFUND',
    refType: 'RESERVATION',
    refId: reservations[reservations.length - 1]?.id ?? 'rs-1',
    requestedBy: agentId(),
    amount: 8000,
    pct: null,
    reason: 'Reservation cancelled within cooling-off period — full deposit refund',
    status: 'PENDING',
    decidedBy: null,
    decidedAt: null,
    createdAt: daysAgo(1),
  },
);

/* ── Marketing ─────────────────────────────────────────────────────────── */

const channels: Channel[] = [
  { id: 'ch-1', name: 'ERA Cambodia — Facebook', platform: 'FACEBOOK', connected: true, leads30d: 214, autoReply: true },
  { id: 'ch-2', name: 'ERA Telegram Bot', platform: 'TELEGRAM', connected: true, leads30d: 96, autoReply: true },
  { id: 'ch-3', name: 'WhatsApp Business', platform: 'WHATSAPP', connected: true, leads30d: 58, autoReply: false },
  { id: 'ch-4', name: 'Website enquiry form', platform: 'WEBSITE', connected: true, leads30d: 143, autoReply: true },
  { id: 'ch-5', name: 'Walk-in / show flat', platform: 'WALK_IN', connected: true, leads30d: 41, autoReply: false },
  { id: 'ch-6', name: 'Referral program', platform: 'REFERRAL', connected: true, leads30d: 27, autoReply: false },
];

const campaigns: Campaign[] = Array.from({ length: 8 }, (_, i): Campaign => {
  const budget = pick([2000, 3500, 5000, 8000, 12000]);
  const spend = round(budget * (0.4 + rand() * 0.6), 50);
  const leadsN = int(30, 220);
  const dealsN = int(1, 12);
  return {
    id: `cmp-${i + 1}`,
    name: pick(['BKK1 Launch', 'Riverside Investor Push', 'Chinese New Year Promo', 'Diamond Island Lofts', 'Year-End Clearance', 'Foreign Buyer Webinar', 'Referral Boost', 'Show-Flat Weekend']),
    platform: pick(['FACEBOOK', 'FACEBOOK', 'TELEGRAM', 'WHATSAPP', 'WEBSITE']),
    status: i < 4 ? 'ACTIVE' : pick(['PAUSED', 'ENDED', 'ENDED']),
    budget,
    spend,
    leads: leadsN,
    deals: dealsN,
    revenue: round(dealsN * pick([120000, 160000, 210000]), 1000),
    startDate: daysAgo(int(30, 150)),
    endDate: daysAhead(int(-20, 60)),
  };
});

/* ── Ops: notifications ────────────────────────────────────────────────── */

const notifications: Notification[] = [
  { id: 'nt-1', kind: 'WARNING', title: '3 reservations expiring in 48h', body: 'Confirm deposits or units auto-release.', entityType: 'reservation', entityId: null, createdAt: daysAgo(0), read: false },
  { id: 'nt-2', kind: 'WARNING', title: `${invoices.filter((i) => i.status === 'OVERDUE').length} invoices overdue`, body: 'Send demand letters from Finance → Invoices.', entityType: 'invoice', entityId: null, createdAt: daysAgo(0), read: false },
  { id: 'nt-3', kind: 'INFO', title: '2 approvals awaiting your decision', body: 'Discount and cancellation requests pending.', entityType: 'approval', entityId: null, createdAt: daysAgo(1), read: false },
  { id: 'nt-4', kind: 'SUCCESS', title: 'Contract SPA-2026-0009 signed', body: 'Commission accrued for the agent.', entityType: 'contract', entityId: contracts[8]?.id ?? null, createdAt: daysAgo(2), read: true },
  { id: 'nt-5', kind: 'INFO', title: 'New price list active for Riverside Elite Tower', body: 'Version 2 — +8% on base PSF.', entityType: 'project', entityId: 'prj-2', createdAt: daysAgo(4), read: true },
];

/* ── Settings ──────────────────────────────────────────────────────────── */

const company: CompanyProfile = {
  name: 'ERA Cambodia',
  legalName: 'ERA Real Estate (Cambodia) Co., Ltd.',
  address: 'Street 240, Sangkat Chaktomuk, Khan Daun Penh, Phnom Penh',
  phone: '+855 23 123 456',
  email: 'info@eracambodia.com',
  taxId: 'K001-901234567',
  currency: 'USD',
  timezone: 'Asia/Phnom_Penh',
  locale: 'en-KH',
};

const sequences: NumberSequence[] = [
  { id: 'seq-qt', doc: 'Quotation', prefix: 'QT', nextNumber: quotations.length + 1, padding: 4 },
  { id: 'seq-rsv', doc: 'Reservation', prefix: 'RSV', nextNumber: reservations.length + 1, padding: 4 },
  { id: 'seq-spa', doc: 'Sale Agreement', prefix: 'SPA', nextNumber: contracts.length + 1, padding: 4 },
  { id: 'seq-inv', doc: 'Invoice', prefix: 'INV', nextNumber: invoices.length + 1, padding: 4 },
  { id: 'seq-pay', doc: 'Payment', prefix: 'PAY', nextNumber: payments.length + 1, padding: 4 },
  { id: 'seq-rcp', doc: 'Receipt', prefix: 'RCP', nextNumber: receipts.length + 1, padding: 4 },
  { id: 'seq-dn', doc: 'Demand Letter', prefix: 'DN', nextNumber: 1, padding: 4 },
];

const taxRates: TaxRate[] = [
  { id: 'tax-0', name: 'No VAT (residential)', ratePct: 0, isDefault: true },
  { id: 'tax-10', name: 'VAT 10%', ratePct: 10, isDefault: false },
];

/* ── Export ────────────────────────────────────────────────────────────── */

export const erpSeed: ErpSeed = {
  teams,
  users,
  contacts,
  leads,
  activities,
  projects,
  blocks,
  unitTypes,
  units,
  priceLists,
  paymentPlans,
  quotations,
  reservations,
  contracts,
  milestones,
  invoices,
  payments,
  receipts,
  commissions,
  approvals,
  documents,
  notifications,
  channels,
  campaigns,
  company,
  sequences,
  taxRates,
};
