-- CreateEnum
CREATE TYPE "MessagingMode" AS ENUM ('AI', 'AGENT');

-- AlterEnum
ALTER TYPE "MessagingRole" ADD VALUE 'AGENT';

-- AlterTable
ALTER TABLE "messaging_conversations" ADD COLUMN     "handledById" TEXT,
ADD COLUMN     "handledSince" TIMESTAMP(3),
ADD COLUMN     "mode" "MessagingMode" NOT NULL DEFAULT 'AI',
ADD COLUMN     "needsAgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsAgentReason" TEXT,
ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "messaging_messages" ADD COLUMN     "agentId" TEXT;

-- CreateIndex
CREATE INDEX "messaging_conversations_lastMessageAt_idx" ON "messaging_conversations"("lastMessageAt");

