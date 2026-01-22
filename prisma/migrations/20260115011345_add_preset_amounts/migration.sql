-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_appeals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "heroImageUrl" TEXT,
    "galleryImageUrls" TEXT NOT NULL DEFAULT '[]',
    "sectionIntro" TEXT NOT NULL,
    "sectionNeed" TEXT NOT NULL,
    "sectionFundsUsed" TEXT NOT NULL,
    "sectionImpact" TEXT NOT NULL,
    "framerUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "donationTypesEnabled" TEXT NOT NULL DEFAULT '[]',
    "defaultDonationType" TEXT NOT NULL DEFAULT 'GENERAL',
    "allowMonthly" BOOLEAN NOT NULL DEFAULT false,
    "allowYearly" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomMonthly" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomYearly" BOOLEAN NOT NULL DEFAULT false,
    "monthlyPresetAmountsPence" TEXT NOT NULL DEFAULT '[]',
    "yearlyPresetAmountsPence" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_appeals" ("allowCustomMonthly", "allowCustomYearly", "allowMonthly", "allowYearly", "createdAt", "defaultDonationType", "donationTypesEnabled", "framerUrl", "galleryImageUrls", "heroImageUrl", "id", "isActive", "sectionFundsUsed", "sectionImpact", "sectionIntro", "sectionNeed", "slug", "summary", "title", "updatedAt") SELECT "allowCustomMonthly", "allowCustomYearly", "allowMonthly", "allowYearly", "createdAt", "defaultDonationType", "donationTypesEnabled", "framerUrl", "galleryImageUrls", "heroImageUrl", "id", "isActive", "sectionFundsUsed", "sectionImpact", "sectionIntro", "sectionNeed", "slug", "summary", "title", "updatedAt" FROM "appeals";
DROP TABLE "appeals";
ALTER TABLE "new_appeals" RENAME TO "appeals";
CREATE UNIQUE INDEX "appeals_slug_key" ON "appeals"("slug");
CREATE INDEX "appeals_slug_idx" ON "appeals"("slug");
CREATE INDEX "appeals_isActive_idx" ON "appeals"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
