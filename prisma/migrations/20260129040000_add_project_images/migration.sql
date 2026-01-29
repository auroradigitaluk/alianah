-- AlterTable
ALTER TABLE "sponsorship_projects" ADD COLUMN     "projectImageUrls" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "water_projects" ADD COLUMN     "projectImageUrls" TEXT NOT NULL DEFAULT '[]';
