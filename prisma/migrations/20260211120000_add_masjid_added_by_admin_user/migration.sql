-- AlterTable
ALTER TABLE "masjids" ADD COLUMN "addedByAdminUserId" TEXT;

-- CreateIndex
CREATE INDEX "masjids_addedByAdminUserId_idx" ON "masjids"("addedByAdminUserId");

-- AddForeignKey
ALTER TABLE "masjids" ADD CONSTRAINT "masjids_addedByAdminUserId_fkey" FOREIGN KEY ("addedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
