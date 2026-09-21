-- Users are fully reseeded by `prisma/seed.ts` (dev-only data) — safe to
-- clear here rather than write a value-preserving backfill for a table this
-- migration is about to restructure anyway.
DELETE FROM "identity_sessions";
DELETE FROM "identity_users";

-- DropIndex
DROP INDEX "identity_users_role_idx";

-- AlterTable
ALTER TABLE "identity_users" DROP COLUMN "role",
ADD COLUMN     "roleId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "identity_roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capabilities" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identity_roles_key_key" ON "identity_roles"("key");

-- CreateIndex
CREATE INDEX "identity_users_roleId_idx" ON "identity_users"("roleId");

-- AddForeignKey
ALTER TABLE "identity_users" ADD CONSTRAINT "identity_users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "identity_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
