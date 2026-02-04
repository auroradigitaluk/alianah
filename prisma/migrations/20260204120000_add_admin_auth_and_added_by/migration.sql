-- Update existing MANAGER roles to STAFF
UPDATE "admin_users" SET "role" = 'STAFF' WHERE "role" = 'MANAGER';

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
ADD COLUMN "twoFactorSecret" TEXT,
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "inviteToken" TEXT,
ADD COLUMN "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "admin_users_inviteToken_idx" ON "admin_users"("inviteToken");

-- AlterTable
ALTER TABLE "offline_income" ADD COLUMN "addedByAdminUserId" TEXT;

-- CreateIndex
CREATE INDEX "offline_income_addedByAdminUserId_idx" ON "offline_income"("addedByAdminUserId");

-- AlterTable
ALTER TABLE "collections" ADD COLUMN "addedByAdminUserId" TEXT;

-- CreateIndex
CREATE INDEX "collections_addedByAdminUserId_idx" ON "collections"("addedByAdminUserId");

-- AlterTable
ALTER TABLE "water_project_donations" ADD COLUMN "addedByAdminUserId" TEXT;

-- CreateIndex
CREATE INDEX "water_project_donations_addedByAdminUserId_idx" ON "water_project_donations"("addedByAdminUserId");

-- AlterTable
ALTER TABLE "sponsorship_donations" ADD COLUMN "addedByAdminUserId" TEXT;

-- CreateIndex
CREATE INDEX "sponsorship_donations_addedByAdminUserId_idx" ON "sponsorship_donations"("addedByAdminUserId");

-- AddForeignKey
ALTER TABLE "offline_income" ADD CONSTRAINT "offline_income_addedByAdminUserId_fkey" FOREIGN KEY ("addedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_addedByAdminUserId_fkey" FOREIGN KEY ("addedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_project_donations" ADD CONSTRAINT "water_project_donations_addedByAdminUserId_fkey" FOREIGN KEY ("addedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_donations" ADD CONSTRAINT "sponsorship_donations_addedByAdminUserId_fkey" FOREIGN KEY ("addedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
