-- CreateTable
CREATE TABLE "volunteers" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "volunteers_email_idx" ON "volunteers"("email");
CREATE INDEX "volunteers_firstName_idx" ON "volunteers"("firstName");
CREATE INDEX "volunteers_lastName_idx" ON "volunteers"("lastName");
CREATE INDEX "volunteers_city_idx" ON "volunteers"("city");
CREATE INDEX "volunteers_phone_idx" ON "volunteers"("phone");
CREATE INDEX "volunteers_createdAt_idx" ON "volunteers"("createdAt");
CREATE INDEX "volunteers_status_idx" ON "volunteers"("status");
