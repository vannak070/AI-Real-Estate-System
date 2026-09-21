-- AlterTable
ALTER TABLE "identity_users" ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "nameKhmer" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "inventory_projects" ADD COLUMN     "sitePlanUrl" TEXT;

-- AlterTable
ALTER TABLE "inventory_unit_types" ADD COLUMN     "floorPlanUrl" TEXT;

-- AlterTable
ALTER TABLE "inventory_units" ADD COLUMN     "netAreaSqm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "sales_quotations" ADD COLUMN     "discounts" JSONB NOT NULL DEFAULT '[]';
