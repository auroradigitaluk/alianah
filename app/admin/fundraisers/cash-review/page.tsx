import { AdminHeader } from "@/components/admin-header"
import { FundraiserCashReviewOverview } from "@/components/fundraiser-cash-review-overview"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function FundraiserCashReviewPage() {
  return (
    <>
      <AdminHeader title="Offline to review" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <FundraiserCashReviewOverview />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
