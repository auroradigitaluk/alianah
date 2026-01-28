-- Add yearly pricing for sponsorship countries
ALTER TABLE "sponsorship_project_countries"
ADD COLUMN "yearlyPricePence" INTEGER;
