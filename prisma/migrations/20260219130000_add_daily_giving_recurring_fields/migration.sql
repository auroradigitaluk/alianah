-- AlterTable RecurringDonation: add scheduleEndDate and frequency index
ALTER TABLE "recurring_donations" ADD COLUMN "scheduleEndDate" TIMESTAMP(3);
CREATE INDEX "recurring_donations_frequency_idx" ON "recurring_donations"("frequency");

-- AlterTable DemoOrderItem: add dailyGivingEndDate
ALTER TABLE "demo_order_items" ADD COLUMN "dailyGivingEndDate" TEXT;
