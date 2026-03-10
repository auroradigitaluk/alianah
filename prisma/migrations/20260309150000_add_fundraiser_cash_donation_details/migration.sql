-- AlterTable
ALTER TABLE "fundraiser_cash_donations" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'CASH';
ALTER TABLE "fundraiser_cash_donations" ADD COLUMN "donationType" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "fundraiser_cash_donations" ADD COLUMN "donorEmail" TEXT;
ALTER TABLE "fundraiser_cash_donations" ADD COLUMN "donorPhone" TEXT;
