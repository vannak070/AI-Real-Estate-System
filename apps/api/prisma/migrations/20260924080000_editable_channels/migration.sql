-- Channels become an admin-editable list. Lead/contact sources and a campaign's channel become
-- plain text keys into marketing_channels.key instead of Postgres enums. Hand-written so every
-- existing value is preserved.

-- 1. CRM sources: enum -> text (values unchanged).
ALTER TABLE "crm_contacts" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "crm_contacts" ALTER COLUMN "source" TYPE TEXT USING "source"::text;
ALTER TABLE "crm_contacts" ALTER COLUMN "source" SET DEFAULT 'WEBSITE';
ALTER TABLE "crm_leads" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "crm_leads" ALTER COLUMN "source" TYPE TEXT USING "source"::text;
ALTER TABLE "crm_leads" ALTER COLUMN "source" SET DEFAULT 'WEBSITE';

-- 2. Channels: new columns, backfilled from the old platform enum.
ALTER TABLE "marketing_channels"
  ADD COLUMN "key" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "marketing_channels" SET
  "key" = "platform"::text,
  "description" = "name",
  "name" = CASE "platform"::text
    WHEN 'FACEBOOK' THEN 'Facebook'
    WHEN 'TELEGRAM' THEN 'Telegram'
    WHEN 'WHATSAPP' THEN 'WhatsApp'
    WHEN 'WEBSITE' THEN 'Website'
    WHEN 'WALK_IN' THEN 'Walk-in'
    WHEN 'REFERRAL' THEN 'Referral'
    ELSE "name" END,
  "sortOrder" = CASE "platform"::text
    WHEN 'FACEBOOK' THEN 10 WHEN 'TELEGRAM' THEN 20 WHEN 'WHATSAPP' THEN 30
    WHEN 'WEBSITE' THEN 40 WHEN 'WALK_IN' THEN 50 WHEN 'REFERRAL' THEN 60 ELSE 100 END,
  "isSystem" = ("platform"::text = 'WEBSITE');

-- If two channels shared a platform, keep the key unique by suffixing the later ones.
UPDATE "marketing_channels" c SET "key" = c."key" || '_' || upper(substr(md5(c."id"), 1, 4))
WHERE EXISTS (SELECT 1 FROM "marketing_channels" o WHERE o."key" = c."key" AND o."id" < c."id");

ALTER TABLE "marketing_channels" DROP COLUMN "platform", DROP COLUMN "connected", DROP COLUMN "autoReply";

-- Every source value already on a lead/contact gets a channel row, hidden, so old records keep a
-- readable label (e.g. the enum's CAMPAIGN value, which had no channel).
INSERT INTO "marketing_channels" ("id", "key", "name", "description", "active", "sortOrder")
SELECT 'ch-' || lower(s.source), s.source, initcap(replace(lower(s.source), '_', ' ')),
       'Created by the channel migration for existing records', false, 900
FROM (SELECT DISTINCT "source" FROM "crm_leads" UNION SELECT DISTINCT "source" FROM "crm_contacts") s
WHERE NOT EXISTS (SELECT 1 FROM "marketing_channels" c WHERE c."key" = s.source);

-- The website must always exist: the public site writes source = 'WEBSITE'.
INSERT INTO "marketing_channels" ("id", "key", "name", "active", "isSystem", "sortOrder")
SELECT 'ch-website', 'WEBSITE', 'Website', true, true, 40
WHERE NOT EXISTS (SELECT 1 FROM "marketing_channels" WHERE "key" = 'WEBSITE');
UPDATE "marketing_channels" SET "isSystem" = true, "active" = true WHERE "key" = 'WEBSITE';

ALTER TABLE "marketing_channels" ALTER COLUMN "key" SET NOT NULL;
CREATE UNIQUE INDEX "marketing_channels_key_key" ON "marketing_channels"("key");

-- 3. Campaigns: platform (enum) -> channel (text key).
ALTER TABLE "marketing_campaigns" RENAME COLUMN "platform" TO "channel";
ALTER TABLE "marketing_campaigns" ALTER COLUMN "channel" TYPE TEXT USING "channel"::text;

-- 4. The enums are no longer referenced.
DROP TYPE "LeadSource";
DROP TYPE "ChannelPlatform";
