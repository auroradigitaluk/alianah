-- AlterTable
ALTER TABLE "sponsorship_report_pool" ADD COLUMN "assignedRecurringRef" TEXT;

-- CreateIndex
CREATE INDEX "sponsorship_report_pool_assignedRecurringRef_idx" ON "sponsorship_report_pool"("assignedRecurringRef");
