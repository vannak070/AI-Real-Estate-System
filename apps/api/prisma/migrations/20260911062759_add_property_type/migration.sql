-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('CONDO', 'HOUSE', 'VILLA', 'TOWNHOUSE', 'SHOPHOUSE', 'LAND');

-- AlterTable
ALTER TABLE "inventory_projects" ADD COLUMN     "propertyType" "PropertyType" NOT NULL DEFAULT 'CONDO';
