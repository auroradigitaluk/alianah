-- CreateTable
CREATE TABLE "fundraiser_profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fundraiser_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fundraiser_profiles_email_key" ON "fundraiser_profiles"("email");

-- CreateIndex
CREATE INDEX "fundraiser_profiles_email_idx" ON "fundraiser_profiles"("email");
