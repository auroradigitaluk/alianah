-- AlterTable
ALTER TABLE "appeals" ADD COLUMN "showOnDonationForm" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "appeals" ADD COLUMN "showOnZakatPage" BOOLEAN NOT NULL DEFAULT true;
