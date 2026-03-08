import { AdminHeader } from "@/components/admin-header"
import { getEligibleCampaigns } from "../get-fundraisers"
import { CreateFundraiserPageClient } from "@/components/create-fundraiser-page-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function NewFundraiserPage() {
  const eligibleCampaigns = await getEligibleCampaigns()

  return (
    <>
      <AdminHeader title="Create fundraiser" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <CreateFundraiserPageClient eligibleCampaigns={eligibleCampaigns} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
