-- CreateTable
CREATE TABLE "distributions" (
    "id" TEXT NOT NULL,
    "appealId" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "distributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "distributions_appealId_idx" ON "distributions"("appealId");

-- CreateIndex
CREATE INDEX "distributions_createdById_idx" ON "distributions"("createdById");

-- CreateIndex
CREATE INDEX "distributions_createdAt_idx" ON "distributions"("createdAt");

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "appeals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
