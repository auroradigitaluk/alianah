-- AlterTable
ALTER TABLE "qurbani_donations"
ADD COLUMN "addedByAdminUserId" TEXT;

-- CreateIndex
CREATE INDEX "qurbani_donations_addedByAdminUserId_idx" ON "qurbani_donations"("addedByAdminUserId");

-- AddForeignKey
ALTER TABLE "qurbani_donations"
ADD CONSTRAINT "qurbani_donations_addedByAdminUserId_fkey"
FOREIGN KEY ("addedByAdminUserId") REFERENCES "admin_users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
