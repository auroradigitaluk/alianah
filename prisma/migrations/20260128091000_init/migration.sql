-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeals" (
    "id" TEXT NOT NULL,
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
    "archivedAt" TIMESTAMP(3),
    "donationTypesEnabled" TEXT NOT NULL DEFAULT '[]',
    "defaultDonationType" TEXT NOT NULL DEFAULT 'GENERAL',
    "allowMonthly" BOOLEAN NOT NULL DEFAULT false,
    "allowYearly" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomMonthly" BOOLEAN NOT NULL DEFAULT false,
    "allowCustomYearly" BOOLEAN NOT NULL DEFAULT false,
    "oneOffPresetAmountsPence" TEXT NOT NULL DEFAULT '[]',
    "monthlyPresetAmountsPence" TEXT NOT NULL DEFAULT '[]',
    "yearlyPresetAmountsPence" TEXT NOT NULL DEFAULT '[]',
    "monthlyPricePence" INTEGER,
    "yearlyPricePence" INTEGER,
    "allowFundraising" BOOLEAN NOT NULL DEFAULT false,
    "appealImageUrls" TEXT NOT NULL DEFAULT '[]',
    "fundraisingImageUrls" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "fixedAmountPence" INTEGER,
    "minAmountPence" INTEGER,
    "maxAmountPence" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeal_products" (
    "appealId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "presetAmountsPence" TEXT NOT NULL DEFAULT '[]',
    "allowCustom" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "appeal_products_pkey" PRIMARY KEY ("appealId","productId","frequency")
);

-- CreateTable
CREATE TABLE "fundraisers" (
    "id" TEXT NOT NULL,
    "appealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fundraiserName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT,
    "targetAmountPence" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fundraisers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fundraiser_otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fundraiser_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_income" (
    "id" TEXT NOT NULL,
    "appealId" TEXT,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "collectedVia" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offline_income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masjids" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "masjids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT,
    "appealId" TEXT,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donors" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "appealId" TEXT,
    "fundraiserId" TEXT,
    "productId" TEXT,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "collectedVia" TEXT,
    "transactionId" TEXT,
    "orderNumber" TEXT,
    "giftAid" BOOLEAN NOT NULL DEFAULT false,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingPostcode" TEXT,
    "billingCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_donations" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "appealId" TEXT,
    "productId" TEXT,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "nextPaymentDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subtotalPence" INTEGER NOT NULL,
    "feesPence" INTEGER NOT NULL,
    "totalPence" INTEGER NOT NULL,
    "coverFees" BOOLEAN NOT NULL DEFAULT false,
    "giftAid" BOOLEAN NOT NULL DEFAULT false,
    "marketingEmail" BOOLEAN NOT NULL DEFAULT false,
    "marketingSMS" BOOLEAN NOT NULL DEFAULT false,
    "donorFirstName" TEXT NOT NULL,
    "donorLastName" TEXT NOT NULL,
    "donorEmail" TEXT NOT NULL,
    "donorPhone" TEXT,
    "donorAddress" TEXT,
    "donorCity" TEXT,
    "donorPostcode" TEXT,
    "donorCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "appealId" TEXT,
    "fundraiserId" TEXT,
    "productId" TEXT,
    "appealTitle" TEXT NOT NULL,
    "productName" TEXT,
    "frequency" TEXT NOT NULL,
    "donationType" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "waterProjectId" TEXT,
    "waterProjectCountryId" TEXT,
    "sponsorshipProjectId" TEXT,
    "sponsorshipCountryId" TEXT,
    "sponsorshipProjectType" TEXT,
    "plaqueName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_project_countries" (
    "id" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "pricePence" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_project_countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_projects" (
    "id" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "plaqueAvailable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT,
    "amountPence" INTEGER NOT NULL DEFAULT 0,
    "completionImages" TEXT NOT NULL DEFAULT '[]',
    "completionReport" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_project_donations" (
    "id" TEXT NOT NULL,
    "waterProjectId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "collectedVia" TEXT,
    "transactionId" TEXT,
    "giftAid" BOOLEAN NOT NULL DEFAULT false,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingPostcode" TEXT,
    "billingCountry" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "reportSent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "water_project_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_project_countries" (
    "id" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "pricePence" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorship_project_countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_projects" (
    "id" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT,
    "amountPence" INTEGER NOT NULL DEFAULT 0,
    "completionImages" TEXT NOT NULL DEFAULT '[]',
    "completionReport" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorship_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_donations" (
    "id" TEXT NOT NULL,
    "sponsorshipProjectId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "collectedVia" TEXT,
    "transactionId" TEXT,
    "giftAid" BOOLEAN NOT NULL DEFAULT false,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingPostcode" TEXT,
    "billingCountry" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "reportSent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "sponsorship_donations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_email_idx" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "appeals_slug_key" ON "appeals"("slug");

-- CreateIndex
CREATE INDEX "appeals_slug_idx" ON "appeals"("slug");

-- CreateIndex
CREATE INDEX "appeals_isActive_idx" ON "appeals"("isActive");

-- CreateIndex
CREATE INDEX "appeals_archivedAt_idx" ON "appeals"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE INDEX "appeal_products_productId_idx" ON "appeal_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "fundraisers_slug_key" ON "fundraisers"("slug");

-- CreateIndex
CREATE INDEX "fundraisers_appealId_idx" ON "fundraisers"("appealId");

-- CreateIndex
CREATE INDEX "fundraisers_slug_idx" ON "fundraisers"("slug");

-- CreateIndex
CREATE INDEX "fundraisers_isActive_idx" ON "fundraisers"("isActive");

-- CreateIndex
CREATE INDEX "fundraisers_email_idx" ON "fundraisers"("email");

-- CreateIndex
CREATE INDEX "fundraiser_otps_email_idx" ON "fundraiser_otps"("email");

-- CreateIndex
CREATE INDEX "fundraiser_otps_code_idx" ON "fundraiser_otps"("code");

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
CREATE UNIQUE INDEX "donors_email_key" ON "donors"("email");

-- CreateIndex
CREATE INDEX "donors_email_idx" ON "donors"("email");

-- CreateIndex
CREATE INDEX "donations_donorId_idx" ON "donations"("donorId");

-- CreateIndex
CREATE INDEX "donations_appealId_idx" ON "donations"("appealId");

-- CreateIndex
CREATE INDEX "donations_fundraiserId_idx" ON "donations"("fundraiserId");

-- CreateIndex
CREATE INDEX "donations_status_idx" ON "donations"("status");

-- CreateIndex
CREATE INDEX "donations_createdAt_idx" ON "donations"("createdAt");

-- CreateIndex
CREATE INDEX "donations_orderNumber_idx" ON "donations"("orderNumber");

-- CreateIndex
CREATE INDEX "recurring_donations_donorId_idx" ON "recurring_donations"("donorId");

-- CreateIndex
CREATE INDEX "recurring_donations_appealId_idx" ON "recurring_donations"("appealId");

-- CreateIndex
CREATE INDEX "recurring_donations_status_idx" ON "recurring_donations"("status");

-- CreateIndex
CREATE INDEX "recurring_donations_nextPaymentDate_idx" ON "recurring_donations"("nextPaymentDate");

-- CreateIndex
CREATE INDEX "audit_logs_adminUserId_idx" ON "audit_logs"("adminUserId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "demo_orders_orderNumber_key" ON "demo_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "demo_orders_orderNumber_idx" ON "demo_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "demo_orders_status_idx" ON "demo_orders"("status");

-- CreateIndex
CREATE INDEX "demo_orders_createdAt_idx" ON "demo_orders"("createdAt");

-- CreateIndex
CREATE INDEX "demo_order_items_orderId_idx" ON "demo_order_items"("orderId");

-- CreateIndex
CREATE INDEX "demo_order_items_fundraiserId_idx" ON "demo_order_items"("fundraiserId");

-- CreateIndex
CREATE INDEX "water_project_countries_projectType_isActive_idx" ON "water_project_countries"("projectType", "isActive");

-- CreateIndex
CREATE INDEX "water_project_countries_projectType_sortOrder_idx" ON "water_project_countries"("projectType", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "water_projects_projectType_key" ON "water_projects"("projectType");

-- CreateIndex
CREATE INDEX "water_projects_projectType_isActive_idx" ON "water_projects"("projectType", "isActive");

-- CreateIndex
CREATE INDEX "water_projects_status_idx" ON "water_projects"("status");

-- CreateIndex
CREATE INDEX "water_project_donations_waterProjectId_idx" ON "water_project_donations"("waterProjectId");

-- CreateIndex
CREATE INDEX "water_project_donations_countryId_idx" ON "water_project_donations"("countryId");

-- CreateIndex
CREATE INDEX "water_project_donations_donorId_idx" ON "water_project_donations"("donorId");

-- CreateIndex
CREATE INDEX "water_project_donations_status_idx" ON "water_project_donations"("status");

-- CreateIndex
CREATE INDEX "water_project_donations_createdAt_idx" ON "water_project_donations"("createdAt");

-- CreateIndex
CREATE INDEX "sponsorship_project_countries_projectType_isActive_idx" ON "sponsorship_project_countries"("projectType", "isActive");

-- CreateIndex
CREATE INDEX "sponsorship_project_countries_projectType_sortOrder_idx" ON "sponsorship_project_countries"("projectType", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "sponsorship_projects_projectType_key" ON "sponsorship_projects"("projectType");

-- CreateIndex
CREATE INDEX "sponsorship_projects_projectType_isActive_idx" ON "sponsorship_projects"("projectType", "isActive");

-- CreateIndex
CREATE INDEX "sponsorship_projects_status_idx" ON "sponsorship_projects"("status");

-- CreateIndex
CREATE INDEX "sponsorship_donations_sponsorshipProjectId_idx" ON "sponsorship_donations"("sponsorshipProjectId");

-- CreateIndex
CREATE INDEX "sponsorship_donations_countryId_idx" ON "sponsorship_donations"("countryId");

-- CreateIndex
CREATE INDEX "sponsorship_donations_donorId_idx" ON "sponsorship_donations"("donorId");

-- CreateIndex
CREATE INDEX "sponsorship_donations_status_idx" ON "sponsorship_donations"("status");

-- CreateIndex
CREATE INDEX "sponsorship_donations_createdAt_idx" ON "sponsorship_donations"("createdAt");

-- AddForeignKey
ALTER TABLE "appeal_products" ADD CONSTRAINT "appeal_products_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appeal_products" ADD CONSTRAINT "appeal_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundraisers" ADD CONSTRAINT "fundraisers_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_income" ADD CONSTRAINT "offline_income_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "masjids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "fundraisers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_donations" ADD CONSTRAINT "recurring_donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_donations" ADD CONSTRAINT "recurring_donations_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_donations" ADD CONSTRAINT "recurring_donations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_order_items" ADD CONSTRAINT "demo_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "demo_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_project_donations" ADD CONSTRAINT "water_project_donations_waterProjectId_fkey" FOREIGN KEY ("waterProjectId") REFERENCES "water_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_project_donations" ADD CONSTRAINT "water_project_donations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "water_project_countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_project_donations" ADD CONSTRAINT "water_project_donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_donations" ADD CONSTRAINT "sponsorship_donations_sponsorshipProjectId_fkey" FOREIGN KEY ("sponsorshipProjectId") REFERENCES "sponsorship_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_donations" ADD CONSTRAINT "sponsorship_donations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "sponsorship_project_countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_donations" ADD CONSTRAINT "sponsorship_donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

