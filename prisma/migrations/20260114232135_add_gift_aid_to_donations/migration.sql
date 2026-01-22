-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_donations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorId" TEXT NOT NULL,
    "appealId" TEXT,
    "productId" TEXT,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT,
    "giftAid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "donations_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "donations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_donations" ("amountPence", "appealId", "completedAt", "createdAt", "donationType", "donorId", "frequency", "id", "paymentMethod", "productId", "status", "transactionId") SELECT "amountPence", "appealId", "completedAt", "createdAt", "donationType", "donorId", "frequency", "id", "paymentMethod", "productId", "status", "transactionId" FROM "donations";
DROP TABLE "donations";
ALTER TABLE "new_donations" RENAME TO "donations";
CREATE INDEX "donations_donorId_idx" ON "donations"("donorId");
CREATE INDEX "donations_appealId_idx" ON "donations"("appealId");
CREATE INDEX "donations_status_idx" ON "donations"("status");
CREATE INDEX "donations_createdAt_idx" ON "donations"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
