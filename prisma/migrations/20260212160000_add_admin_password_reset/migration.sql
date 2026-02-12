-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN "passwordResetToken" TEXT,
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "admin_users_passwordResetToken_idx" ON "admin_users"("passwordResetToken");
