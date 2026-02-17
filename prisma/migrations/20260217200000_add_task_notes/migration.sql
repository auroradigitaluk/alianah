-- CreateTable
CREATE TABLE "task_notes" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "task_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_notes_taskId_idx" ON "task_notes"("taskId");

-- CreateIndex
CREATE INDEX "task_notes_createdById_idx" ON "task_notes"("createdById");

-- AddForeignKey
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
