-- AlterTable
ALTER TABLE "demo_order_items" ADD COLUMN     "plaqueName" TEXT,
ADD COLUMN     "sponsorshipCountryId" TEXT,
ADD COLUMN     "sponsorshipProjectId" TEXT,
ADD COLUMN     "sponsorshipProjectType" TEXT,
ADD COLUMN     "waterProjectCountryId" TEXT,
ADD COLUMN     "waterProjectId" TEXT;

-- AlterTable
ALTER TABLE "water_projects" ADD COLUMN     "plaqueAvailable" BOOLEAN NOT NULL DEFAULT false;

-- Preserve previous plaque behavior for existing project types
UPDATE "water_projects"
  SET "plaqueAvailable" = true
  WHERE "projectType" IN ('WATER_PUMP', 'WATER_WELL', 'WUDHU_AREA');
