import { AdminHeader } from "@/components/admin-header"
import { EmployeeTaskSubmissionsPageClient } from "@/components/employee-task-submissions/employee-task-submissions-page-client"

export default async function EmployeeTaskSubmissionsPage() {
  return (
    <>
      <AdminHeader title="Employee Task Submissions" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <EmployeeTaskSubmissionsPageClient />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
