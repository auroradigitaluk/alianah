-- AlterTable: make country optional and add itemsDistributed
ALTER TABLE "distributions" ALTER COLUMN "country" DROP NOT NULL;
ALTER TABLE "distributions" ADD COLUMN "itemsDistributed" TEXT;
