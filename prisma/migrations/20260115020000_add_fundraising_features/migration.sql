-- AlterTable
ALTER TABLE "appeals" ADD COLUMN "allowFundraising" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "appeals" ADD COLUMN "appealImageUrls" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "fundraisers" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "fundraisers" ADD COLUMN "message" TEXT;
ALTER TABLE "fundraisers" ADD COLUMN "targetAmountPence" INTEGER;

-- AlterTable
ALTER TABLE "donations" ADD COLUMN "fundraiserId" TEXT;

-- AlterTable
ALTER TABLE "demo_order_items" ADD COLUMN "fundraiserId" TEXT;

-- CreateIndex
CREATE INDEX "donations_fundraiserId_idx" ON "donations"("fundraiserId");

-- CreateIndex
CREATE INDEX "fundraisers_isActive_idx" ON "fundraisers"("isActive");

-- CreateIndex
CREATE INDEX "demo_order_items_fundraiserId_idx" ON "demo_order_items"("fundraiserId");

-- AddForeignKey (Note: SQLite doesn't support adding foreign keys to existing tables easily, so we'll handle this in application code)
-- The foreign key relationships are defined in Prisma schema and will be enforced by Prisma Client
