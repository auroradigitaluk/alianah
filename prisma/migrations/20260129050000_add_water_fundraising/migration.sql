-- AlterTable
ALTER TABLE "fundraisers" ALTER COLUMN "appealId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "fundraisers" ADD COLUMN     "waterProjectId" TEXT;

-- AlterTable
ALTER TABLE "water_projects" ADD COLUMN     "allowFundraising" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "water_projects" ADD COLUMN     "fundraisingImageUrls" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "water_project_donations" ADD COLUMN     "fundraiserId" TEXT;

-- CreateIndex
CREATE INDEX "fundraisers_waterProjectId_idx" ON "fundraisers"("waterProjectId");

-- CreateIndex
CREATE INDEX "water_project_donations_fundraiserId_idx" ON "water_project_donations"("fundraiserId");

-- AddForeignKey
ALTER TABLE "fundraisers" ADD CONSTRAINT "fundraisers_waterProjectId_fkey" FOREIGN KEY ("waterProjectId") REFERENCES "water_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_project_donations" ADD CONSTRAINT "water_project_donations_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "fundraisers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
