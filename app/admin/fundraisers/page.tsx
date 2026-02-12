import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { getDeduplicatedDonationSum, getDeduplicatedDonationCount, getDeduplicatedDonationGroupBy, sumDonationsDeduplicated } from "@/lib/donation-dedup"
import {
  FundraisersDashboardClient,
  type FundraisedByCampaignRow,
} from "@/components/fundraisers-dashboard-client"
import { ExportCsvButton } from "@/components/export-csv-button"

export const dynamic = "force-dynamic"
export const revalidate = 0

const WATER_PROJECT_STATUSES = ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"] as const

async function getFundraisers() {
  try {
    const fundraisers = await prisma.fundraiser.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        appeal: {
          select: {
            title: true,
          },
        },
        waterProject: {
          select: {
            projectType: true,
          },
        },
        donations: {
          where: {
            status: "COMPLETED",
          },
          select: {
            id: true,
            amountPence: true,
            orderNumber: true,
            transactionId: true,
          },
        },
        waterProjectDonations: {
          where: {
            status: {
              in: [...WATER_PROJECT_STATUSES],
            },
          },
          select: {
            amountPence: true,
          },
        },
        cashDonations: {
          where: { status: "APPROVED" },
          select: { amountPence: true },
        },
      },
    })

    return fundraisers.map((fundraiser) => {
      const amountRaised =
        sumDonationsDeduplicated(fundraiser.donations) +
        fundraiser.waterProjectDonations.reduce((sum, d) => sum + d.amountPence, 0) +
        fundraiser.cashDonations.reduce((sum, d) => sum + d.amountPence, 0)
      const campaignTitle = fundraiser.appeal?.title
        ? fundraiser.appeal.title
        : fundraiser.waterProject?.projectType === "WATER_PUMP"
          ? "Water Pumps"
          : fundraiser.waterProject?.projectType === "WATER_WELL"
            ? "Water Wells"
            : fundraiser.waterProject?.projectType === "WATER_TANK"
              ? "Water Tanks"
              : fundraiser.waterProject?.projectType === "WUDHU_AREA"
                ? "Wudhu Areas"
                : "Water Project"

      return {
        id: fundraiser.id,
        title: fundraiser.title,
        slug: fundraiser.slug,
        fundraiserName: fundraiser.fundraiserName,
        email: fundraiser.email,
        isActive: fundraiser.isActive,
        campaign: {
          title: campaignTitle,
          type: (fundraiser.appeal ? "APPEAL" : "WATER") as "APPEAL" | "WATER",
        },
        amountRaised,
      }
    })
  } catch (error) {
    return []
  }
}

async function getFundraiserStats() {
  try {
    const [donationSum, waterAgg, activeCount, totalCount, donationCountDonation, donationCountWater] =
      await Promise.all([
        getDeduplicatedDonationSum({
          fundraiserId: { not: null },
          status: "COMPLETED",
        }),
        prisma.waterProjectDonation.aggregate({
          where: {
            fundraiserId: { not: null },
            status: { in: [...WATER_PROJECT_STATUSES] },
          },
          _sum: { amountPence: true },
          _count: { id: true },
        }),
        prisma.fundraiser.count({ where: { isActive: true } }),
        prisma.fundraiser.count(),
        getDeduplicatedDonationCount({
          fundraiserId: { not: null },
          status: "COMPLETED",
        }),
        prisma.waterProjectDonation.count({
          where: {
            fundraiserId: { not: null },
            status: { in: [...WATER_PROJECT_STATUSES] },
          },
        }),
      ])

    const totalRaisedPence =
      donationSum + (waterAgg._sum.amountPence ?? 0)
    const donationsThroughFundraisers = donationCountDonation + donationCountWater

    return {
      totalRaisedPence,
      activeFundraisers: activeCount,
      totalFundraisers: totalCount,
      donationsThroughFundraisers,
    }
  } catch (error) {
    return {
      totalRaisedPence: 0,
      activeFundraisers: 0,
      totalFundraisers: 0,
      donationsThroughFundraisers: 0,
    }
  }
}

const WATER_PROJECT_TYPE_LABELS: Record<string, string> = {
  WATER_PUMP: "Water Pumps",
  WATER_WELL: "Water Wells",
  WATER_TANK: "Water Tanks",
  WUDHU_AREA: "Wudhu Areas",
}

async function getFundraisedByCampaign(): Promise<FundraisedByCampaignRow[]> {
  try {
    const [byAppeal, waterDonations] = await Promise.all([
      getDeduplicatedDonationGroupBy(
        {
          fundraiserId: { not: null },
          appealId: { not: null },
          status: "COMPLETED",
        },
        "appealId"
      ),
      prisma.waterProjectDonation.findMany({
        where: {
          fundraiserId: { not: null },
          status: { in: [...WATER_PROJECT_STATUSES] },
        },
        select: {
          amountPence: true,
          waterProject: { select: { projectType: true } },
          country: { select: { country: true } },
        },
      }),
    ])

    const appealIds = byAppeal.map((a) => a.appealId).filter(Boolean) as string[]
    const appeals =
      appealIds.length > 0
        ? await prisma.appeal.findMany({
            where: { id: { in: appealIds } },
            select: { id: true, title: true },
          })
        : []
    const appealTitleById = new Map(appeals.map((a) => [a.id, a.title]))

    const rows: FundraisedByCampaignRow[] = []

    for (const g of byAppeal) {
      if (!g.appealId) continue
      const amountPence = g._sum.amountPence ?? 0
      rows.push({
        campaignId: g.appealId,
        campaignTitle: appealTitleById.get(g.appealId) ?? "Unknown appeal",
        campaignType: "APPEAL",
        amountPence,
      })
    }

    // Water: group by project type + country so we get e.g. "Water Pumps - Sri Lanka"
    const waterByTypeAndCountry = new Map<string, number>()
    for (const d of waterDonations) {
      const type = d.waterProject.projectType
      const country = d.country?.country ?? "Unknown"
      const key = `${type}\t${country}`
      waterByTypeAndCountry.set(key, (waterByTypeAndCountry.get(key) ?? 0) + d.amountPence)
    }
    for (const [key, amountPence] of waterByTypeAndCountry) {
      const [projectType, country] = key.split("\t")
      const typeLabel = WATER_PROJECT_TYPE_LABELS[projectType] ?? projectType
      const campaignTitle =
        country && country !== "Unknown" ? `${typeLabel} - ${country}` : typeLabel
      rows.push({
        campaignId: key,
        campaignTitle,
        campaignType: "WATER",
        amountPence,
      })
    }

    return rows.sort((a, b) => b.amountPence - a.amountPence)
  } catch (error) {
    return []
  }
}

export type EligibleCampaign = {
  id: string
  title: string
  type: "APPEAL" | "WATER"
  projectType?: string // WATER_PUMP etc when type is WATER
}

async function getEligibleCampaigns(): Promise<EligibleCampaign[]> {
  try {
    const [appeals, waterProjects] = await Promise.all([
      prisma.appeal.findMany({
        where: { allowFundraising: true, isActive: true, archivedAt: null },
        select: { id: true, title: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.waterProject.findMany({
        where: { allowFundraising: true, isActive: true },
        select: { id: true, projectType: true },
      }),
    ])
    const waterLabels: Record<string, string> = {
      WATER_PUMP: "Water Pumps",
      WATER_WELL: "Water Wells",
      WATER_TANK: "Water Tanks",
      WUDHU_AREA: "Wudhu Areas",
    }
    return [
      ...appeals.map((a) => ({ id: a.id, title: a.title, type: "APPEAL" as const })),
      ...waterProjects.map((p) => ({
        id: p.id,
        title: waterLabels[p.projectType] ?? p.projectType,
        type: "WATER" as const,
        projectType: p.projectType,
      })),
    ]
  } catch {
    return []
  }
}

export default async function FundraisersPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>
}) {
  const params = await searchParams
  const [fundraisers, stats, byCampaign, eligibleCampaigns] = await Promise.all([
    getFundraisers(),
    getFundraiserStats(),
    getFundraisedByCampaign(),
    getEligibleCampaigns(),
  ])

  return (
    <>
      <AdminHeader
        title="Fundraisers"
        actions={<ExportCsvButton variant="fundraisers" data={fundraisers} />}
      />
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
                  openId={params?.open ?? undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
