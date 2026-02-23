-- AlterTable
ALTER TABLE "fundraisers" ADD COLUMN "consolidatedWaterProjectDonationId" TEXT;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "fundraisers_consolidatedWaterProjectDonationId_key" ON "fundraisers"("consolidatedWaterProjectDonationId");

-- AddForeignKey
ALTER TABLE "fundraisers" ADD CONSTRAINT "fundraisers_consolidatedWaterProjectDonationId_fkey" FOREIGN KEY ("consolidatedWaterProjectDonationId") REFERENCES "water_project_donations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
