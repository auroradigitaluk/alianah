-- AlterTable
ALTER TABLE "water_project_donations" ADD COLUMN "countryName" TEXT;
ALTER TABLE "water_project_donations" ADD COLUMN "projectTypeSnapshot" TEXT;

-- AlterTable
ALTER TABLE "sponsorship_donations" ADD COLUMN "countryName" TEXT;
ALTER TABLE "sponsorship_donations" ADD COLUMN "projectTypeSnapshot" TEXT;

-- Backfill snapshots for existing donations that still have country/project (so we keep showing names after future deletes)
UPDATE water_project_donations w
SET "countryName" = sub.country, "projectTypeSnapshot" = sub."projectType"
FROM (
  SELECT w2.id, c.country, p."projectType"
  FROM water_project_donations w2
  JOIN water_project_countries c ON c.id = w2."countryId"
  LEFT JOIN water_projects p ON p.id = w2."waterProjectId"
) sub
WHERE w.id = sub.id;

UPDATE sponsorship_donations s
SET "countryName" = sub.country, "projectTypeSnapshot" = sub."projectType"
FROM (
  SELECT s2.id, c.country, p."projectType"
  FROM sponsorship_donations s2
  JOIN sponsorship_project_countries c ON c.id = s2."countryId"
  LEFT JOIN sponsorship_projects p ON p.id = s2."sponsorshipProjectId"
) sub
WHERE s.id = sub.id;
