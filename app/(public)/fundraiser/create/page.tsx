import { prisma } from "@/lib/prisma"
import { FundraiserCreateStepper } from "@/components/fundraiser-create-stepper"
import { getQurbaniEnabled } from "@/lib/settings"

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

  const [appeals, qurbaniEnabled] = await Promise.all([getEligibleAppeals(), getQurbaniEnabled()])

  const qurbaniCampaign = qurbaniEnabled
    ? [
        {
          id: "__qurbani__",
          title: "Qurbani",
          slug: "qurbani",
          summary:
            "Create a Qurbani fundraiser by country with fixed preset options from our public Qurbani page.",
          type: "QURBANI" as const,
          fundraisingDefaultMessage:
            "I am fundraising for Qurbani with Alianah Humanity Welfare so more families can receive fresh meat this Eid ul-Adha with dignity and care. Your donation supports carefully managed distributions in the countries and options shown on this page, with clear pricing and a 100% donation policy for the cause. Alianah works with trusted teams on the ground to identify those most in need, arrange sacrifice and distribution responsibly, and provide timely updates and feedback to donors. Every contribution helps us reach vulnerable households quickly, especially widows, orphans and low-income families, and ensures your Qurbani has real impact when it matters most.",
        },
      ]
    : []

  const eligibleCampaigns = [
    ...qurbaniCampaign,
    ...appeals.map((a) => ({ ...a, type: "APPEAL" as const })),
  ]

  return (
    <div className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:px-6 max-w-lg">
      <FundraiserCreateStepper
        eligibleCampaigns={eligibleCampaigns}
        initialCampaignId={initialCampaignId}
      />
    </div>
  )
}
