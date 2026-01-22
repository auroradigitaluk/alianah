-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "appeals" (
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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "donationTypesEnabled" TEXT NOT NULL DEFAULT '[]',
    "defaultDonationType" TEXT NOT NULL DEFAULT 'GENERAL',
    "allowMonthly" BOOLEAN NOT NULL DEFAULT false,
    "allowYearly" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomMonthly" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomYearly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "fixedAmountPence" INTEGER,
    "minAmountPence" INTEGER,
    "maxAmountPence" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "appeal_categories" (
    "appealId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("appealId", "categoryId"),
    CONSTRAINT "appeal_categories_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appeal_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "appeal_products" (
    "appealId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "presetAmountsPence" TEXT NOT NULL DEFAULT '[]',
    "allowCustom" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("appealId", "productId", "frequency"),
    CONSTRAINT "appeal_products_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appeal_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fundraisers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fundraiserName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fundraisers_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "offline_income" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appealId" TEXT,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "offline_income_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "masjids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT,
    "appealId" TEXT,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "collectedAt" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collections_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "masjids" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "collections_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_email_idx" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_isActive_sortOrder_idx" ON "categories"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "appeals_slug_key" ON "appeals"("slug");

-- CreateIndex
CREATE INDEX "appeals_slug_idx" ON "appeals"("slug");

-- CreateIndex
CREATE INDEX "appeals_isActive_idx" ON "appeals"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE INDEX "appeal_categories_categoryId_idx" ON "appeal_categories"("categoryId");

-- CreateIndex
CREATE INDEX "appeal_products_productId_idx" ON "appeal_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "fundraisers_slug_key" ON "fundraisers"("slug");

-- CreateIndex
CREATE INDEX "fundraisers_appealId_idx" ON "fundraisers"("appealId");

-- CreateIndex
CREATE INDEX "fundraisers_slug_idx" ON "fundraisers"("slug");

-- CreateIndex
CREATE INDEX "offline_income_appealId_idx" ON "offline_income"("appealId");

-- CreateIndex
CREATE INDEX "offline_income_receivedAt_idx" ON "offline_income"("receivedAt");

-- CreateIndex
CREATE INDEX "masjids_city_idx" ON "masjids"("city");

-- CreateIndex
CREATE INDEX "collections_masjidId_idx" ON "collections"("masjidId");

-- CreateIndex
CREATE INDEX "collections_appealId_idx" ON "collections"("appealId");

-- CreateIndex
CREATE INDEX "collections_collectedAt_idx" ON "collections"("collectedAt");

-- CreateIndex
CREATE INDEX "audit_logs_adminUserId_idx" ON "audit_logs"("adminUserId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
