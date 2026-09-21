// ─────────────────────────────────────────────────────────────────────────────
// ERP domain types — the static model behind the back office (Odoo replacement).
// ─────────────────────────────────────────────────────────────────────────────

export type Id = string;
export type ISODate = string;

/* ── Identity ────────────────────────────────────────────────────────────── */

export type Role = 'ADMIN' | 'SALES_MANAGER' | 'AGENT' | 'FINANCE' | 'MARKETING' | 'VIEWER';

export interface Team {
  id: Id;
  name: string;
  branch: string;
  managerId: Id;
}

export interface User {
  id: Id;
  name: string;
  email: string;
  phone: string;
  role: Role;
  teamId: Id | null;
  active: boolean;
  avatarColor: string;
  /** monthly sales target in USD, for AGENT/SALES_MANAGER */
  target?: number;
}

/* ── CRM ─────────────────────────────────────────────────────────────────── */

export type ContactType = 'PROSPECT' | 'BUYER' | 'TENANT' | 'OWNER' | 'BROKER' | 'REFERRER';
export type KycStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type LeadSource =
  | 'FACEBOOK'
  | 'TELEGRAM'
  | 'WHATSAPP'
  | 'WEBSITE'
  | 'WALK_IN'
  | 'REFERRAL'
  | 'CAMPAIGN';

export interface Contact {
  id: Id;
  name: string;
  type: ContactType;
  email: string;
  phone: string;
  nationality: string;
  company?: string;
  kycStatus: KycStatus;
  source: LeadSource;
  consentMarketing: boolean;
  ownerId: Id;
  tags: string[];
  createdAt: ISODate;
}

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'VIEWING'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';
export type Temperature = 'HOT' | 'WARM' | 'COLD';

export interface Lead {
  id: Id;
  contactId: Id;
  stage: LeadStage;
  score: number;
  temperature: Temperature;
  budgetMin: number;
  budgetMax: number;
  preferredProjectId: Id | null;
  unitTypeWanted: string;
  timeline: string;
  ownerId: Id;
  source: LeadSource;
  campaignId: Id | null;
  lostReason?: string;
  createdAt: ISODate;
  lastActivityAt: ISODate;
}

export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'VIEWING' | 'NOTE' | 'TASK';

export interface Activity {
  id: Id;
  type: ActivityType;
  subject: string;
  contactId: Id | null;
  leadId: Id | null;
  contractId: Id | null;
  ownerId: Id;
  dueAt: ISODate | null;
  done: boolean;
  createdAt: ISODate;
}

/* ── Inventory ───────────────────────────────────────────────────────────── */

export type ProjectStatus =
  | 'PLANNING'
  | 'SELLING'
  | 'SOLD_OUT'
  | 'HANDOVER'
  | 'COMPLETED';

export interface Project {
  id: Id;
  name: string;
  location: string;
  city: string;
  phase: string;
  status: ProjectStatus;
  category: 'SALE' | 'RENT';
  handoverDate: ISODate;
  totalUnits: number;
  amenities: string[];
  coverColor: string;
}

export interface Block {
  id: Id;
  projectId: Id;
  name: string;
  floors: number;
}

export interface UnitType {
  id: Id;
  name: string;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  description: string;
}

export type UnitStatus =
  | 'AVAILABLE'
  | 'HELD'
  | 'RESERVED'
  | 'BOOKED'
  | 'SOLD'
  | 'CONTRACTED'
  | 'HANDED_OVER'
  | 'BLOCKED';

export interface Unit {
  id: Id;
  projectId: Id;
  blockId: Id;
  unitTypeId: Id;
  code: string;
  floor: number;
  areaSqm: number;
  view: string;
  orientation: string;
  parking: number;
  status: UnitStatus;
  listPrice: number;
  holdExpiresAt: ISODate | null;
}

export interface PriceList {
  id: Id;
  projectId: Id;
  name: string;
  version: number;
  effectiveFrom: ISODate;
  active: boolean;
  /** price per sqm, USD */
  psf: number;
  floorPremiumPct: number;
  viewPremiumUsd: number;
}

/* ── Sales ───────────────────────────────────────────────────────────────── */

export interface PaymentPlanInstallment {
  label: string;
  /** either a day offset from contract date, or a named milestone */
  dueOffsetDays?: number;
  milestone?: string;
  percent: number;
}

export interface PaymentPlanTemplate {
  id: Id;
  name: string;
  description: string;
  installments: PaymentPlanInstallment[];
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED';

export interface Quotation {
  id: Id;
  number: string;
  contactId: Id;
  unitId: Id;
  leadId: Id | null;
  ownerId: Id;
  priceListId: Id;
  listPrice: number;
  discountPct: number;
  discountAmount: number;
  netPrice: number;
  paymentPlanId: Id;
  status: QuoteStatus;
  validUntil: ISODate;
  createdAt: ISODate;
}

export type ReservationStatus =
  | 'HELD'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'CONVERTED'
  | 'CANCELLED';

export interface Reservation {
  id: Id;
  number: string;
  quotationId: Id | null;
  unitId: Id;
  contactId: Id;
  ownerId: Id;
  depositAmount: number;
  depositPaid: boolean;
  status: ReservationStatus;
  createdAt: ISODate;
  expiresAt: ISODate;
}

export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'TERMINATED';

export interface Contract {
  id: Id;
  number: string;
  reservationId: Id | null;
  unitId: Id;
  contactId: Id;
  ownerId: Id;
  salePrice: number;
  discountAmount: number;
  netPrice: number;
  paymentPlanId: Id;
  status: ContractStatus;
  signedAt: ISODate | null;
  createdAt: ISODate;
}

export interface ContractMilestone {
  id: Id;
  contractId: Id;
  label: string;
  dueDate: ISODate;
  status: 'PENDING' | 'DONE';
  completedAt: ISODate | null;
}

/* ── Finance ─────────────────────────────────────────────────────────────── */

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export interface Invoice {
  id: Id;
  number: string;
  contractId: Id;
  contactId: Id;
  label: string;
  dueDate: ISODate;
  amount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  issuedAt: ISODate;
}

export type PaymentMethod = 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'CASH';

export interface Payment {
  id: Id;
  number: string;
  contractId: Id;
  contactId: Id;
  invoiceId: Id | null;
  method: PaymentMethod;
  amount: number;
  reference: string;
  receivedAt: ISODate;
  recordedBy: Id;
}

export interface Receipt {
  id: Id;
  number: string;
  paymentId: Id;
  contactId: Id;
  amount: number;
  issuedAt: ISODate;
}

export type CommissionStatus = 'ACCRUED' | 'APPROVED' | 'PAID' | 'CLAWED_BACK';

export interface Commission {
  id: Id;
  contractId: Id;
  agentId: Id;
  basis: number;
  ratePct: number;
  amount: number;
  status: CommissionStatus;
  approvedBy: Id | null;
  paidAt: ISODate | null;
}

/* ── Ops (workflow, docs, notifications) ─────────────────────────────────── */

export type ApprovalType = 'DISCOUNT' | 'REFUND' | 'CANCELLATION' | 'PRICE_OVERRIDE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequest {
  id: Id;
  type: ApprovalType;
  refType: 'QUOTATION' | 'RESERVATION' | 'CONTRACT';
  refId: Id;
  requestedBy: Id;
  amount: number | null;
  pct: number | null;
  reason: string;
  status: ApprovalStatus;
  decidedBy: Id | null;
  decidedAt: ISODate | null;
  createdAt: ISODate;
}

export type DocType =
  | 'ID'
  | 'PROOF_OF_FUNDS'
  | 'QUOTATION'
  | 'RESERVATION_FORM'
  | 'SPA'
  | 'RECEIPT'
  | 'DEMAND_LETTER'
  | 'NOC'
  | 'OTHER';

export interface DocumentFile {
  id: Id;
  name: string;
  type: DocType;
  refType: 'CONTACT' | 'CONTRACT' | 'RESERVATION' | 'PROJECT' | 'UNIT';
  refId: Id;
  uploadedBy: Id;
  uploadedAt: ISODate;
  sizeKb: number;
}

export interface Notification {
  id: Id;
  kind: 'INFO' | 'WARNING' | 'SUCCESS';
  title: string;
  body: string;
  entityType: string | null;
  entityId: Id | null;
  createdAt: ISODate;
  read: boolean;
}

/* ── Marketing ───────────────────────────────────────────────────────────── */

export type ChannelPlatform =
  | 'FACEBOOK'
  | 'TELEGRAM'
  | 'WHATSAPP'
  | 'WEBSITE'
  | 'WALK_IN'
  | 'REFERRAL';

export interface Channel {
  id: Id;
  name: string;
  platform: ChannelPlatform;
  connected: boolean;
  leads30d: number;
  autoReply: boolean;
}

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';

export interface Campaign {
  id: Id;
  name: string;
  platform: ChannelPlatform;
  status: CampaignStatus;
  budget: number;
  spend: number;
  leads: number;
  deals: number;
  revenue: number;
  startDate: ISODate;
  endDate: ISODate;
}

/* ── Settings ────────────────────────────────────────────────────────────── */

export interface CompanyProfile {
  name: string;
  legalName: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  currency: string;
  timezone: string;
  locale: string;
}

export interface NumberSequence {
  id: Id;
  doc: string;
  prefix: string;
  nextNumber: number;
  padding: number;
}

export interface TaxRate {
  id: Id;
  name: string;
  ratePct: number;
  isDefault: boolean;
}

/* ── The whole seed ──────────────────────────────────────────────────────── */

export interface ErpSeed {
  teams: Team[];
  users: User[];
  contacts: Contact[];
  leads: Lead[];
  activities: Activity[];
  projects: Project[];
  blocks: Block[];
  unitTypes: UnitType[];
  units: Unit[];
  priceLists: PriceList[];
  paymentPlans: PaymentPlanTemplate[];
  quotations: Quotation[];
  reservations: Reservation[];
  contracts: Contract[];
  milestones: ContractMilestone[];
  invoices: Invoice[];
  payments: Payment[];
  receipts: Receipt[];
  commissions: Commission[];
  approvals: ApprovalRequest[];
  documents: DocumentFile[];
  notifications: Notification[];
  channels: Channel[];
  campaigns: Campaign[];
  company: CompanyProfile;
  sequences: NumberSequence[];
  taxRates: TaxRate[];
}
