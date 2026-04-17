-- Add optional qurbani country link for fundraisers
ALTER TABLE "fundraisers"
ADD COLUMN "qurbaniCountryId" TEXT;

CREATE INDEX "fundraisers_qurbaniCountryId_idx"
ON "fundraisers"("qurbaniCountryId");

ALTER TABLE "fundraisers"
ADD CONSTRAINT "fundraisers_qurbaniCountryId_fkey"
FOREIGN KEY ("qurbaniCountryId")
REFERENCES "qurbani_countries"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Link qurbani donations back to fundraiser pages
ALTER TABLE "qurbani_donations"
ADD COLUMN "fundraiserId" TEXT;

CREATE INDEX "qurbani_donations_fundraiserId_idx"
ON "qurbani_donations"("fundraiserId");

ALTER TABLE "qurbani_donations"
ADD CONSTRAINT "qurbani_donations_fundraiserId_fkey"
FOREIGN KEY ("fundraiserId")
REFERENCES "fundraisers"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
