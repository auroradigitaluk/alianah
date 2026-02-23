-- AlterTable
ALTER TABLE "fundraisers" ADD COLUMN "waterProjectCountryId" TEXT;

-- CreateIndex
CREATE INDEX "fundraisers_waterProjectCountryId_idx" ON "fundraisers"("waterProjectCountryId");

-- AddForeignKey
ALTER TABLE "fundraisers" ADD CONSTRAINT "fundraisers_waterProjectCountryId_fkey" FOREIGN KEY ("waterProjectCountryId") REFERENCES "water_project_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
