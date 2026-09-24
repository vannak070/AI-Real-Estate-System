-- Short link code for ad URLs (?utm_campaign=<code>). Added nullable, backfilled from the id so
-- existing rows (e.g. a demo seed) get a unique value, then made required + unique.
ALTER TABLE "marketing_campaigns" ADD COLUMN "code" TEXT;
UPDATE "marketing_campaigns" SET "code" = "id" WHERE "code" IS NULL;
ALTER TABLE "marketing_campaigns" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "marketing_campaigns_code_key" ON "marketing_campaigns"("code");
