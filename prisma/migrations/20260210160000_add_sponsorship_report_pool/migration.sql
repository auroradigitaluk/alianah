-- CreateTable
CREATE TABLE "sponsorship_report_pool" (
    "id" TEXT NOT NULL,
    "sponsorshipProjectId" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedDonationId" TEXT,

    CONSTRAINT "sponsorship_report_pool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sponsorship_report_pool_sponsorshipProjectId_idx" ON "sponsorship_report_pool"("sponsorshipProjectId");

-- CreateIndex
CREATE INDEX "sponsorship_report_pool_assignedDonationId_idx" ON "sponsorship_report_pool"("assignedDonationId");

-- AddForeignKey
ALTER TABLE "sponsorship_report_pool" ADD CONSTRAINT "sponsorship_report_pool_sponsorshipProjectId_fkey" FOREIGN KEY ("sponsorshipProjectId") REFERENCES "sponsorship_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
