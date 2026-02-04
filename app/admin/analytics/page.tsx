import { AdminHeader } from "@/components/admin-header"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function AnalyticsPage() {
  return (
    <>
      <AdminHeader title="Analytics" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <AnalyticsDashboard />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
