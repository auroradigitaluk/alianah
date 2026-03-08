import { redirect } from "next/navigation"
import { AdminHeader } from "@/components/admin-header"
import {
  getFundraisers,
  getFundraiserStats,
  getFundraisedByCampaign,
  getEligibleCampaigns,
} from "./get-fundraisers"
import { FundraisersDashboardClient } from "@/components/fundraisers-dashboard-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export type { EligibleCampaign } from "./get-fundraisers"

export default async function FundraisersPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>
}) {
  const params = await searchParams
  if (params?.open) {
    redirect(`/admin/fundraisers/${params.open}`)
  }
  const [fundraisers, stats, byCampaign, eligibleCampaigns] = await Promise.all([
    getFundraisers(),
    getFundraiserStats(),
    getFundraisedByCampaign(),
    getEligibleCampaigns(),
  ])

  return (
    <>
      <AdminHeader title="Fundraisers" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <FundraisersDashboardClient
                  fundraisers={fundraisers}
                  stats={stats}
                  byCampaign={byCampaign}
                  eligibleCampaigns={eligibleCampaigns}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
