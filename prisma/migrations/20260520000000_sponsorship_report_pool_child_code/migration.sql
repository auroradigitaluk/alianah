-- AlterTable
ALTER TABLE "sponsorship_report_pool" ADD COLUMN "fileName" TEXT;
ALTER TABLE "sponsorship_report_pool" ADD COLUMN "childCode" TEXT;

-- CreateIndex
CREATE INDEX "sponsorship_report_pool_sponsorshipProjectId_childCode_idx" ON "sponsorship_report_pool"("sponsorshipProjectId", "childCode");
