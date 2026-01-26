-- Add optional metadata fields to demo_order_items for post-payment creation
ALTER TABLE "demo_order_items"
  ADD COLUMN "waterProjectId" TEXT,
  ADD COLUMN "waterProjectCountryId" TEXT,
  ADD COLUMN "sponsorshipProjectId" TEXT,
  ADD COLUMN "sponsorshipCountryId" TEXT,
  ADD COLUMN "sponsorshipProjectType" TEXT,
  ADD COLUMN "plaqueName" TEXT;
