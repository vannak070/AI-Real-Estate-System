/**
 * String-literal unions mirroring apps/api's Prisma enums (crm.prisma). Kept
 * here instead of importing @prisma/client (a Node/server package that has no
 * business in a browser bundle) or @era/mock-data/erp (temporary, being
 * retired). If a server enum changes, update it here too.
 */
export type ContactType = 'PROSPECT' | 'BUYER' | 'TENANT' | 'OWNER' | 'BROKER' | 'REFERRER';
export type KycStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'VIEWING' | 'NEGOTIATION' | 'WON' | 'LOST';
export type Temperature = 'HOT' | 'WARM' | 'COLD';
export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'VIEWING' | 'NOTE' | 'TASK' | 'STATUS_CHANGE';

export const LEAD_STAGES: LeadStage[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'VIEWING', 'NEGOTIATION', 'WON', 'LOST'];
export const CONTACT_TYPES: ContactType[] = ['PROSPECT', 'BUYER', 'TENANT', 'OWNER', 'BROKER', 'REFERRER'];
// Lead/contact `source` is no longer an enum: it's a key into Marketing's editable channel list
// (useChannelOptions in data/marketing.ts).

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'CASH';
export type CommissionStatus = 'ACCRUED' | 'APPROVED' | 'PAID' | 'CLAWED_BACK';

export const PAYMENT_METHODS: PaymentMethod[] = ['BANK_TRANSFER', 'CHEQUE', 'CARD', 'CASH'];
export const COMMISSION_STATUSES: CommissionStatus[] = ['ACCRUED', 'APPROVED', 'PAID', 'CLAWED_BACK'];

export type ProjectStatus = 'PLANNING' | 'SELLING' | 'SOLD_OUT' | 'HANDOVER' | 'COMPLETED';
export type PropertyCategory = 'SALE' | 'RENT';
export type PropertyType = 'CONDO' | 'HOUSE' | 'VILLA' | 'TOWNHOUSE' | 'SHOPHOUSE' | 'LAND' | 'BOREY' | 'COMMERCIAL';

export const PROJECT_STATUSES: ProjectStatus[] = ['PLANNING', 'SELLING', 'SOLD_OUT', 'HANDOVER', 'COMPLETED'];
export const PROPERTY_CATEGORIES: PropertyCategory[] = ['SALE', 'RENT'];
export const PROPERTY_TYPES: PropertyType[] = ['CONDO', 'HOUSE', 'VILLA', 'TOWNHOUSE', 'SHOPHOUSE', 'LAND', 'BOREY', 'COMMERCIAL'];

export type ListingBadge = 'NONE' | 'EXCLUSIVE' | 'BEST_OFFER';
export const LISTING_BADGES: ListingBadge[] = ['NONE', 'EXCLUSIVE', 'BEST_OFFER'];
export type UnitStatus =
  | 'AVAILABLE'
  | 'HELD'
  | 'RESERVED'
  | 'BOOKED'
  | 'SOLD'
  | 'CONTRACTED'
  | 'HANDED_OVER'
  | 'BLOCKED';

export const UNIT_STATUSES: UnitStatus[] = [
  'AVAILABLE',
  'HELD',
  'RESERVED',
  'BOOKED',
  'SOLD',
  'CONTRACTED',
  'HANDED_OVER',
  'BLOCKED',
];

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED';
export type ReservationStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CONVERTED' | 'CANCELLED';
export type ContractStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
export type MilestoneStatus = 'PENDING' | 'DONE';

export const QUOTE_STATUSES: QuoteStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'DECLINED'];
export const RESERVATION_STATUSES: ReservationStatus[] = ['HELD', 'CONFIRMED', 'CONVERTED', 'CANCELLED', 'EXPIRED'];
export const CONTRACT_STATUSES: ContractStatus[] = ['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'COMPLETED', 'TERMINATED'];

export type ApprovalType = 'DISCOUNT' | 'REFUND' | 'CANCELLATION' | 'PRICE_OVERRIDE';
export type ApprovalRefType = 'QUOTATION' | 'RESERVATION' | 'CONTRACT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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
export type DocRefType = 'CONTACT' | 'CONTRACT' | 'RESERVATION' | 'PROJECT' | 'UNIT';

export const DOC_TYPES: DocType[] = [
  'ID',
  'PROOF_OF_FUNDS',
  'QUOTATION',
  'RESERVATION_FORM',
  'SPA',
  'RECEIPT',
  'DEMAND_LETTER',
  'NOC',
  'OTHER',
];

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
