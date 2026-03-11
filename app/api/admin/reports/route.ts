import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getDeduplicatedDonationGroupBy, deduplicateDonationsByTransaction } from "@/lib/donation-dedup"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { formatAdminUserName } from "@/lib/utils"
import type {
  ReportsResponse,
  ReportRow,
  DonationDetailRow,
  CollectionDetailRow,
  OfflineIncomeDetailRow,
  WaterDonationDetailRow,
  SponsorshipDonationDetailRow,
  QurbaniDonationDetailRow,
} from "@/lib/reports"

const querySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  staff: z.string().optional(),
})

const parseDate = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const defaultDateRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

const mergeRows = (rows: ReportRow[]) => {
  const map = new Map<string, ReportRow>()
  rows.forEach((row) => {
    const key = row.label || "Unknown"
    const current = map.get(key)
    if (current) {
      current.amountPence = (current.amountPence || 0) + (row.amountPence || 0)
      current.count = (current.count || 0) + (row.count || 0)
    } else {
      map.set(key, { ...row, label: key })
    }
  })
  return Array.from(map.values()).sort((a, b) => (b.amountPence || 0) - (a.amountPence || 0))
}

const CANONICAL_PAYMENT_METHODS = ["WEBSITE_STRIPE", "CASH", "BANK_TRANSFER", "CARD_SUMUP"] as const
const normalisePaymentLabel = (label: string | null | undefined): string => {
  const l = (label ?? "Unknown").toUpperCase()
  if (l === "STRIPE" || l === "PAYPAL") return "WEBSITE_STRIPE"
  if (l === "CARD") return "CARD_SUMUP"
  return l || "Unknown"
}

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    const start = parseDate(query.start)
    const end = parseDate(query.end)
    const range = start && end ? { start, end } : defaultDateRange()
    const dateFilter = { gte: range.start, lte: range.end }
    const staffFilter = query.staff ? { addedByAdminUserId: query.staff } : undefined

    const [
      donationType,
      donationPayment,
      donationStatus,
      donationByAppeal,
      donationByFundraiser,
      donationChannel,
      donationGiftAid,
      waterType,
      waterPayment,
      waterStatus,
      waterByFundraiser,
      waterChannel,
      waterGiftAid,
      sponsorshipType,
      sponsorshipPayment,
      sponsorshipStatus,
      sponsorshipChannel,
      sponsorshipGiftAid,
      recurringActive,
      recurringStatus,
      recurringFrequency,
      recurringNextPayments,
      offlineIncome,
      offlineIncomeByAppeal,
      offlineIncomeByDonationType,
      offlineIncomeList,
      collections,
      collectionsByAppeal,
      masjids,
      donorsCreated,
      donorTotals,
      waterDonorTotals,
      sponsorshipDonorTotals,
      qurbaniDonorTotals,
      waterProjectTotals,
      sponsorshipProjectTotals,
      waterReportCount,
      sponsorshipReportCount,
      waterStatusRows,
      sponsorshipStatusRows,
      fundraisers,
      fundraiserCashRows,
    ] = await Promise.all([
      getDeduplicatedDonationGroupBy({ createdAt: dateFilter, status: "COMPLETED" }, "donationType"),
      getDeduplicatedDonationGroupBy({ createdAt: dateFilter, status: "COMPLETED" }, "paymentMethod"),
      getDeduplicatedDonationGroupBy({ createdAt: dateFilter }, "status"),
      getDeduplicatedDonationGroupBy({ createdAt: dateFilter, status: "COMPLETED" }, "appealId"),
      getDeduplicatedDonationGroupBy({ createdAt: dateFilter, status: "COMPLETED" }, "fundraiserId"),
      getDeduplicatedDonationGroupBy({ createdAt: dateFilter, status: "COMPLETED" }, "collectedVia"),
      getDeduplicatedDonationGroupBy({ createdAt: dateFilter, status: "COMPLETED", giftAid: true }, "donationType"),
      prisma.waterProjectDonation.groupBy({
        by: ["donationType"],
        where: {
          createdAt: dateFilter,
          status: { in: ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"] },
          ...(staffFilter || {}),
        },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.waterProjectDonation.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.waterProjectDonation.groupBy({
        by: ["status"],
        where: { createdAt: dateFilter, ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.waterProjectDonation.groupBy({
        by: ["fundraiserId"],
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.waterProjectDonation.groupBy({
        by: ["collectedVia"],
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.waterProjectDonation.groupBy({
        by: ["donationType"],
        where: { createdAt: dateFilter, status: "COMPLETE", giftAid: true, ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.sponsorshipDonation.groupBy({
        by: ["donationType"],
        where: {
          createdAt: dateFilter,
          status: { in: ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"] },
          ...(staffFilter || {}),
        },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.sponsorshipDonation.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.sponsorshipDonation.groupBy({
        by: ["status"],
        where: { createdAt: dateFilter, ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.sponsorshipDonation.groupBy({
        by: ["collectedVia"],
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.sponsorshipDonation.groupBy({
        by: ["donationType"],
        where: { createdAt: dateFilter, status: "COMPLETE", giftAid: true, ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.recurringDonation.aggregate({
        where: { createdAt: dateFilter, status: "ACTIVE" },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.recurringDonation.groupBy({
        by: ["status"],
        where: { createdAt: dateFilter },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.recurringDonation.groupBy({
        by: ["frequency"],
        where: { createdAt: dateFilter },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.recurringDonation.findMany({
        where: { nextPaymentDate: dateFilter },
        select: { nextPaymentDate: true, amountPence: true },
      }),
      prisma.offlineIncome.aggregate({
        where: { receivedAt: dateFilter, ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.offlineIncome.groupBy({
        by: ["appealId"],
        where: { receivedAt: dateFilter, ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.offlineIncome.groupBy({
        by: ["donationType"],
        where: { receivedAt: dateFilter, ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.offlineIncome.findMany({
        where: { receivedAt: dateFilter, ...(staffFilter || {}) },
        orderBy: { receivedAt: "desc" },
        include: {
          appeal: { select: { title: true } },
          donor: { select: { firstName: true, lastName: true, email: true } },
          addedBy: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.collection.findMany({
        where: { collectedAt: dateFilter, ...(staffFilter || {}) },
        orderBy: { collectedAt: "desc" },
        include: {
          masjid: { select: { name: true } },
          appeal: { select: { title: true } },
          addedBy: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.collection.groupBy({
        by: ["appealId"],
        where: { collectedAt: dateFilter, ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.masjid.findMany({
        select: { id: true, name: true },
      }),
      prisma.donor.count({
        where: { createdAt: dateFilter },
      }),
      prisma.donation.findMany({
        where: { createdAt: dateFilter, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        include: {
          donor: {
            select: {
              title: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              postcode: true,
              country: true,
            },
          },
          appeal: { select: { title: true } },
          fundraiser: { select: { fundraiserName: true, title: true } },
          product: { select: { name: true } },
        },
      }),
      prisma.waterProjectDonation.findMany({
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
        orderBy: { createdAt: "desc" },
        include: {
          donor: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              city: true,
              country: true,
            },
          },
          waterProject: { select: { projectType: true } },
          country: { select: { country: true } },
          addedBy: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.sponsorshipDonation.findMany({
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
        orderBy: { createdAt: "desc" },
        include: {
          donor: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              city: true,
              country: true,
            },
          },
          sponsorshipProject: { select: { projectType: true } },
          country: { select: { country: true } },
          addedBy: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.qurbaniDonation.findMany({
        where: { createdAt: dateFilter },
        orderBy: { createdAt: "desc" },
        include: {
          donor: { select: { firstName: true, lastName: true, email: true } },
          qurbaniCountry: { select: { country: true } },
        },
      }),
      prisma.waterProjectDonation.groupBy({
        by: ["waterProjectId"],
        where: {
          createdAt: dateFilter,
          status: { in: ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"] },
          ...(staffFilter || {}),
        },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.sponsorshipDonation.groupBy({
        by: ["sponsorshipProjectId"],
        where: {
          createdAt: dateFilter,
          status: { in: ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"] },
          ...(staffFilter || {}),
        },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.waterProjectDonation.count({
        where: { createdAt: dateFilter, reportSent: true, ...(staffFilter || {}) },
      }),
      prisma.sponsorshipDonation.count({
        where: { createdAt: dateFilter, reportSent: true, ...(staffFilter || {}) },
      }),
      prisma.waterProjectDonation.groupBy({
        by: ["status"],
        where: { createdAt: dateFilter, ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.sponsorshipDonation.groupBy({
        by: ["status"],
        where: { createdAt: dateFilter, ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.fundraiser.findMany({
        select: {
          id: true,
          fundraiserName: true,
          title: true,
          isActive: true,
          targetAmountPence: true,
        },
      }),
      // Approved fundraiser cash in date range (for appeal totals – match appeals page)
      prisma.fundraiserCashDonation.findMany({
        where: { status: "APPROVED", receivedAt: dateFilter },
        select: {
          amountPence: true,
          donationType: true,
          paymentMethod: true,
          fundraiserId: true,
          fundraiser: { select: { appealId: true } },
        },
      }),
    ])

    const donorTotalsDeduped = deduplicateDonationsByTransaction(donorTotals)

    const appealIdsFromDonations = donationByAppeal.map((row) => row.appealId).filter(Boolean) as string[]
    const fundraiserIds = [
      ...donationByFundraiser.map((row) => row.fundraiserId).filter(Boolean),
      ...waterByFundraiser.map((row) => row.fundraiserId).filter(Boolean),
      ...(fundraiserCashRows as { fundraiserId: string | null; fundraiser?: { appealId: string | null } | null }[])
        .map((r) => r.fundraiserId)
        .filter(Boolean),
    ] as string[]
    const uniqueFundraiserIds = [...new Set(fundraiserIds)]
    const waterProjectIds = waterProjectTotals.map((row) => row.waterProjectId) as string[]
    const sponsorshipProjectIds = sponsorshipProjectTotals.map((row) => row.sponsorshipProjectId) as string[]

    const [
      fundraiserLookup,
      waterProjects,
      sponsorshipProjects,
      offlineByStaff,
      collectionsByStaff,
      waterByStaff,
      sponsorshipByStaff,
      staffUsers,
    ] = await Promise.all([
        prisma.fundraiser.findMany({
          where: { id: { in: uniqueFundraiserIds } },
          select: { id: true, appealId: true, fundraiserName: true, title: true },
        }),
        prisma.waterProject.findMany({
          where: { id: { in: waterProjectIds } },
          select: { id: true, projectType: true },
        }),
        prisma.sponsorshipProject.findMany({
          where: { id: { in: sponsorshipProjectIds } },
          select: { id: true, projectType: true },
        }),
        prisma.offlineIncome.groupBy({
          by: ["addedByAdminUserId"],
          where: { receivedAt: dateFilter },
          _sum: { amountPence: true },
          _count: { _all: true },
        }),
        prisma.collection.groupBy({
          by: ["addedByAdminUserId"],
          where: { collectedAt: dateFilter },
          _sum: { amountPence: true },
          _count: { _all: true },
        }),
        prisma.waterProjectDonation.groupBy({
          by: ["addedByAdminUserId"],
          where: { createdAt: dateFilter, status: "COMPLETE" },
          _sum: { amountPence: true },
          _count: { _all: true },
        }),
        prisma.sponsorshipDonation.groupBy({
          by: ["addedByAdminUserId"],
          where: { createdAt: dateFilter, status: "COMPLETE" },
          _sum: { amountPence: true },
          _count: { _all: true },
        }),
        prisma.adminUser.findMany({
          where: { role: { in: ["ADMIN", "STAFF"] } },
          select: { id: true, email: true, firstName: true, lastName: true },
        }),
      ])

    const appealIdsFromFundraisers = fundraiserLookup
      .map((f) => f.appealId)
      .filter((id): id is string => Boolean(id))
    const appealIdsFromCash = (fundraiserCashRows as { fundraiser?: { appealId: string | null } | null }[])
      .map((r) => r.fundraiser?.appealId)
      .filter((id): id is string => Boolean(id))
    const allAppealIds = [
      ...new Set([
        ...appealIdsFromDonations,
        ...offlineIncomeByAppeal.map((r) => r.appealId).filter(Boolean),
        ...collectionsByAppeal.map((r) => r.appealId).filter(Boolean),
        ...appealIdsFromFundraisers,
        ...appealIdsFromCash,
      ]),
    ] as string[]
    const appeals = await prisma.appeal.findMany({
      where: { id: { in: allAppealIds } },
      select: { id: true, title: true },
    })
    const appealMap = new Map(appeals.map((appeal) => [appeal.id, appeal.title]))
    const fundraiserMap = new Map(
      fundraiserLookup.map((fundraiser) => [
        fundraiser.id,
        fundraiser.title || fundraiser.fundraiserName,
      ])
    )
    const masjidMap = new Map(masjids.map((masjid) => [masjid.id, masjid.name]))
    const waterProjectMap = new Map(waterProjects.map((project) => [project.id, project.projectType]))
    const sponsorshipProjectMap = new Map(
      sponsorshipProjects.map((project) => [project.id, project.projectType])
    )

    // By donation type: ALL sources (online, water, sponsorship, qurbani, offline, collections, fundraiser cash)
    const collectionByTypeRows: ReportRow[] = []
    const sadaqahPence = collections.reduce((sum, c) => sum + (c.sadaqahPence ?? 0), 0)
    const zakatPence = collections.reduce((sum, c) => sum + (c.zakatPence ?? 0), 0)
    const lillahPence = collections.reduce((sum, c) => sum + (c.lillahPence ?? 0), 0)
    const cardPence = collections.reduce((sum, c) => sum + (c.cardPence ?? 0), 0)
    const sadaqahCount = collections.filter((c) => (c.sadaqahPence ?? 0) > 0).length
    const zakatCount = collections.filter((c) => (c.zakatPence ?? 0) > 0).length
    const lillahCount = collections.filter((c) => (c.lillahPence ?? 0) > 0).length
    const cardCount = collections.filter((c) => (c.cardPence ?? 0) > 0).length
    if (sadaqahPence > 0 || sadaqahCount > 0) collectionByTypeRows.push({ label: "SADAQAH", amountPence: sadaqahPence, count: sadaqahCount })
    if (zakatPence > 0 || zakatCount > 0) collectionByTypeRows.push({ label: "ZAKAT", amountPence: zakatPence, count: zakatCount })
    if (lillahPence > 0 || lillahCount > 0) collectionByTypeRows.push({ label: "LILLAH", amountPence: lillahPence, count: lillahCount })
    if (cardPence > 0 || cardCount > 0) collectionByTypeRows.push({ label: "GENERAL", amountPence: cardPence, count: cardCount })

    const fundraiserCashByTypeMap = new Map<string, { amountPence: number; count: number }>()
    ;(fundraiserCashRows as { amountPence: number; donationType?: string }[]).forEach((row) => {
      const label = row.donationType ?? "GENERAL"
      const entry = fundraiserCashByTypeMap.get(label) ?? { amountPence: 0, count: 0 }
      entry.amountPence += row.amountPence ?? 0
      entry.count += 1
      fundraiserCashByTypeMap.set(label, entry)
    })
    const fundraiserCashByTypeRows: ReportRow[] = Array.from(fundraiserCashByTypeMap.entries()).map(([label, v]) => ({
      label,
      amountPence: v.amountPence,
      count: v.count,
    }))

    const qurbaniByTypeMap = new Map<string, { amountPence: number; count: number }>()
    qurbaniDonorTotals.forEach((row: { donationType: string; amountPence: number }) => {
      const label = row.donationType ?? "GENERAL"
      const entry = qurbaniByTypeMap.get(label) ?? { amountPence: 0, count: 0 }
      entry.amountPence += row.amountPence ?? 0
      entry.count += 1
      qurbaniByTypeMap.set(label, entry)
    })
    const qurbaniByTypeRows: ReportRow[] = Array.from(qurbaniByTypeMap.entries()).map(([label, v]) => ({
      label,
      amountPence: v.amountPence,
      count: v.count,
    }))

    const donationRows = mergeRows([
      ...(donationType as { donationType: string | null; _sum: { amountPence: number | null }; _count: { _all: number } }[]).map((row) => ({
        label: row.donationType ?? "Unknown",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...waterType.map((row) => ({
        label: row.donationType,
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...sponsorshipType.map((row) => ({
        label: row.donationType,
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...(offlineIncomeByDonationType as { donationType: string; _sum: { amountPence: number | null }; _count: { _all: number } }[]).map((row) => ({
        label: row.donationType,
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...collectionByTypeRows,
      ...fundraiserCashByTypeRows,
      ...qurbaniByTypeRows,
    ])

    // Offline income by source (source = payment method: CASH, BANK_TRANSFER, CARD_SUMUP)
    const offlineBySourceMap = new Map<string, { amountPence: number; count: number }>()
    offlineIncomeList.forEach((row: { source: string; amountPence: number }) => {
      const label = normalisePaymentLabel(row.source ?? "CASH")
      const entry = offlineBySourceMap.get(label) ?? { amountPence: 0, count: 0 }
      entry.amountPence += row.amountPence ?? 0
      entry.count += 1
      offlineBySourceMap.set(label, entry)
    })
    const offlineBySourceRows: ReportRow[] = Array.from(offlineBySourceMap.entries()).map(([label, v]) => ({
      label,
      amountPence: v.amountPence,
      count: v.count,
    }))

    // Fundraiser cash by payment method
    const fundraiserCashByPaymentMap = new Map<string, { amountPence: number; count: number }>()
    ;(fundraiserCashRows as { amountPence: number; paymentMethod?: string }[]).forEach((row) => {
      const label = normalisePaymentLabel(row.paymentMethod ?? "CASH")
      const entry = fundraiserCashByPaymentMap.get(label) ?? { amountPence: 0, count: 0 }
      entry.amountPence += row.amountPence ?? 0
      entry.count += 1
      fundraiserCashByPaymentMap.set(label, entry)
    })
    const fundraiserCashByPaymentRows: ReportRow[] = Array.from(fundraiserCashByPaymentMap.entries()).map(
      ([label, v]) => ({ label, amountPence: v.amountPence, count: v.count })
    )

    // Collections: cardPence -> Card (SumUp), rest -> Cash
    const collectionCardPence = collections.reduce((sum, c) => sum + (c.cardPence ?? 0), 0)
    const collectionCashPence = collections.reduce((sum, c) => sum + ((c.amountPence ?? 0) - (c.cardPence ?? 0)), 0)
    const collectionCardCount = collections.filter((c) => (c.cardPence ?? 0) > 0).length
    const collectionCashCount = collections.filter((c) => ((c.amountPence ?? 0) - (c.cardPence ?? 0)) > 0).length
    const collectionByPaymentRows: ReportRow[] = []
    if (collectionCardPence > 0 || collectionCardCount > 0) {
      collectionByPaymentRows.push({
        label: "CARD_SUMUP",
        amountPence: collectionCardPence,
        count: collectionCardCount,
      })
    }
    if (collectionCashPence > 0 || collectionCashCount > 0) {
      collectionByPaymentRows.push({ label: "CASH", amountPence: collectionCashPence, count: collectionCashCount })
    }

    // Qurbani by payment method
    const qurbaniByPaymentMap = new Map<string, { amountPence: number; count: number }>()
    qurbaniDonorTotals.forEach((row: { paymentMethod: string; amountPence: number }) => {
      const label = normalisePaymentLabel(row.paymentMethod)
      const entry = qurbaniByPaymentMap.get(label) ?? { amountPence: 0, count: 0 }
      entry.amountPence += row.amountPence ?? 0
      entry.count += 1
      qurbaniByPaymentMap.set(label, entry)
    })
    const qurbaniByPaymentRows: ReportRow[] = Array.from(qurbaniByPaymentMap.entries()).map(([label, v]) => ({
      label,
      amountPence: v.amountPence,
      count: v.count,
    }))

    const paymentRowsMerged = mergeRows([
      ...(donationPayment as { paymentMethod: string | null; _sum: { amountPence: number | null }; _count: { _all: number } }[]).map((row) => ({
        label: normalisePaymentLabel(row.paymentMethod),
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...waterPayment.map((row) => ({
        label: normalisePaymentLabel(row.paymentMethod),
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...sponsorshipPayment.map((row) => ({
        label: normalisePaymentLabel(row.paymentMethod),
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...offlineBySourceRows.map((row) => ({ ...row, label: normalisePaymentLabel(row.label) })),
      ...fundraiserCashByPaymentRows,
      ...collectionByPaymentRows,
      ...qurbaniByPaymentRows.map((row) => ({ ...row, label: normalisePaymentLabel(row.label) })),
    ])
    const paymentByLabel = new Map(paymentRowsMerged.map((r) => [r.label, r]))
    const paymentRows = CANONICAL_PAYMENT_METHODS.map((method) => ({
      label: method,
      amountPence: paymentByLabel.get(method)?.amountPence ?? 0,
      count: paymentByLabel.get(method)?.count ?? 0,
    }))

    const statusRows = mergeRows([
      ...donationStatus.map((row) => ({
        label: row.status || "UNKNOWN",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...waterStatus.map((row) => ({
        label: row.status || "UNKNOWN",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...sponsorshipStatus.map((row) => ({
        label: row.status || "UNKNOWN",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
    ])

    const channelRows = mergeRows([
      ...donationChannel.map((row) => ({
        label: row.collectedVia || "UNSPECIFIED",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...waterChannel.map((row) => ({
        label: row.collectedVia || "UNSPECIFIED",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...sponsorshipChannel.map((row) => ({
        label: row.collectedVia || "UNSPECIFIED",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
    ])

    const giftAidRows = mergeRows([
      ...donationGiftAid.map((row) => ({
        label: row.donationType ?? "Unknown",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...waterGiftAid.map((row) => ({
        label: row.donationType,
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...sponsorshipGiftAid.map((row) => ({
        label: row.donationType,
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
    ])

    const appealRows = donationByAppeal.map((row) => ({
      label: row.appealId ? appealMap.get(row.appealId) || "Unknown appeal" : "Unassigned",
      amountPence: row._sum.amountPence || 0,
      count: row._count._all,
    }))

    const fundraiserNameMap = new Map(fundraiserLookup.map((f) => [f.id, f.fundraiserName]))
    const fundraiserTotalsById = new Map<
      string,
      { label: string; name: string; amountPence: number; count: number }
    >()
    const addFundraiserTotals = (
      rows: Array<{ fundraiserId?: string | null; _sum: { amountPence?: number | null }; _count: { _all: number } }>
    ) => {
      rows.forEach((row) => {
        const id = row.fundraiserId || "unassigned"
        const label = row.fundraiserId ? fundraiserMap.get(row.fundraiserId) || "Unknown fundraiser" : "Unassigned"
        const name =
          row.fundraiserId ? fundraiserNameMap.get(row.fundraiserId) ?? "Unknown" : "—"
        const existing = fundraiserTotalsById.get(id) || { label, name, amountPence: 0, count: 0 }
        existing.amountPence += row._sum.amountPence ?? 0
        existing.count += row._count._all
        fundraiserTotalsById.set(id, existing)
      })
    }
    addFundraiserTotals(donationByFundraiser)
    addFundraiserTotals(waterByFundraiser)
    ;(fundraiserCashRows as { fundraiserId: string | null; amountPence: number }[]).forEach((row) => {
      const id = row.fundraiserId || "unassigned"
      const label = id !== "unassigned" ? fundraiserMap.get(id) || "Unknown fundraiser" : "Unassigned"
      const name = id !== "unassigned" ? fundraiserNameMap.get(id) ?? "Unknown" : "—"
      const existing = fundraiserTotalsById.get(id) || { label, name, amountPence: 0, count: 0 }
      existing.amountPence += row.amountPence ?? 0
      existing.count += 1
      fundraiserTotalsById.set(id, existing)
    })
    const fundraiserRows = Array.from(fundraiserTotalsById.values())

    const qurbaniTotalPence = qurbaniDonorTotals.reduce((sum, row) => sum + row.amountPence, 0)
    const fundraiserCashTotalPence = (fundraiserCashRows as { amountPence: number }[]).reduce(
      (sum, row) => sum + (row.amountPence ?? 0),
      0
    )
    const fundraiserCashCount = fundraiserCashRows.length
    const sourceRows = [
      {
        label: "Online donations",
        amountPence: donationType.reduce((sum, row) => sum + (row._sum.amountPence || 0), 0),
        count: donationType.reduce((sum, row) => sum + row._count._all, 0),
      },
      { label: "Water projects", amountPence: waterType.reduce((sum, row) => sum + (row._sum.amountPence || 0), 0), count: waterType.reduce((sum, row) => sum + row._count._all, 0) },
      { label: "Sponsorships", amountPence: sponsorshipType.reduce((sum, row) => sum + (row._sum.amountPence || 0), 0), count: sponsorshipType.reduce((sum, row) => sum + row._count._all, 0) },
      { label: "Qurbani", amountPence: qurbaniTotalPence, count: qurbaniDonorTotals.length },
      { label: "Offline income", amountPence: offlineIncome._sum.amountPence || 0, count: offlineIncome._count._all },
      { label: "Collections", amountPence: collections.reduce((sum, row) => sum + row.amountPence, 0), count: collections.length },
      { label: "Fundraiser cash", amountPence: fundraiserCashTotalPence, count: fundraiserCashCount },
      { label: "Recurring (active)", amountPence: recurringActive._sum.amountPence || 0, count: recurringActive._count._all },
    ]

    const totalIncomePence = sourceRows.reduce((sum, row) => sum + (row.amountPence || 0), 0)
    const totalIncomeCount = sourceRows.reduce((sum, row) => sum + (row.count || 0), 0)
    const giftAidPence = giftAidRows.reduce((sum, row) => sum + (row.amountPence || 0), 0)

    const donationCount = donorTotalsDeduped.length + waterDonorTotals.length + sponsorshipDonorTotals.length + qurbaniDonorTotals.length
    const giftAidCount =
      donorTotalsDeduped.filter((row) => row.giftAid).length +
      waterDonorTotals.filter((row) => row.giftAid).length +
      sponsorshipDonorTotals.filter((row) => row.giftAid).length +
      qurbaniDonorTotals.filter((row) => row.giftAid).length

    const donorAmountMap = new Map<string, { amountPence: number; count: number }>()
    const addToDonorTotals = (rows: Array<{ donorId: string; amountPence: number }>) => {
      rows.forEach((row) => {
        const entry = donorAmountMap.get(row.donorId) || { amountPence: 0, count: 0 }
        entry.amountPence += row.amountPence
        entry.count += 1
        donorAmountMap.set(row.donorId, entry)
      })
    }
    addToDonorTotals(donorTotalsDeduped)
    addToDonorTotals(waterDonorTotals)
    addToDonorTotals(sponsorshipDonorTotals)
    addToDonorTotals(qurbaniDonorTotals)

    const donorIds = Array.from(donorAmountMap.keys())
    const donors = await prisma.donor.findMany({
      where: { id: { in: donorIds } },
      select: { id: true, firstName: true, lastName: true, email: true, title: true },
    })
    const donorMap = new Map(donors.map((donor) => [donor.id, donor]))
    const topDonors = Array.from(donorAmountMap.entries())
      .map(([donorId, totals]) => {
        const donor = donorMap.get(donorId)
        const name = donor ? [donor.title, donor.firstName, donor.lastName].filter(Boolean).join(" ") : "Unknown donor"
        return {
          donorId,
          name,
          email: donor?.email || "-",
          amountPence: totals.amountPence,
          donationCount: totals.count,
        }
      })
      .sort((a, b) => b.amountPence - a.amountPence)
      .slice(0, 10)

    const collectionsByType = mergeRows(
      collections.map((row) => ({
        label: row.type,
        amountPence: row.amountPence,
        count: 1,
      }))
    )

    const collectionsByMasjid = mergeRows(
      collections.map((row) => ({
        label: row.masjidId ? masjidMap.get(row.masjidId) || "Unknown masjid" : "Unassigned",
        amountPence: row.amountPence,
        count: 1,
      }))
    )

    const fundraisingRows = fundraiserRows

    const totalRaisedPence = fundraisingRows.reduce((sum, row) => sum + (row.amountPence || 0), 0)

    const fundraisingTargets = fundraisers.map((fundraiser) => {
      const totals = fundraiserTotalsById.get(fundraiser.id)
      const amountPence = totals?.amountPence || 0
      const targetPence = fundraiser.targetAmountPence ?? null
      const percent =
        targetPence && targetPence > 0 ? Math.round((amountPence / targetPence) * 100) : null
      return {
        fundraiserId: fundraiser.id,
        label: fundraiser.title || fundraiser.fundraiserName,
        amountPence,
        targetPence,
        percent,
      }
    })

    const waterProjectRows = mergeRows(
      waterProjectTotals.map((row) => ({
        label: row.waterProjectId ? waterProjectMap.get(row.waterProjectId) || "Unknown project" : "Unassigned",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      }))
    )

    const sponsorshipProjectRows = mergeRows(
      sponsorshipProjectTotals.map((row) => ({
        label: row.sponsorshipProjectId
          ? sponsorshipProjectMap.get(row.sponsorshipProjectId) || "Unknown project"
          : "Unassigned",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      }))
    )

    const waterStatusReport = mergeRows(
      waterStatusRows.map((row) => ({
        label: row.status || "UNKNOWN",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      }))
    )

    const sponsorshipStatusReport = mergeRows(
      sponsorshipStatusRows.map((row) => ({
        label: row.status || "UNKNOWN",
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      }))
    )

    const statusToRows = (
      rows: Array<{ status?: string | null; _sum: { amountPence?: number | null }; _count: { _all: number } }>,
      target: string
    ) =>
      rows
        .filter((row) => row.status === target)
        .map((row) => ({
          label: target,
          amountPence: row._sum.amountPence ?? 0,
          count: row._count._all,
        }))

    const refundRows = mergeRows([
      ...statusToRows(donationStatus, "REFUNDED"),
      ...statusToRows(waterStatusRows, "REFUNDED"),
      ...statusToRows(sponsorshipStatusRows, "REFUNDED"),
    ])

    const failedRows = mergeRows([
      ...statusToRows(donationStatus, "FAILED"),
      ...statusToRows(waterStatusRows, "FAILED"),
      ...statusToRows(sponsorshipStatusRows, "FAILED"),
    ])

    const staffMap = new Map(
      staffUsers.map((u) => [u.id, formatAdminUserName(u) || u.email])
    )
    const byStaffMap = new Map<
      string,
      {
        offlineIncomePence: number
        offlineIncomeCount: number
        collectionsPence: number
        collectionsCount: number
        waterDonationsPence: number
        waterDonationsCount: number
        sponsorshipDonationsPence: number
        sponsorshipDonationsCount: number
      }
    >()
    const addStaffRow = (
      rows: Array<{ addedByAdminUserId: string | null; _sum: { amountPence: number | null }; _count: { _all: number } }>,
      key: "offlineIncome" | "collections" | "water" | "sponsorship"
    ) => {
      rows.forEach((row) => {
        const id = row.addedByAdminUserId || "unassigned"
        const entry = byStaffMap.get(id) || {
          offlineIncomePence: 0,
          offlineIncomeCount: 0,
          collectionsPence: 0,
          collectionsCount: 0,
          waterDonationsPence: 0,
          waterDonationsCount: 0,
          sponsorshipDonationsPence: 0,
          sponsorshipDonationsCount: 0,
        }
        const pence = row._sum.amountPence || 0
        const count = row._count._all
        if (key === "offlineIncome") {
          entry.offlineIncomePence += pence
          entry.offlineIncomeCount += count
        } else if (key === "collections") {
          entry.collectionsPence += pence
          entry.collectionsCount += count
        } else if (key === "water") {
          entry.waterDonationsPence += pence
          entry.waterDonationsCount += count
        } else {
          entry.sponsorshipDonationsPence += pence
          entry.sponsorshipDonationsCount += count
        }
        byStaffMap.set(id, entry)
      })
    }
    addStaffRow(offlineByStaff, "offlineIncome")
    addStaffRow(collectionsByStaff, "collections")
    addStaffRow(waterByStaff, "water")
    addStaffRow(sponsorshipByStaff, "sponsorship")
    const byStaffRows = Array.from(byStaffMap.entries())
      .filter(([id]) => id !== "unassigned")
      .map(([staffId, entry]) => ({
        staffId,
        label: staffMap.get(staffId) || "Unknown",
        ...entry,
        totalPence:
          entry.offlineIncomePence +
          entry.collectionsPence +
          entry.waterDonationsPence +
          entry.sponsorshipDonationsPence,
        totalCount:
          entry.offlineIncomeCount +
          entry.collectionsCount +
          entry.waterDonationsCount +
          entry.sponsorshipDonationsCount,
      }))
      .sort((a, b) => b.totalPence - a.totalPence)

    const byGeo = (
      rows: Array<{ amountPence: number; donor?: { city: string | null; country: string | null } }>
    ) => {
      const countryMap = new Map<string, ReportRow>()
      const cityMap = new Map<string, ReportRow>()
      rows.forEach((row) => {
        const country = row.donor?.country || "Unknown"
        const city = row.donor?.city || "Unknown"
        const countryEntry = countryMap.get(country) || { label: country, amountPence: 0, count: 0 }
        countryEntry.amountPence = (countryEntry.amountPence || 0) + row.amountPence
        countryEntry.count = (countryEntry.count || 0) + 1
        countryMap.set(country, countryEntry)

        const cityEntry = cityMap.get(city) || { label: city, amountPence: 0, count: 0 }
        cityEntry.amountPence = (cityEntry.amountPence || 0) + row.amountPence
        cityEntry.count = (cityEntry.count || 0) + 1
        cityMap.set(city, cityEntry)
      })
      return {
        countries: Array.from(countryMap.values()).sort((a, b) => (b.amountPence || 0) - (a.amountPence || 0)),
        cities: Array.from(cityMap.values()).sort((a, b) => (b.amountPence || 0) - (a.amountPence || 0)),
      }
    }

    const donationGeo = byGeo(donorTotalsDeduped)
    const waterGeo = byGeo(waterDonorTotals)
    const sponsorshipGeo = byGeo(sponsorshipDonorTotals)

    const donationByCountry = mergeRows([...donationGeo.countries, ...waterGeo.countries, ...sponsorshipGeo.countries])
    const donationByCity = mergeRows([...donationGeo.cities, ...waterGeo.cities, ...sponsorshipGeo.cities])

    const donorCountry = mergeRows([...donationGeo.countries, ...waterGeo.countries, ...sponsorshipGeo.countries])
    const donorCity = mergeRows([...donationGeo.cities, ...waterGeo.cities, ...sponsorshipGeo.cities])

    const recurringByStatus = mergeRows(
      recurringStatus.map((row) => ({
        label: row.status,
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      }))
    )

    const recurringByFrequency = mergeRows(
      recurringFrequency.map((row) => ({
        label: row.frequency,
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      }))
    )

    const recurringNextPaymentRows = mergeRows(
      recurringNextPayments.map((row) => ({
        label: row.nextPaymentDate
          ? `${row.nextPaymentDate.getFullYear()}-${String(row.nextPaymentDate.getMonth() + 1).padStart(2, "0")}`
          : "Unknown",
        amountPence: row.amountPence,
        count: 1,
      }))
    )

    const fundraiserIdToAppealId = new Map(
      fundraiserLookup
        .filter((f) => f.appealId)
        .map((f) => [f.id, f.appealId as string])
    )
    const fundraiserDonationByAppeal = new Map<string, number>()
    donationByFundraiser.forEach((row) => {
      const appealId = row.fundraiserId ? fundraiserIdToAppealId.get(row.fundraiserId) : null
      if (!appealId) return
      fundraiserDonationByAppeal.set(
        appealId,
        (fundraiserDonationByAppeal.get(appealId) ?? 0) + (row._sum.amountPence ?? 0)
      )
    })
    waterByFundraiser.forEach((row) => {
      const appealId = row.fundraiserId ? fundraiserIdToAppealId.get(row.fundraiserId) : null
      if (!appealId) return
      fundraiserDonationByAppeal.set(
        appealId,
        (fundraiserDonationByAppeal.get(appealId) ?? 0) + (row._sum.amountPence ?? 0)
      )
    })
    const fundraiserCashByAppeal = new Map<string, number>()
    ;(fundraiserCashRows as { amountPence: number; fundraiser?: { appealId: string | null } | null }[]).forEach(
      (row) => {
        const appealId = row.fundraiser?.appealId
        if (!appealId) return
        fundraiserCashByAppeal.set(
          appealId,
          (fundraiserCashByAppeal.get(appealId) ?? 0) + (row.amountPence ?? 0)
        )
      }
    )

    const appealIncomeMap = new Map<
      string,
      { appealId: string | null; label: string; donationAmountPence: number; donationCount: number; offlineAmountPence: number; collectionAmountPence: number; fundraiserAmountPence: number }
    >()
    donationByAppeal.forEach((row) => {
      const appealId = row.appealId ?? null
      const key = appealId || "unassigned"
      const label = appealId ? appealMap.get(appealId) || "Unknown appeal" : "Unassigned"
      appealIncomeMap.set(key, {
        appealId,
        label,
        donationAmountPence: row._sum.amountPence || 0,
        donationCount: row._count._all,
        offlineAmountPence: 0,
        collectionAmountPence: 0,
        fundraiserAmountPence: 0,
      })
    })
    offlineIncomeByAppeal.forEach((row) => {
      const key = row.appealId || "unassigned"
      const label = row.appealId ? appealMap.get(row.appealId) || "Unknown appeal" : "Unassigned"
      const entry =
        appealIncomeMap.get(key) || {
          appealId: row.appealId,
          label,
          donationAmountPence: 0,
          donationCount: 0,
          offlineAmountPence: 0,
          collectionAmountPence: 0,
          fundraiserAmountPence: 0,
        }
      entry.offlineAmountPence += row._sum.amountPence || 0
      appealIncomeMap.set(key, entry)
    })
    collectionsByAppeal.forEach((row) => {
      const key = row.appealId || "unassigned"
      const label = row.appealId ? appealMap.get(row.appealId) || "Unknown appeal" : "Unassigned"
      const entry =
        appealIncomeMap.get(key) || {
          appealId: row.appealId,
          label,
          donationAmountPence: 0,
          donationCount: 0,
          offlineAmountPence: 0,
          collectionAmountPence: 0,
          fundraiserAmountPence: 0,
        }
      entry.collectionAmountPence += row._sum.amountPence || 0
      appealIncomeMap.set(key, entry)
    })
    allAppealIds.forEach((appealId) => {
      const key = appealId
      const donationPence = fundraiserDonationByAppeal.get(appealId) ?? 0
      const cashPence = fundraiserCashByAppeal.get(appealId) ?? 0
      const fundraiserAmountPence = donationPence + cashPence
      if (fundraiserAmountPence === 0) return
      const entry = appealIncomeMap.get(key)
      if (entry) {
        entry.fundraiserAmountPence = fundraiserAmountPence
      } else {
        const label = appealMap.get(appealId) || "Unknown appeal"
        appealIncomeMap.set(key, {
          appealId,
          label,
          donationAmountPence: 0,
          donationCount: 0,
          offlineAmountPence: 0,
          collectionAmountPence: 0,
          fundraiserAmountPence,
        })
      }
    })
    const appealsReportRows = Array.from(appealIncomeMap.values()).map((row) => ({
      ...row,
      totalPence:
        row.donationAmountPence +
        row.offlineAmountPence +
        row.collectionAmountPence +
        row.fundraiserAmountPence,
    }))

    const donationsDetail: DonationDetailRow[] = donorTotals.map((d) => {
      const donorName = d.donor
        ? [d.donor.title, d.donor.firstName, d.donor.lastName].filter(Boolean).join(" ")
        : "Unknown"
      return {
        id: d.id,
        createdAt: d.createdAt.toISOString(),
        completedAt: d.completedAt?.toISOString() ?? null,
        amountPence: d.amountPence,
        donationType: d.donationType,
        paymentMethod: d.paymentMethod,
        status: d.status,
        frequency: d.frequency,
        giftAid: d.giftAid,
        giftAidClaimed: d.giftAidClaimed ?? false,
        giftAidClaimedAt: d.giftAidClaimedAt?.toISOString() ?? null,
        isAnonymous: d.isAnonymous ?? false,
        orderNumber: d.orderNumber ?? null,
        transactionId: d.transactionId ?? null,
        collectedVia: d.collectedVia ?? null,
        donorName,
        donorEmail: d.donor?.email ?? "",
        donorTitle: d.donor?.title ?? null,
        donorFirstName: d.donor?.firstName ?? "",
        donorLastName: d.donor?.lastName ?? "",
        donorPhone: d.donor?.phone ?? null,
        donorAddress: d.donor?.address ?? null,
        donorCity: d.donor?.city ?? null,
        donorPostcode: d.donor?.postcode ?? null,
        donorCountry: d.donor?.country ?? null,
        billingAddress: d.billingAddress ?? null,
        billingCity: d.billingCity ?? null,
        billingPostcode: d.billingPostcode ?? null,
        billingCountry: d.billingCountry ?? null,
        appealTitle: d.appeal?.title ?? null,
        fundraiserName: d.fundraiser ? (d.fundraiser.title || d.fundraiser.fundraiserName) : null,
        productName: d.product?.name ?? null,
      }
    })

    const collectionsDetail: CollectionDetailRow[] = collections.map((c) => ({
      id: c.id,
      collectedAt: c.collectedAt.toISOString(),
      amountPence: c.amountPence,
      type: c.type,
      donationType: c.donationType,
      sadaqahPence: c.sadaqahPence,
      zakatPence: c.zakatPence,
      lillahPence: c.lillahPence,
      cardPence: c.cardPence,
      masjidName: c.masjid?.name ?? null,
      otherLocationName: c.otherLocationName ?? null,
      appealTitle: c.appeal?.title ?? null,
      notes: c.notes ?? null,
      addedByName: c.addedBy ? formatAdminUserName(c.addedBy) : null,
    }))

    const offlineIncomeDetail: OfflineIncomeDetailRow[] = offlineIncomeList.map((o) => ({
      id: o.id,
      receivedAt: o.receivedAt.toISOString(),
      amountPence: o.amountPence,
      donationType: o.donationType,
      source: o.source,
      collectedVia: o.collectedVia ?? null,
      giftAid: o.giftAid,
      notes: o.notes ?? null,
      appealTitle: o.appeal?.title ?? null,
      donorName: o.donor
        ? [o.donor.firstName, o.donor.lastName].filter(Boolean).join(" ")
        : null,
      donorEmail: o.donor?.email ?? null,
      addedByName: o.addedBy ? formatAdminUserName(o.addedBy) : null,
    }))

    const waterDonationsDetail: WaterDonationDetailRow[] = waterDonorTotals.map((w) => ({
      id: w.id,
      createdAt: w.createdAt.toISOString(),
      amountPence: w.amountPence,
      donationType: w.donationType,
      paymentMethod: w.paymentMethod,
      status: w.status,
      giftAid: w.giftAid,
      projectType: w.waterProject?.projectType ?? "",
      country: w.country?.country ?? "",
      donorName: w.donor
        ? [w.donor.firstName, w.donor.lastName].filter(Boolean).join(" ")
        : "Unknown",
      donorEmail: w.donor?.email ?? "",
      addedByName: w.addedBy ? formatAdminUserName(w.addedBy) : null,
    }))

    const sponsorshipDonationsDetail: SponsorshipDonationDetailRow[] = sponsorshipDonorTotals.map(
      (s) => ({
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        amountPence: s.amountPence,
        donationType: s.donationType,
        paymentMethod: s.paymentMethod,
        status: s.status,
        giftAid: s.giftAid,
        projectType: s.sponsorshipProject?.projectType ?? "",
        country: s.country?.country ?? "",
        donorName: s.donor
          ? [s.donor.firstName, s.donor.lastName].filter(Boolean).join(" ")
          : "Unknown",
        donorEmail: s.donor?.email ?? "",
        addedByName: s.addedBy ? formatAdminUserName(s.addedBy) : null,
      })
    )

    const qurbaniDonationsDetail: QurbaniDonationDetailRow[] = qurbaniDonorTotals.map((q) => ({
      id: q.id,
      createdAt: q.createdAt.toISOString(),
      amountPence: q.amountPence,
      donationType: q.donationType,
      paymentMethod: q.paymentMethod,
      giftAid: q.giftAid,
      country: q.qurbaniCountry?.country ?? "",
      size: q.size,
      qurbaniNames: q.qurbaniNames ?? null,
      donorName: q.donor
        ? [q.donor.firstName, q.donor.lastName].filter(Boolean).join(" ")
        : "Unknown",
      donorEmail: q.donor?.email ?? "",
    }))

    const qurbaniByCountryMap = new Map<string, { amountPence: number; count: number }>()
    const qurbaniBySizeMap = new Map<string, { amountPence: number; count: number }>()
    qurbaniDonorTotals.forEach((q) => {
      const country = q.qurbaniCountry?.country ?? "Unknown"
      const c = qurbaniByCountryMap.get(country) || { amountPence: 0, count: 0 }
      c.amountPence += q.amountPence
      c.count += 1
      qurbaniByCountryMap.set(country, c)
      const sizeLabel = q.size === "ONE_SEVENTH" ? "1/7th" : q.size === "SMALL" ? "Small" : q.size === "LARGE" ? "Large" : q.size
      const s = qurbaniBySizeMap.get(sizeLabel) || { amountPence: 0, count: 0 }
      s.amountPence += q.amountPence
      s.count += 1
      qurbaniBySizeMap.set(sizeLabel, s)
    })
    const qurbaniByCountry = Array.from(qurbaniByCountryMap.entries())
      .map(([label, v]) => ({ label, amountPence: v.amountPence, count: v.count }))
      .sort((a, b) => (b.amountPence ?? 0) - (a.amountPence ?? 0))
    const qurbaniBySize = Array.from(qurbaniBySizeMap.entries())
      .map(([label, v]) => ({ label, amountPence: v.amountPence, count: v.count }))
      .sort((a, b) => (b.amountPence ?? 0) - (a.amountPence ?? 0))

    // Lillah by appeal (online donations + offline + collections + fundraiser cash)
    const lillahByAppealMap = new Map<string, number>()
    const addLillah = (appealId: string | null, pence: number) => {
      const key = appealId ?? "unassigned"
      lillahByAppealMap.set(key, (lillahByAppealMap.get(key) ?? 0) + pence)
    }
    const lillahDonations = donorTotals.filter(
      (d: { donationType: string }) => (d.donationType ?? "").toUpperCase() === "LILLAH"
    )
    const lillahDonationsDeduped = deduplicateDonationsByTransaction(lillahDonations)
    lillahDonationsDeduped.forEach((d: { appealId: string | null; amountPence: number }) =>
      addLillah(d.appealId, d.amountPence ?? 0)
    )
    offlineIncomeList.forEach((o: { appealId: string | null; donationType: string; amountPence: number }) => {
      if ((o.donationType ?? "").toUpperCase() === "LILLAH") addLillah(o.appealId, o.amountPence ?? 0)
    })
    collections.forEach((c: { appealId: string | null; lillahPence: number }) => {
      const pence = c.lillahPence ?? 0
      if (pence > 0) addLillah(c.appealId, pence)
    })
    ;(fundraiserCashRows as { donationType?: string; amountPence: number; fundraiser?: { appealId: string | null } | null }[]).forEach(
      (r) => {
        if ((r.donationType ?? "").toUpperCase() === "LILLAH")
          addLillah(r.fundraiser?.appealId ?? null, r.amountPence ?? 0)
      }
    )
    const lillahByAppeal: { appealId: string | null; label: string; amountPence: number }[] = Array.from(
      lillahByAppealMap.entries()
    )
      .map(([key, amountPence]) => ({
        appealId: key === "unassigned" ? null : key,
        label: key === "unassigned" ? "Unassigned" : appealMap.get(key) ?? "Unknown appeal",
        amountPence,
      }))
      .sort((a, b) => b.amountPence - a.amountPence)

    const response: ReportsResponse = {
      range: { start: range.start.toISOString(), end: range.end.toISOString() },
      financial: {
        totalIncomePence,
        totalCount: totalIncomeCount,
        giftAidPence,
        sources: sourceRows,
      },
      donations: {
        byType: donationRows,
        byPaymentMethod: paymentRows,
        byAppeal: appealRows,
        byFundraiser: fundraiserRows,
        byStatus: statusRows,
        byChannel: channelRows,
        byCountry: donationByCountry,
        byCity: donationByCity,
        giftAid: giftAidRows,
        lillahByAppeal,
      },
      donors: {
        summary: {
          totalDonors: donorIds.length,
          newDonors: donorsCreated,
          returningDonors: Math.max(donorIds.length - donorsCreated, 0),
          giftAidRate: donationCount === 0 ? 0 : Math.round((giftAidCount / donationCount) * 100),
          totalDonations: donationCount,
        },
        topDonors,
        byCountry: donorCountry,
        byCity: donorCity,
      },
      collections: {
        totalCollectedPence: collections.reduce((sum, row) => sum + row.amountPence, 0),
        collectionCount: collections.length,
        byType: collectionsByType,
        byMasjid: collectionsByMasjid,
        byAppeal: mergeRows(
          collectionsByAppeal.map((row) => ({
            label: row.appealId ? appealMap.get(row.appealId) || "Unknown appeal" : "Unassigned",
            amountPence: row._sum.amountPence || 0,
            count: row._count._all,
          }))
        ),
      },
      fundraising: {
        totalRaisedPence,
        activeFundraisers: fundraisers.filter((fundraiser) => fundraiser.isActive).length,
        fundraiserCount: fundraisers.length,
        byFundraiser: fundraisingRows,
        byFundraiserTarget: fundraisingTargets,
      },
      projects: {
        water: {
          totalPence: waterProjectTotals.reduce((sum, row) => sum + (row._sum.amountPence || 0), 0),
          donationCount: waterProjectTotals.reduce((sum, row) => sum + row._count._all, 0),
          completedReports: waterReportCount,
          byProjectType: waterProjectRows,
          byStatus: waterStatusReport,
        },
        sponsorship: {
          totalPence: sponsorshipProjectTotals.reduce((sum, row) => sum + (row._sum.amountPence || 0), 0),
          donationCount: sponsorshipProjectTotals.reduce((sum, row) => sum + row._count._all, 0),
          completedReports: sponsorshipReportCount,
          byProjectType: sponsorshipProjectRows,
          byStatus: sponsorshipStatusReport,
        },
        qurbani: {
          totalPence: qurbaniTotalPence,
          donationCount: qurbaniDonorTotals.length,
          byCountry: qurbaniByCountry,
          bySize: qurbaniBySize,
        },
      },
      recurring: {
        activeTotalPence: recurringActive._sum.amountPence || 0,
        activeCount: recurringActive._count._all,
        byStatus: recurringByStatus,
        byFrequency: recurringByFrequency,
        nextPaymentMonth: recurringNextPaymentRows,
      },
      appeals: {
        byAppeal: appealsReportRows,
      },
      operations: {
        refunds: refundRows,
        failed: failedRows,
      },
      staff: {
        byStaff: byStaffRows,
      },
      donationsDetail,
      collectionsDetail,
      offlineIncomeDetail,
      waterDonationsDetail,
      sponsorshipDonationsDetail,
      qurbaniDonationsDetail,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Reports API error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to build reports"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
