-- Add support for custom fundraisers (flag + custom images)

ALTER TABLE "fundraisers"
ADD COLUMN "isCustom" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "fundraisers"
ADD COLUMN "customImageUrls" TEXT NOT NULL DEFAULT '[]';

