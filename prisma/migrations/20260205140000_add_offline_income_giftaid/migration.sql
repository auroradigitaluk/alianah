-- AlterTable
ALTER TABLE "offline_income" ADD COLUMN "donorId" TEXT;
ALTER TABLE "offline_income" ADD COLUMN "giftAid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "offline_income" ADD COLUMN "giftAidClaimed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "offline_income" ADD COLUMN "giftAidClaimedAt" TIMESTAMP(3);
ALTER TABLE "offline_income" ADD COLUMN "billingAddress" TEXT;
ALTER TABLE "offline_income" ADD COLUMN "billingCity" TEXT;
ALTER TABLE "offline_income" ADD COLUMN "billingPostcode" TEXT;
ALTER TABLE "offline_income" ADD COLUMN "billingCountry" TEXT;

-- CreateIndex
CREATE INDEX "offline_income_donorId_idx" ON "offline_income"("donorId");
CREATE INDEX "offline_income_giftAid_idx" ON "offline_income"("giftAid");

-- AddForeignKey
ALTER TABLE "offline_income" ADD CONSTRAINT "offline_income_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
