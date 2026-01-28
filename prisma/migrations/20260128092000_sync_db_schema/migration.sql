-- AlterTable
ALTER TABLE "demo_order_items"
  ADD COLUMN IF NOT EXISTS "plaqueName" TEXT,
  ADD COLUMN IF NOT EXISTS "sponsorshipCountryId" TEXT,
  ADD COLUMN IF NOT EXISTS "sponsorshipProjectId" TEXT,
  ADD COLUMN IF NOT EXISTS "sponsorshipProjectType" TEXT,
  ADD COLUMN IF NOT EXISTS "waterProjectCountryId" TEXT,
  ADD COLUMN IF NOT EXISTS "waterProjectId" TEXT;

-- AlterTable
ALTER TABLE "water_projects"
  ADD COLUMN IF NOT EXISTS "plaqueAvailable" BOOLEAN NOT NULL DEFAULT false;

-- Preserve previous plaque behavior for existing project types
UPDATE "water_projects"
  SET "plaqueAvailable" = true
  WHERE "projectType" IN ('WATER_PUMP', 'WATER_WELL', 'WUDHU_AREA');
