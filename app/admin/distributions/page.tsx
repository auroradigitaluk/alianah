import { AdminHeader } from "@/components/admin-header"
import { DistributionsPageClient } from "@/components/distributions/distributions-page-client"

export default async function DistributionsPage() {
  return (
    <>
      <AdminHeader title="Distributions" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <DistributionsPageClient />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
