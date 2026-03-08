import { AdminHeader } from "@/components/admin-header"
import { getFundraisers, getFundraiserStats } from "../get-fundraisers"
import { FundraisersDashboardClient } from "@/components/fundraisers-dashboard-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AppealFundraisersPage() {
  const [fundraisers, stats] = await Promise.all([
    getFundraisers({ appealId: { not: null } }),
    getFundraiserStats({ appealId: { not: null } }),
  ])

  return (
    <>
      <AdminHeader title="Appeal fundraisers" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <FundraisersDashboardClient
                fundraisers={fundraisers}
                stats={stats}
                byCampaign={[]}
                eligibleCampaigns={[]}
                showAppealsTab={false}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
