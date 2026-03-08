import { redirect } from "next/navigation"
import { Suspense } from "react"
import { AdminHeader } from "@/components/admin-header"
import {
  getFundraisers,
  getFundraiserStats,
  getFundraisedByCampaign,
  getEligibleCampaigns,
} from "./get-fundraisers"
import { FundraisersDashboardClient } from "@/components/fundraisers-dashboard-client"
import { FundraisersInsightsClient } from "@/components/fundraisers-insights-client"
import { FundraiserCashReviewOverview } from "@/components/fundraiser-cash-review-overview"
import { FundraiserTabNav } from "@/components/fundraiser-tab-nav"

export const dynamic = "force-dynamic"
export const revalidate = 0

export type { EligibleCampaign } from "./get-fundraisers"

const VALID_TABS = ["all", "offline", "insights", "complete"] as const

export default async function FundraisersPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string; tab?: string }>
}) {
  const params = await searchParams
  if (params?.open) {
    redirect(`/admin/fundraisers/${params.open}`)
  }
  const tab =
    params?.tab && VALID_TABS.includes(params.tab as (typeof VALID_TABS)[number])
      ? (params.tab as (typeof VALID_TABS)[number])
      : "all"

  return (
    <>
      <AdminHeader title="Fundraisers" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <Suspense fallback={<div className="h-10 w-full rounded-md bg-muted" />}>
                  <FundraiserTabNav />
                </Suspense>
                {tab === "all" && <FundraisersTabAll />}
                {tab === "offline" && <FundraiserCashReviewOverview />}
                {tab === "insights" && <FundraisersTabInsights />}
                {tab === "complete" && <FundraisersTabComplete />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

async function FundraisersTabAll() {
  const [fundraisers, stats, byCampaign, eligibleCampaigns] = await Promise.all([
    getFundraisers(),
    getFundraiserStats(),
    getFundraisedByCampaign(),
    getEligibleCampaigns(),
  ])
  return (
    <FundraisersDashboardClient
      fundraisers={fundraisers}
      stats={stats}
      byCampaign={byCampaign}
      eligibleCampaigns={eligibleCampaigns}
    />
  )
}

async function FundraisersTabInsights() {
  const [stats, byCampaign] = await Promise.all([
    getFundraiserStats(),
    getFundraisedByCampaign(),
  ])
  return <FundraisersInsightsClient stats={stats} byCampaign={byCampaign} />
}

async function FundraisersTabComplete() {
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
  )
}
