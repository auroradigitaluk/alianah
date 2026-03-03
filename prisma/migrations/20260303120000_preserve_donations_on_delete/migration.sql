-- Preserve donation data when appeal, campaign, water project, sponsor project, or fundraiser is deleted.
-- Use SET NULL on FKs so donation rows and amounts are kept; only the link to the deleted entity is cleared.

-- FundraiserCashDonation: keep cash donations when fundraiser is deleted
ALTER TABLE "fundraiser_cash_donations" DROP CONSTRAINT IF EXISTS "fundraiser_cash_donations_fundraiserId_fkey";
ALTER TABLE "fundraiser_cash_donations" ALTER COLUMN "fundraiserId" DROP NOT NULL;
ALTER TABLE "fundraiser_cash_donations" ADD CONSTRAINT "fundraiser_cash_donations_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "fundraisers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- WaterProjectDonation: keep donations when water project or country is deleted (e.g. Sri Lanka Wudhu area)
ALTER TABLE "water_project_donations" DROP CONSTRAINT IF EXISTS "water_project_donations_waterProjectId_fkey";
ALTER TABLE "water_project_donations" DROP CONSTRAINT IF EXISTS "water_project_donations_countryId_fkey";
ALTER TABLE "water_project_donations" ALTER COLUMN "waterProjectId" DROP NOT NULL;
ALTER TABLE "water_project_donations" ALTER COLUMN "countryId" DROP NOT NULL;
ALTER TABLE "water_project_donations" ADD CONSTRAINT "water_project_donations_waterProjectId_fkey" FOREIGN KEY ("waterProjectId") REFERENCES "water_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "water_project_donations" ADD CONSTRAINT "water_project_donations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "water_project_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SponsorshipDonation: keep donations when sponsorship project or country is deleted
ALTER TABLE "sponsorship_donations" DROP CONSTRAINT IF EXISTS "sponsorship_donations_sponsorshipProjectId_fkey";
ALTER TABLE "sponsorship_donations" DROP CONSTRAINT IF EXISTS "sponsorship_donations_countryId_fkey";
ALTER TABLE "sponsorship_donations" ALTER COLUMN "sponsorshipProjectId" DROP NOT NULL;
ALTER TABLE "sponsorship_donations" ALTER COLUMN "countryId" DROP NOT NULL;
ALTER TABLE "sponsorship_donations" ADD CONSTRAINT "sponsorship_donations_sponsorshipProjectId_fkey" FOREIGN KEY ("sponsorshipProjectId") REFERENCES "sponsorship_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sponsorship_donations" ADD CONSTRAINT "sponsorship_donations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "sponsorship_project_countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
