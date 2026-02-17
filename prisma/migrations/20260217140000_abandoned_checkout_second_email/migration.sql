-- AlterTable
ALTER TABLE "demo_orders" ADD COLUMN "abandonedEmail2SentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "demo_orders_abandonedEmail2SentAt_idx" ON "demo_orders"("abandonedEmail2SentAt");
