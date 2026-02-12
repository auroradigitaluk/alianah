-- CreateTable
CREATE TABLE "collection_bookings" (
    "id" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "addedByAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "collection_bookings_scheduledAt_idx" ON "collection_bookings"("scheduledAt");

-- CreateIndex
CREATE INDEX "collection_bookings_addedByAdminUserId_idx" ON "collection_bookings"("addedByAdminUserId");

-- AddForeignKey
ALTER TABLE "collection_bookings" ADD CONSTRAINT "collection_bookings_addedByAdminUserId_fkey" FOREIGN KEY ("addedByAdminUserId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
