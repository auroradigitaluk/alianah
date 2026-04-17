-- AlterTable
ALTER TABLE "qurbani_donations"
ADD COLUMN "donationNumber" TEXT;

-- CreateIndex
CREATE INDEX "qurbani_donations_donationNumber_idx" ON "qurbani_donations"("donationNumber");
