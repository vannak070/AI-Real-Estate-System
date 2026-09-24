-- CreateEnum
CREATE TYPE "MessagingRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "messaging_conversations" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "externalChatId" TEXT NOT NULL,
    "displayName" TEXT,
    "username" TEXT,
    "leadId" TEXT,
    "campaignCode" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messaging_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessagingRole" NOT NULL,
    "text" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messaging_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "messaging_conversations_channel_externalChatId_key" ON "messaging_conversations"("channel", "externalChatId");

-- CreateIndex
CREATE INDEX "messaging_messages_conversationId_createdAt_idx" ON "messaging_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "messaging_messages_conversationId_externalId_key" ON "messaging_messages"("conversationId", "externalId");

-- AddForeignKey
ALTER TABLE "messaging_messages" ADD CONSTRAINT "messaging_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "messaging_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

