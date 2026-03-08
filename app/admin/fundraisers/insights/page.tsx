import { AdminHeader } from "@/components/admin-header"
import { getFundraiserStats, getFundraisedByCampaign } from "../get-fundraisers"
import { FundraisersInsightsClient } from "@/components/fundraisers-insights-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function FundraisersInsightsPage() {
  const [stats, byCampaign] = await Promise.all([
    getFundraiserStats(),
    getFundraisedByCampaign(),
  ])

  return (
    <>
      <AdminHeader title="Fundraiser insights" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <FundraisersInsightsClient stats={stats} byCampaign={byCampaign} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
