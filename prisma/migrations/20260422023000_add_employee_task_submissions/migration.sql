CREATE TABLE "employee_task_submissions" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "submittedByAdminUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "employee_task_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_task_submissions_submittedByAdminUserId_idx"
  ON "employee_task_submissions"("submittedByAdminUserId");

CREATE INDEX "employee_task_submissions_completedAt_idx"
  ON "employee_task_submissions"("completedAt");

CREATE INDEX "employee_task_submissions_createdAt_idx"
  ON "employee_task_submissions"("createdAt");

ALTER TABLE "employee_task_submissions"
  ADD CONSTRAINT "employee_task_submissions_submittedByAdminUserId_fkey"
  FOREIGN KEY ("submittedByAdminUserId")
  REFERENCES "admin_users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
