-- AlterTable
ALTER TABLE "offline_income" ADD COLUMN     "offlineIncomeGroupId" TEXT;

-- CreateIndex
CREATE INDEX "offline_income_offlineIncomeGroupId_idx" ON "offline_income"("offlineIncomeGroupId");
