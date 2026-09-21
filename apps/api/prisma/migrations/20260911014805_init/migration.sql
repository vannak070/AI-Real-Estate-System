-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('PROSPECT', 'BUYER', 'TENANT', 'OWNER', 'BROKER', 'REFERRER');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('FACEBOOK', 'TELEGRAM', 'WHATSAPP', 'WEBSITE', 'WALK_IN', 'REFERRAL', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'VIEWING', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "Temperature" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'VIEWING', 'NOTE', 'TASK', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CHEQUE', 'CARD', 'CASH');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('ACCRUED', 'APPROVED', 'PAID', 'CLAWED_BACK');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALES_MANAGER', 'AGENT', 'FINANCE', 'MARKETING', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'SELLING', 'SOLD_OUT', 'HANDOVER', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PropertyCategory" AS ENUM ('SALE', 'RENT');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('AVAILABLE', 'HELD', 'RESERVED', 'BOOKED', 'SOLD', 'CONTRACTED', 'HANDED_OVER', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ChannelPlatform" AS ENUM ('FACEBOOK', 'TELEGRAM', 'WHATSAPP', 'WEBSITE', 'WALK_IN', 'REFERRAL');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('DISCOUNT', 'REFUND', 'CANCELLATION', 'PRICE_OVERRIDE');

-- CreateEnum
CREATE TYPE "ApprovalRefType" AS ENUM ('QUOTATION', 'RESERVATION', 'CONTRACT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('ID', 'PROOF_OF_FUNDS', 'QUOTATION', 'RESERVATION_FORM', 'SPA', 'RECEIPT', 'DEMAND_LETTER', 'NOC', 'OTHER');

-- CreateEnum
CREATE TYPE "DocRefType" AS ENUM ('CONTACT', 'CONTRACT', 'RESERVATION', 'PROJECT', 'UNIT');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('INFO', 'WARNING', 'SUCCESS');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('HELD', 'CONFIRMED', 'EXPIRED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'DONE');

-- CreateTable
CREATE TABLE "analytics_daily_metrics" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dims" JSONB,

    CONSTRAINT "analytics_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContactType" NOT NULL DEFAULT 'PROSPECT',
    "email" TEXT,
    "phone" TEXT,
    "nationality" TEXT,
    "company" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NONE',
    "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "consentMarketing" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_leads" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "temperature" "Temperature" NOT NULL DEFAULT 'WARM',
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "preferredProjectId" TEXT,
    "unitTypeWanted" TEXT,
    "timeline" TEXT,
    "ownerId" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "campaignId" TEXT,
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "leadId" TEXT,
    "contactId" TEXT,
    "contractId" TEXT,
    "ownerId" TEXT,
    "dueAt" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_payments" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,

    CONSTRAINT "finance_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_receipts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_commissions" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "basis" INTEGER NOT NULL,
    "ratePct" DOUBLE PRECISION NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'ACCRUED',
    "approvedBy" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "finance_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,

    CONSTRAINT "identity_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "teamId" TEXT,
    "avatarColor" TEXT,
    "target" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT,
    "phase" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "category" "PropertyCategory" NOT NULL DEFAULT 'SALE',
    "handoverDate" TIMESTAMP(3),
    "amenities" TEXT[],
    "coverColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_blocks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floors" INTEGER NOT NULL,

    CONSTRAINT "inventory_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_unit_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "areaSqm" DOUBLE PRECISION NOT NULL,
    "description" TEXT,

    CONSTRAINT "inventory_unit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_units" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "blockId" TEXT,
    "unitTypeId" TEXT,
    "code" TEXT NOT NULL,
    "floor" INTEGER,
    "areaSqm" DOUBLE PRECISION,
    "view" TEXT,
    "orientation" TEXT,
    "parking" INTEGER NOT NULL DEFAULT 0,
    "listPrice" INTEGER NOT NULL,
    "features" TEXT[],
    "status" "UnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "holdExpiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_price_lists" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "psf" DOUBLE PRECISION NOT NULL,
    "floorPremiumPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "viewPremiumUsd" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "ChannelPlatform" NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "autoReply" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "marketing_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "ChannelPlatform" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "budget" INTEGER NOT NULL DEFAULT 0,
    "spend" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_approval_requests" (
    "id" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "refType" "ApprovalRefType" NOT NULL,
    "refId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "amount" INTEGER,
    "pct" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocType" NOT NULL,
    "refType" "DocRefType" NOT NULL,
    "refId" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sizeKb" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT,

    CONSTRAINT "ops_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_notifications" (
    "id" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "userId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_quotations" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "leadId" TEXT,
    "ownerId" TEXT NOT NULL,
    "priceListId" TEXT,
    "listPrice" INTEGER NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "netPrice" INTEGER NOT NULL,
    "paymentPlanId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_payment_plan_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "installments" JSONB NOT NULL,

    CONSTRAINT "sales_payment_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_reservations" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "quotationId" TEXT,
    "unitId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReservationStatus" NOT NULL DEFAULT 'HELD',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_contracts" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "reservationId" TEXT,
    "unitId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "salePrice" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "netPrice" INTEGER NOT NULL,
    "paymentPlanId" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_contract_milestones" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "sales_contract_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_company_profile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "taxId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Phnom_Penh',
    "locale" TEXT NOT NULL DEFAULT 'en-KH',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_company_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_number_sequences" (
    "id" TEXT NOT NULL,
    "doc" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "padding" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "settings_number_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_tax_rates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ratePct" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "settings_tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analytics_daily_metrics_day_metric_key" ON "analytics_daily_metrics"("day", "metric");

-- CreateIndex
CREATE INDEX "crm_contacts_ownerId_idx" ON "crm_contacts"("ownerId");

-- CreateIndex
CREATE INDEX "crm_leads_stage_idx" ON "crm_leads"("stage");

-- CreateIndex
CREATE INDEX "crm_leads_ownerId_idx" ON "crm_leads"("ownerId");

-- CreateIndex
CREATE INDEX "crm_activities_leadId_idx" ON "crm_activities"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_invoices_number_key" ON "finance_invoices"("number");

-- CreateIndex
CREATE INDEX "finance_invoices_status_idx" ON "finance_invoices"("status");

-- CreateIndex
CREATE INDEX "finance_invoices_contractId_idx" ON "finance_invoices"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_payments_number_key" ON "finance_payments"("number");

-- CreateIndex
CREATE UNIQUE INDEX "finance_receipts_number_key" ON "finance_receipts"("number");

-- CreateIndex
CREATE UNIQUE INDEX "finance_receipts_paymentId_key" ON "finance_receipts"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "finance_commissions_contractId_key" ON "finance_commissions"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "identity_users_email_key" ON "identity_users"("email");

-- CreateIndex
CREATE INDEX "identity_users_role_idx" ON "identity_users"("role");

-- CreateIndex
CREATE INDEX "inventory_units_status_idx" ON "inventory_units"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_units_projectId_code_key" ON "inventory_units"("projectId", "code");

-- CreateIndex
CREATE INDEX "inventory_price_lists_projectId_active_idx" ON "inventory_price_lists"("projectId", "active");

-- CreateIndex
CREATE INDEX "ops_approval_requests_status_idx" ON "ops_approval_requests"("status");

-- CreateIndex
CREATE INDEX "ops_documents_refType_refId_idx" ON "ops_documents"("refType", "refId");

-- CreateIndex
CREATE INDEX "ops_notifications_userId_read_idx" ON "ops_notifications"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "sales_quotations_number_key" ON "sales_quotations"("number");

-- CreateIndex
CREATE INDEX "sales_quotations_status_idx" ON "sales_quotations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_reservations_number_key" ON "sales_reservations"("number");

-- CreateIndex
CREATE INDEX "sales_reservations_status_idx" ON "sales_reservations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sales_contracts_number_key" ON "sales_contracts"("number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_contracts_reservationId_key" ON "sales_contracts"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_number_sequences_doc_key" ON "settings_number_sequences"("doc");

-- AddForeignKey
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_payments" ADD CONSTRAINT "finance_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "finance_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_receipts" ADD CONSTRAINT "finance_receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "finance_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_users" ADD CONSTRAINT "identity_users_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "identity_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_blocks" ADD CONSTRAINT "inventory_blocks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "inventory_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "inventory_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "inventory_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_units" ADD CONSTRAINT "inventory_units_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "inventory_unit_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_price_lists" ADD CONSTRAINT "inventory_price_lists_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "inventory_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_quotations" ADD CONSTRAINT "sales_quotations_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "sales_payment_plan_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reservations" ADD CONSTRAINT "sales_reservations_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "sales_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_contracts" ADD CONSTRAINT "sales_contracts_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "sales_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_contracts" ADD CONSTRAINT "sales_contracts_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "sales_payment_plan_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_contract_milestones" ADD CONSTRAINT "sales_contract_milestones_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "sales_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
