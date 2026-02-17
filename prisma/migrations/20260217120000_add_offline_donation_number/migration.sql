-- AlterTable
ALTER TABLE "offline_income" ADD COLUMN "donationNumber" TEXT;

-- AlterTable
ALTER TABLE "water_project_donations" ADD COLUMN "donationNumber" TEXT;

-- AlterTable
ALTER TABLE "sponsorship_donations" ADD COLUMN "donationNumber" TEXT;

-- CreateIndex
CREATE INDEX "offline_income_donationNumber_idx" ON "offline_income"("donationNumber");

-- CreateIndex
CREATE INDEX "water_project_donations_donationNumber_idx" ON "water_project_donations"("donationNumber");

-- CreateIndex
CREATE INDEX "sponsorship_donations_donationNumber_idx" ON "sponsorship_donations"("donationNumber");
