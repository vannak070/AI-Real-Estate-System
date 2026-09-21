-- AlterTable
ALTER TABLE "inventory_projects" ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "inventory_unit_types" ADD COLUMN     "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
