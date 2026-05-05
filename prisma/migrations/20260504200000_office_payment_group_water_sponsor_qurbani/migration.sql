-- AlterTable
ALTER TABLE "qurbani_donations" ADD COLUMN "officePaymentGroupId" TEXT;

-- AlterTable
ALTER TABLE "water_project_donations" ADD COLUMN "officePaymentGroupId" TEXT;

-- AlterTable
ALTER TABLE "sponsorship_donations" ADD COLUMN "officePaymentGroupId" TEXT;

-- CreateIndex
CREATE INDEX "qurbani_donations_officePaymentGroupId_idx" ON "qurbani_donations"("officePaymentGroupId");

-- CreateIndex
CREATE INDEX "water_project_donations_officePaymentGroupId_idx" ON "water_project_donations"("officePaymentGroupId");

-- CreateIndex
CREATE INDEX "sponsorship_donations_officePaymentGroupId_idx" ON "sponsorship_donations"("officePaymentGroupId");
