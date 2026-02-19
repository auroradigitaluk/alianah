-- AlterTable
ALTER TABLE "demo_order_items" ADD COLUMN "dailyGivingOddNightsOnly" BOOLEAN;

-- AlterTable
ALTER TABLE "demo_orders" ADD COLUMN "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "recurring_donations" ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "dailyGivingOddNightsOnly" BOOLEAN NOT NULL DEFAULT false;
