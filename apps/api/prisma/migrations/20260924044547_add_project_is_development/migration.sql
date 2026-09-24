-- AlterTable
ALTER TABLE "inventory_projects" ADD COLUMN     "isDevelopment" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: the developer projects scraped from eracambodia.com/projects are exactly the rows that
-- carry a disclosed developer (45 at the time of writing). Everything else is an individual
-- property — including the handful of multi-unit rental/sale listings the old unit-count rule used
-- to put on the Projects page.
UPDATE "inventory_projects" SET "isDevelopment" = true WHERE "developer" IS NOT NULL;
