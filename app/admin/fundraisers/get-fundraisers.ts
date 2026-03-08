import { prisma } from "@/lib/prisma"
import {
  sumDonationsDeduplicated,
  getDeduplicatedDonationSum,
  getDeduplicatedDonationCount,
} from "@/lib/donation-dedup"
import type { Prisma } from "@prisma/client"

const WATER_PROJECT_STATUSES = ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"] as const

export type FundraiserRow = {
  id: string
  title: string
  slug: string
  fundraiserName: string
  email: string
  isActive: boolean
  targetAmountPence: number | null
  campaign: { title: string; type: "APPEAL" | "WATER" }
  amountRaised: number
}

export async function getFundraisers(
  where?: Prisma.FundraiserWhereInput
): Promise<FundraiserRow[]> {
  const fundraisers = await prisma.fundraiser.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      appeal: { select: { title: true } },
      waterProject: { select: { projectType: true } },
      donations: {
        where: { status: "COMPLETED" },
        select: {
          id: true,
          amountPence: true,
          orderNumber: true,
          transactionId: true,
        },
      },
      waterProjectDonations: {
        where: { status: { in: [...WATER_PROJECT_STATUSES] } },
        select: { id: true, amountPence: true },
      },
      cashDonations: {
        where: { status: "APPROVED" },
        select: { amountPence: true },
      },
    },
  })

  return fundraisers.map((fundraiser) => {
    const isWater = Boolean(fundraiser.waterProject)
    const legacyWaterSum =
      isWater && fundraiser.waterProjectDonations
        ? fundraiser.waterProjectDonations
            .filter((d) => d.id !== fundraiser.consolidatedWaterProjectDonationId)
            .reduce((sum, d) => sum + d.amountPence, 0)
        : 0
    const amountRaised =
      sumDonationsDeduplicated(fundraiser.donations) +
      legacyWaterSum +
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
      targetAmountPence: fundraiser.targetAmountPence,
      campaign: {
        title: campaignTitle,
        type: (fundraiser.appeal ? "APPEAL" : "WATER") as "APPEAL" | "WATER",
      },
      amountRaised,
    }
  })
}

export type FundraiserStats = {
  totalRaisedPence: number
  activeFundraisers: number
  totalFundraisers: number
  donationsThroughFundraisers: number
}

export async function getFundraiserStats(
  where?: Prisma.FundraiserWhereInput
): Promise<FundraiserStats> {
  try {
    const baseWhere = {
      fundraiserId: { not: null },
    } as const
    const [donationSum, waterAgg, cashAgg, activeCount, totalCount, donationCountDonation, donationCountWater, cashCount] =
      await Promise.all([
        getDeduplicatedDonationSum({
          ...baseWhere,
          status: "COMPLETED",
        }),
        prisma.waterProjectDonation.aggregate({
          where: {
            fundraiserId: { not: null },
            status: { in: [...WATER_PROJECT_STATUSES] },
          },
          _sum: { amountPence: true },
        }),
        prisma.fundraiserCashDonation.aggregate({
          where: { status: "APPROVED" },
          _sum: { amountPence: true },
        }),
        prisma.fundraiser.count({ where: { ...where, isActive: true } }),
        prisma.fundraiser.count({ where }),
        getDeduplicatedDonationCount({
          ...baseWhere,
          status: "COMPLETED",
        }),
        prisma.waterProjectDonation.count({
          where: {
            fundraiserId: { not: null },
            status: { in: [...WATER_PROJECT_STATUSES] },
          },
        }),
        prisma.fundraiserCashDonation.count({
          where: { status: "APPROVED" },
        }),
      ])

    const totalRaisedPence =
      donationSum + (waterAgg._sum.amountPence ?? 0) + (cashAgg._sum.amountPence ?? 0)
    const donationsThroughFundraisers = donationCountDonation + donationCountWater + cashCount

    return {
      totalRaisedPence,
      activeFundraisers: activeCount,
      totalFundraisers: totalCount,
      donationsThroughFundraisers,
    }
  } catch {
    return {
      totalRaisedPence: 0,
      activeFundraisers: 0,
      totalFundraisers: 0,
      donationsThroughFundraisers: 0,
    }
  }
}

export type FundraisedByCampaignRow = {
  campaignId: string
  campaignTitle: string
  campaignType: "APPEAL" | "WATER"
  amountPence: number
}

const WATER_PROJECT_TYPE_LABELS: Record<string, string> = {
  WATER_PUMP: "Water Pumps",
  WATER_WELL: "Water Wells",
  WATER_TANK: "Water Tanks",
  WUDHU_AREA: "Wudhu Areas",
}

export async function getFundraisedByCampaign(): Promise<FundraisedByCampaignRow[]> {
  const { getDeduplicatedDonationGroupBy } = await import("@/lib/donation-dedup")
  const [byAppeal, waterDonations, cashDonations] = await Promise.all([
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
    prisma.fundraiserCashDonation.findMany({
      where: { status: "APPROVED" },
      select: {
        amountPence: true,
        fundraiser: {
          select: {
            appealId: true,
            waterProjectId: true,
            waterProject: { select: { projectType: true } },
          },
        },
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

  const appealCashByAppealId = new Map<string, number>()
  const waterCashByProjectType = new Map<string, number>()
  for (const d of cashDonations) {
    const f = d.fundraiser
    if (!f) continue
    if (f.appealId) {
      appealCashByAppealId.set(f.appealId, (appealCashByAppealId.get(f.appealId) ?? 0) + d.amountPence)
    } else if (f.waterProjectId && f.waterProject?.projectType) {
      const type = f.waterProject.projectType
      waterCashByProjectType.set(type, (waterCashByProjectType.get(type) ?? 0) + d.amountPence)
    }
  }

  const rows: FundraisedByCampaignRow[] = []

  const appealIdsWithCash = [...appealCashByAppealId.keys()]
  const allAppealIds = [...new Set([...appealIds, ...appealIdsWithCash])]
  if (allAppealIds.length > appealIds.length) {
    const extra = await prisma.appeal.findMany({
      where: { id: { in: allAppealIds.filter((id) => !appealIds.includes(id)) } },
      select: { id: true, title: true },
    })
    extra.forEach((a) => appealTitleById.set(a.id, a.title))
  }
  for (const appealId of allAppealIds) {
    const onlineAmount = byAppeal.find((g) => g.appealId === appealId)?._sum?.amountPence ?? 0
    const cashAmount = appealCashByAppealId.get(appealId) ?? 0
    const amountPence = onlineAmount + cashAmount
    if (amountPence === 0) continue
    rows.push({
      campaignId: appealId,
      campaignTitle: appealTitleById.get(appealId) ?? "Unknown appeal",
      campaignType: "APPEAL",
      amountPence,
    })
  }

  const waterByTypeAndCountry = new Map<string, number>()
  for (const d of waterDonations) {
    if (!d.waterProject) continue
    const type = d.waterProject.projectType
    const country = (d as { country?: { country: string } }).country?.country ?? "Unknown"
    const key = `${type}\t${country}`
    waterByTypeAndCountry.set(key, (waterByTypeAndCountry.get(key) ?? 0) + d.amountPence)
  }
  for (const [projectType, amount] of waterCashByProjectType) {
    const key = `${projectType}\tOffline`
    waterByTypeAndCountry.set(key, (waterByTypeAndCountry.get(key) ?? 0) + amount)
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
}

export type EligibleCampaign = {
  id: string
  title: string
  type: "APPEAL" | "WATER"
  projectType?: string
}

export async function getEligibleCampaigns(): Promise<EligibleCampaign[]> {
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
}
