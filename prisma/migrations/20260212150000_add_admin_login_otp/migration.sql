-- CreateTable
CREATE TABLE "admin_login_otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_login_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_login_otps_email_idx" ON "admin_login_otps"("email");

-- CreateIndex
CREATE INDEX "admin_login_otps_code_idx" ON "admin_login_otps"("code");
