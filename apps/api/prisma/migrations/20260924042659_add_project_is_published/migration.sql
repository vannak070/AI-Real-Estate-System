-- AlterTable
ALTER TABLE "inventory_projects" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- Everything already in Inventory was live on the website before this flag existed — keep it live.
-- Only properties created from now on start hidden (the column default).
UPDATE "inventory_projects" SET "isPublished" = true;
