-- AlterTable
ALTER TABLE "fundraiser_cash_donations" ADD COLUMN "donationNumber" TEXT;

-- CreateIndex
CREATE INDEX "fundraiser_cash_donations_donationNumber_idx" ON "fundraiser_cash_donations"("donationNumber");
