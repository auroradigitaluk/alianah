-- AlterTable: replace single "address" with addressLine1, postcode, city, country, bookedByName
ALTER TABLE "collection_bookings" ADD COLUMN "addressLine1" TEXT;
ALTER TABLE "collection_bookings" ADD COLUMN "postcode" TEXT;
ALTER TABLE "collection_bookings" ADD COLUMN "city" TEXT;
ALTER TABLE "collection_bookings" ADD COLUMN "country" TEXT;
ALTER TABLE "collection_bookings" ADD COLUMN "bookedByName" TEXT;

-- Migrate existing address into addressLine1
UPDATE "collection_bookings" SET "addressLine1" = "address" WHERE "address" IS NOT NULL;

-- For any row without addressLine1 (shouldn't happen), set placeholder
UPDATE "collection_bookings" SET "addressLine1" = '' WHERE "addressLine1" IS NULL;

ALTER TABLE "collection_bookings" ALTER COLUMN "addressLine1" SET NOT NULL;
ALTER TABLE "collection_bookings" DROP COLUMN "address";
