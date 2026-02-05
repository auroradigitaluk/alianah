import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { formatAdminUserName } from "@/lib/utils"
import type { ReportsResponse, ReportRow } from "@/lib/reports"

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
      collections,
      collectionsByAppeal,
      masjids,
      donorsCreated,
      donorTotals,
      waterDonorTotals,
      sponsorshipDonorTotals,
      waterProjectTotals,
      sponsorshipProjectTotals,
      waterReportCount,
      sponsorshipReportCount,
      waterStatusRows,
      sponsorshipStatusRows,
      fundraisers,
    ] = await Promise.all([
      prisma.donation.groupBy({
        by: ["donationType"],
        where: { createdAt: dateFilter, status: "COMPLETED" },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.donation.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: dateFilter, status: "COMPLETED" },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.donation.groupBy({
        by: ["status"],
        where: { createdAt: dateFilter },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.donation.groupBy({
        by: ["appealId"],
        where: { createdAt: dateFilter, status: "COMPLETED" },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.donation.groupBy({
        by: ["fundraiserId"],
        where: { createdAt: dateFilter, status: "COMPLETED" },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.donation.groupBy({
        by: ["collectedVia"],
        where: { createdAt: dateFilter, status: "COMPLETED" },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.donation.groupBy({
        by: ["donationType"],
        where: { createdAt: dateFilter, status: "COMPLETED", giftAid: true },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.waterProjectDonation.groupBy({
        by: ["donationType"],
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
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
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
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
      prisma.collection.findMany({
        where: { collectedAt: dateFilter, ...(staffFilter || {}) },
        select: {
          amountPence: true,
          type: true,
          masjidId: true,
          appealId: true,
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
        select: {
          donorId: true,
          amountPence: true,
          giftAid: true,
          donor: { select: { city: true, country: true } },
        },
      }),
      prisma.waterProjectDonation.findMany({
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
        select: {
          donorId: true,
          amountPence: true,
          giftAid: true,
          donor: { select: { city: true, country: true } },
        },
      }),
      prisma.sponsorshipDonation.findMany({
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
        select: {
          donorId: true,
          amountPence: true,
          giftAid: true,
          donor: { select: { city: true, country: true } },
        },
      }),
      prisma.waterProjectDonation.groupBy({
        by: ["waterProjectId"],
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.sponsorshipDonation.groupBy({
        by: ["sponsorshipProjectId"],
        where: { createdAt: dateFilter, status: "COMPLETE", ...(staffFilter || {}) },
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
    ])

    const appealIds = donationByAppeal.map((row) => row.appealId).filter(Boolean) as string[]
    const fundraiserIds = [
      ...donationByFundraiser.map((row) => row.fundraiserId).filter(Boolean),
      ...waterByFundraiser.map((row) => row.fundraiserId).filter(Boolean),
    ] as string[]
    const waterProjectIds = waterProjectTotals.map((row) => row.waterProjectId) as string[]
    const sponsorshipProjectIds = sponsorshipProjectTotals.map((row) => row.sponsorshipProjectId) as string[]

    const [
      appeals,
      fundraiserLookup,
      waterProjects,
      sponsorshipProjects,
      offlineByStaff,
      collectionsByStaff,
      waterByStaff,
      sponsorshipByStaff,
      staffUsers,
    ] = await Promise.all([
        prisma.appeal.findMany({
          where: { id: { in: appealIds } },
          select: { id: true, title: true },
        }),
        prisma.fundraiser.findMany({
          where: { id: { in: fundraiserIds } },
          select: { id: true, fundraiserName: true, title: true },
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

    const donationRows = mergeRows([
      ...donationType.map((row) => ({
        label: row.donationType,
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
    ])

    const paymentRows = mergeRows([
      ...donationPayment.map((row) => ({
        label: row.paymentMethod,
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...waterPayment.map((row) => ({
        label: row.paymentMethod,
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
      ...sponsorshipPayment.map((row) => ({
        label: row.paymentMethod,
        amountPence: row._sum.amountPence || 0,
        count: row._count._all,
      })),
    ])

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
        label: row.donationType,
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

    const fundraiserTotalsById = new Map<string, { label: string; amountPence: number; count: number }>()
    const addFundraiserTotals = (rows: typeof donationByFundraiser) => {
      rows.forEach((row) => {
        const id = row.fundraiserId || "unassigned"
        const label = row.fundraiserId ? fundraiserMap.get(row.fundraiserId) || "Unknown fundraiser" : "Unassigned"
        const existing = fundraiserTotalsById.get(id) || { label, amountPence: 0, count: 0 }
        existing.amountPence += row._sum.amountPence || 0
        existing.count += row._count._all
        fundraiserTotalsById.set(id, existing)
      })
    }
    addFundraiserTotals(donationByFundraiser)
    addFundraiserTotals(waterByFundraiser)
    const fundraiserRows = Array.from(fundraiserTotalsById.values())

    const sourceRows = [
      {
        label: "Online donations",
        amountPence: donationType.reduce((sum, row) => sum + (row._sum.amountPence || 0), 0),
        count: donationType.reduce((sum, row) => sum + row._count._all, 0),
      },
      { label: "Water projects", amountPence: waterType.reduce((sum, row) => sum + (row._sum.amountPence || 0), 0), count: waterType.reduce((sum, row) => sum + row._count._all, 0) },
      { label: "Sponsorships", amountPence: sponsorshipType.reduce((sum, row) => sum + (row._sum.amountPence || 0), 0), count: sponsorshipType.reduce((sum, row) => sum + row._count._all, 0) },
      { label: "Offline income", amountPence: offlineIncome._sum.amountPence || 0, count: offlineIncome._count._all },
      { label: "Collections", amountPence: collections.reduce((sum, row) => sum + row.amountPence, 0), count: collections.length },
      { label: "Recurring (active)", amountPence: recurringActive._sum.amountPence || 0, count: recurringActive._count._all },
    ]

    const totalIncomePence = sourceRows.reduce((sum, row) => sum + (row.amountPence || 0), 0)
    const totalIncomeCount = sourceRows.reduce((sum, row) => sum + (row.count || 0), 0)
    const giftAidPence = giftAidRows.reduce((sum, row) => sum + (row.amountPence || 0), 0)

    const donationCount = donorTotals.length + waterDonorTotals.length + sponsorshipDonorTotals.length
    const giftAidCount =
      donorTotals.filter((row) => row.giftAid).length +
      waterDonorTotals.filter((row) => row.giftAid).length +
      sponsorshipDonorTotals.filter((row) => row.giftAid).length

    const donorAmountMap = new Map<string, { amountPence: number; count: number }>()
    const addToDonorTotals = (rows: Array<{ donorId: string; amountPence: number }>) => {
      rows.forEach((row) => {
        const entry = donorAmountMap.get(row.donorId) || { amountPence: 0, count: 0 }
        entry.amountPence += row.amountPence
        entry.count += 1
        donorAmountMap.set(row.donorId, entry)
      })
    }
    addToDonorTotals(donorTotals)
    addToDonorTotals(waterDonorTotals)
    addToDonorTotals(sponsorshipDonorTotals)

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
      rows: Array<{ status: string | null; _sum: { amountPence: number | null }; _count: { _all: number } }>,
      target: string
    ) =>
      rows
        .filter((row) => row.status === target)
        .map((row) => ({
          label: target,
          amountPence: row._sum.amountPence || 0,
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

    const donationGeo = byGeo(donorTotals)
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

    const appealIncomeMap = new Map<
      string,
      { appealId: string | null; label: string; donationAmountPence: number; donationCount: number; offlineAmountPence: number; collectionAmountPence: number }
    >()
    donationByAppeal.forEach((row) => {
      const key = row.appealId || "unassigned"
      const label = row.appealId ? appealMap.get(row.appealId) || "Unknown appeal" : "Unassigned"
      appealIncomeMap.set(key, {
        appealId: row.appealId,
        label,
        donationAmountPence: row._sum.amountPence || 0,
        donationCount: row._count._all,
        offlineAmountPence: 0,
        collectionAmountPence: 0,
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
        }
      entry.collectionAmountPence += row._sum.amountPence || 0
      appealIncomeMap.set(key, entry)
    })
    const appealsReportRows = Array.from(appealIncomeMap.values()).map((row) => ({
      ...row,
      totalPence: row.donationAmountPence + row.offlineAmountPence + row.collectionAmountPence,
    }))

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
