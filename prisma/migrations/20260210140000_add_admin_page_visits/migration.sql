-- CreateTable
CREATE TABLE "admin_page_visits" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "lastVisitedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_page_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_page_visits_adminUserId_idx" ON "admin_page_visits"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_page_visits_adminUserId_pageKey_key" ON "admin_page_visits"("adminUserId", "pageKey");

-- AddForeignKey
ALTER TABLE "admin_page_visits" ADD CONSTRAINT "admin_page_visits_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
