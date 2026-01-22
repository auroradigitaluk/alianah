-- CreateTable
CREATE TABLE "demo_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "demo_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "appealId" TEXT,
    "productId" TEXT,
    "appealTitle" TEXT NOT NULL,
    "productName" TEXT,
    "frequency" TEXT NOT NULL,
    "donationType" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "demo_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "demo_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
