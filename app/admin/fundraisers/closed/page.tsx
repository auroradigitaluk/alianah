import { AdminHeader } from "@/components/admin-header"
import { getFundraisers, getFundraiserStats } from "../get-fundraisers"
import { FundraisersDashboardClient } from "@/components/fundraisers-dashboard-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ClosedFundraisersPage() {
  const [allFundraisers, stats] = await Promise.all([
    getFundraisers(),
    getFundraiserStats(),
  ])

  const closed = allFundraisers.filter(
    (f) =>
      !f.isActive ||
      (f.targetAmountPence != null &&
        f.targetAmountPence > 0 &&
        f.amountRaised >= f.targetAmountPence)
  )

  const totalRaisedComplete = closed.reduce((sum, f) => sum + f.amountRaised, 0)

  return (
    <>
      <AdminHeader title="Complete" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <FundraisersDashboardClient
                fundraisers={closed}
                stats={{
                  ...stats,
                  totalRaisedPence: totalRaisedComplete,
                  activeFundraisers: closed.filter((f) => f.isActive).length,
                  totalFundraisers: closed.length,
                }}
                byCampaign={[]}
                eligibleCampaigns={[]}
                showCreateButton={false}
                showAppealsTab={false}
                pageTitle="Complete"
                pageDescription="Fundraisers that have reached their target or been closed. Open any row to view details or move water fundraisers to the water projects page for processing."
                listTitle="Complete fundraisers"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
