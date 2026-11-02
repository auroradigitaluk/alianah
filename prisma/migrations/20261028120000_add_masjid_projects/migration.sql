-- CreateTable
CREATE TABLE "masjid_projects" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "priceFromPence" INTEGER NOT NULL,
    "priceToPence" INTEGER,
    "priceNote" TEXT,
    "imageUrls" TEXT NOT NULL DEFAULT '[]',
    "fundraisingImageUrls" TEXT NOT NULL DEFAULT '[]',
    "fundraisingDefaultMessage" TEXT,
    "allowFundraising" BOOLEAN NOT NULL DEFAULT true,
    "allowPartialDonations" BOOLEAN NOT NULL DEFAULT true,
    "framerUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "appealId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "masjid_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "masjid_projects_slug_key" ON "masjid_projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "masjid_projects_appealId_key" ON "masjid_projects"("appealId");

-- CreateIndex
CREATE INDEX "masjid_projects_isActive_sortOrder_idx" ON "masjid_projects"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "masjid_projects" ADD CONSTRAINT "masjid_projects_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
