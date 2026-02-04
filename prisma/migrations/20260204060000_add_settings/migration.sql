-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "charityName" TEXT NOT NULL DEFAULT 'Alianah Humanity Welfare',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@alianah.org',
    "websiteUrl" TEXT NOT NULL DEFAULT 'https://www.alianah.org',
    "charityNumber" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- Insert default organization settings
INSERT INTO "settings" ("id", "charityName", "supportEmail", "websiteUrl", "charityNumber", "updatedAt")
VALUES ('organization', 'Alianah Humanity Welfare', 'support@alianah.org', 'https://www.alianah.org', NULL, NOW());
