/*
  Warnings:

  - You are about to drop the column `features` on the `inventory_units` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inventory_units" DROP COLUMN "features";

-- CreateTable
CREATE TABLE "identity_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_sessions_userId_idx" ON "identity_sessions"("userId");

-- AddForeignKey
ALTER TABLE "identity_sessions" ADD CONSTRAINT "identity_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
