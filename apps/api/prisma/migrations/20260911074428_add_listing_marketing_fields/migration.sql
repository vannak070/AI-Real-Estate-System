-- CreateEnum
CREATE TYPE "ListingBadge" AS ENUM ('NONE', 'EXCLUSIVE', 'BEST_OFFER');

-- AlterTable
ALTER TABLE "inventory_projects" ADD COLUMN     "badge" "ListingBadge" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "startingPriceOverride" INTEGER,
ADD COLUMN     "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "inventory_units" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;
