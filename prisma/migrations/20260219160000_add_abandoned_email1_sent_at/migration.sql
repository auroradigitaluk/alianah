-- AlterTable: add abandonedEmail1SentAt to demo_orders (set when first abandoned email sent; used to show "Saved" if they later complete)
ALTER TABLE "demo_orders" ADD COLUMN "abandonedEmail1SentAt" TIMESTAMP(3);

CREATE INDEX "demo_orders_abandonedEmail1SentAt_idx" ON "demo_orders"("abandonedEmail1SentAt");
