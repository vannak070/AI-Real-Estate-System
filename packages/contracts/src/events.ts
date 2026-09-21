import { z } from 'zod';
import { defineMessage } from './envelope.js';

/**
 * Events = something happened, fan-out to any number of subscribers.
 * Grouped by the module that OWNS (publishes) them. A module may subscribe to
 * any event here, but only its owner may publish it.
 */

export const CrmEvents = {
  LeadCreated: defineMessage(
    'crm.lead_created',
    1,
    z.object({ leadId: z.string(), source: z.string(), assignedTo: z.string().nullable() }),
  ),
  LeadStatusChanged: defineMessage(
    'crm.lead_status_changed',
    1,
    z.object({ leadId: z.string(), from: z.string(), to: z.string() }),
  ),
} as const;

export const InventoryEvents = {
  UnitReserved: defineMessage(
    'inventory.unit_reserved',
    1,
    z.object({ unitId: z.string(), reservationId: z.string(), reservedBy: z.string() }),
  ),
  UnitReservationRejected: defineMessage(
    'inventory.unit_reservation_rejected',
    1,
    z.object({ unitId: z.string(), reservationId: z.string(), reason: z.string() }),
  ),
  UnitReleased: defineMessage(
    'inventory.unit_released',
    1,
    z.object({ unitId: z.string(), reservationId: z.string() }),
  ),
  UnitSold: defineMessage(
    'inventory.unit_sold',
    1,
    z.object({ unitId: z.string(), contractId: z.string() }),
  ),
} as const;

export const SalesEvents = {
  /** Saga step 1 — Sales asks Inventory to hold a unit. */
  ReservationRequested: defineMessage(
    'sales.reservation_requested',
    1,
    z.object({
      reservationId: z.string(),
      unitId: z.string(),
      contactId: z.string(),
      agentId: z.string(),
    }),
  ),
  ReservationCancelled: defineMessage(
    'sales.reservation_cancelled',
    1,
    z.object({ reservationId: z.string(), unitId: z.string(), reason: z.string() }),
  ),
  ContractSigned: defineMessage(
    'sales.contract_signed',
    1,
    z.object({
      contractId: z.string(),
      unitId: z.string(),
      contactId: z.string(),
      agentId: z.string(),
      salePrice: z.number(),
    }),
  ),
} as const;

export const FinanceEvents = {
  /** Invoice schedule's first instalment is issued right away; the rest start DRAFT. */
  InvoiceIssued: defineMessage(
    'finance.invoice_issued',
    1,
    z.object({ invoiceId: z.string(), contractId: z.string(), contactId: z.string(), total: z.number() }),
  ),
  PaymentRecorded: defineMessage(
    'finance.payment_recorded',
    1,
    z.object({
      paymentId: z.string(),
      invoiceId: z.string(),
      contractId: z.string(),
      amount: z.number(),
    }),
  ),
  InvoicePaid: defineMessage(
    'finance.invoice_paid',
    1,
    z.object({ invoiceId: z.string(), contractId: z.string() }),
  ),
  CommissionAccrued: defineMessage(
    'finance.commission_accrued',
    1,
    z.object({ commissionId: z.string(), contractId: z.string(), agentId: z.string(), amount: z.number() }),
  ),
  CommissionApproved: defineMessage(
    'finance.commission_approved',
    1,
    z.object({ commissionId: z.string(), approvedBy: z.string() }),
  ),
} as const;
