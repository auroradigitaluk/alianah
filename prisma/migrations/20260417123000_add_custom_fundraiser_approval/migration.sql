-- Add moderation fields for custom fundraisers
ALTER TABLE "fundraisers"
ADD COLUMN "customApprovalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "customDeclineReason" TEXT,
ADD COLUMN "customReviewedAt" TIMESTAMP(3),
ADD COLUMN "customReviewedByAdminUserId" TEXT;

-- Backfill existing custom fundraisers that are inactive to declined
UPDATE "fundraisers"
SET "customApprovalStatus" = 'DECLINED'
WHERE "isCustom" = true AND "isActive" = false;

CREATE INDEX "fundraisers_customApprovalStatus_idx" ON "fundraisers"("customApprovalStatus");
CREATE INDEX "fundraisers_customReviewedByAdminUserId_idx" ON "fundraisers"("customReviewedByAdminUserId");

ALTER TABLE "fundraisers"
ADD CONSTRAINT "fundraisers_customReviewedByAdminUserId_fkey"
FOREIGN KEY ("customReviewedByAdminUserId")
REFERENCES "admin_users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
