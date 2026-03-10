import { prisma } from "@/lib/prisma"
import { FundraiserCreateStepper } from "@/components/fundraiser-create-stepper"

export const dynamic = "force-dynamic"

async function getEligibleAppeals() {
  try {
    return await prisma.appeal.findMany({
      where: { isActive: true, allowFundraising: true },
      select: { id: true, title: true, slug: true, summary: true, fundraisingDefaultMessage: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    })
  } catch (error) {
    console.error("Error fetching eligible appeals:", error)
    return []
  }
}

export default async function FundraiserCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>
}) {
  const params = await searchParams
  const initialCampaignId = params.campaignId ?? null

  const appeals = await getEligibleAppeals()

  const eligibleCampaigns = appeals.map((a) => ({ ...a, type: "APPEAL" as const }))

  return (
    <div className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:px-6 max-w-lg">
      <FundraiserCreateStepper
        eligibleCampaigns={eligibleCampaigns}
        initialCampaignId={initialCampaignId}
      />
    </div>
  )
}
