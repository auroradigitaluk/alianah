-- AlterTable
ALTER TABLE "demo_order_items" ADD COLUMN "qurbaniCountryId" TEXT;
ALTER TABLE "demo_order_items" ADD COLUMN "qurbaniSize" TEXT;

-- CreateTable
CREATE TABLE "qurbani_countries" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "priceOneSeventhPence" INTEGER,
    "priceSmallPence" INTEGER,
    "priceLargePence" INTEGER,
    "labelOneSeventh" TEXT,
    "labelSmall" TEXT,
    "labelLarge" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qurbani_countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qurbani_donations" (
    "id" TEXT NOT NULL,
    "qurbaniCountryId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "collectedVia" TEXT,
    "transactionId" TEXT,
    "giftAid" BOOLEAN NOT NULL DEFAULT false,
    "giftAidClaimed" BOOLEAN NOT NULL DEFAULT false,
    "giftAidClaimedAt" TIMESTAMP(3),
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingPostcode" TEXT,
    "billingCountry" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qurbani_donations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qurbani_countries_isActive_idx" ON "qurbani_countries"("isActive");
CREATE INDEX "qurbani_countries_sortOrder_idx" ON "qurbani_countries"("sortOrder");
CREATE INDEX "qurbani_donations_qurbaniCountryId_idx" ON "qurbani_donations"("qurbaniCountryId");
CREATE INDEX "qurbani_donations_donorId_idx" ON "qurbani_donations"("donorId");
CREATE INDEX "qurbani_donations_size_idx" ON "qurbani_donations"("size");
CREATE INDEX "qurbani_donations_createdAt_idx" ON "qurbani_donations"("createdAt");

-- AddForeignKey
ALTER TABLE "qurbani_donations" ADD CONSTRAINT "qurbani_donations_qurbaniCountryId_fkey" FOREIGN KEY ("qurbaniCountryId") REFERENCES "qurbani_countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qurbani_donations" ADD CONSTRAINT "qurbani_donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
