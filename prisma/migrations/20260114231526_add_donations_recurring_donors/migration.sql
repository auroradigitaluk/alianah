-- CreateTable
CREATE TABLE "donors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "donations" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "donations_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "donations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recurring_donations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorId" TEXT NOT NULL,
    "appealId" TEXT,
    "productId" TEXT,
    "amountPence" INTEGER NOT NULL,
    "donationType" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "nextPaymentDate" DATETIME,
    "lastPaymentDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recurring_donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recurring_donations_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "recurring_donations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "donors_email_key" ON "donors"("email");

-- CreateIndex
CREATE INDEX "donors_email_idx" ON "donors"("email");

-- CreateIndex
CREATE INDEX "donations_donorId_idx" ON "donations"("donorId");

-- CreateIndex
CREATE INDEX "donations_appealId_idx" ON "donations"("appealId");

-- CreateIndex
CREATE INDEX "donations_status_idx" ON "donations"("status");

-- CreateIndex
CREATE INDEX "donations_createdAt_idx" ON "donations"("createdAt");

-- CreateIndex
CREATE INDEX "recurring_donations_donorId_idx" ON "recurring_donations"("donorId");

-- CreateIndex
CREATE INDEX "recurring_donations_appealId_idx" ON "recurring_donations"("appealId");

-- CreateIndex
CREATE INDEX "recurring_donations_status_idx" ON "recurring_donations"("status");

-- CreateIndex
CREATE INDEX "recurring_donations_nextPaymentDate_idx" ON "recurring_donations"("nextPaymentDate");
