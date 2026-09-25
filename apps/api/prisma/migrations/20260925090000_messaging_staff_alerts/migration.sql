-- CreateTable
CREATE TABLE "messaging_staff_alert_links" (
    "userId" TEXT NOT NULL,
    "chatId" TEXT,
    "telegramName" TEXT,
    "linkedAt" TIMESTAMP(3),
    "linkCode" TEXT,
    "linkCodeExpiresAt" TIMESTAMP(3),
    "adminUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_staff_alert_links_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "messaging_staff_alerts_sent" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_staff_alerts_sent_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "messaging_staff_alert_links_linkCode_key" ON "messaging_staff_alert_links"("linkCode");

-- CreateIndex
CREATE INDEX "messaging_staff_alert_links_chatId_idx" ON "messaging_staff_alert_links"("chatId");

