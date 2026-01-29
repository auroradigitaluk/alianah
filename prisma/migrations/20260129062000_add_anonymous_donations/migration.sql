-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "demo_order_items" ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "water_project_donations" ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
