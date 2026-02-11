-- AlterTable
ALTER TABLE "demo_orders" ADD COLUMN "transactionId" TEXT;

-- CreateIndex
CREATE INDEX "demo_orders_transactionId_idx" ON "demo_orders"("transactionId");
