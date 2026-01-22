import { AdminHeader } from "@/components/admin-header"
import { AppealForm } from "@/components/appeal-form"
import { prisma } from "@/lib/prisma"

export default async function NewAppealPage() {
  return (
    <>
      <AdminHeader title="New Appeal" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Create Appeal</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Add a new donation appeal</p>
                </div>
                <div>
                  <AppealForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
