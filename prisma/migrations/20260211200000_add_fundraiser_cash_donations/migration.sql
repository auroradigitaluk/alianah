-- CreateTable
CREATE TABLE "fundraiser_cash_donations" (
    "id" TEXT NOT NULL,
    "fundraiserId" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "donorName" TEXT,
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fundraiser_cash_donations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fundraiser_cash_donations_fundraiserId_idx" ON "fundraiser_cash_donations"("fundraiserId");

-- CreateIndex
CREATE INDEX "fundraiser_cash_donations_status_idx" ON "fundraiser_cash_donations"("status");

-- CreateIndex
CREATE INDEX "fundraiser_cash_donations_createdAt_idx" ON "fundraiser_cash_donations"("createdAt");

-- AddForeignKey
ALTER TABLE "fundraiser_cash_donations" ADD CONSTRAINT "fundraiser_cash_donations_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "fundraisers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fundraiser_cash_donations" ADD CONSTRAINT "fundraiser_cash_donations_reviewedByAdminUserId_fkey" FOREIGN KEY ("reviewedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
