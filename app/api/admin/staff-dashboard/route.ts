import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { formatCurrency, formatPaymentMethod, PAYMENT_METHODS } from "@/lib/utils"

const querySchema = z.object({
  staffId: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional(),
  range: z.string().optional(),
})

function getDateRange(range: string | null, startParam?: string, endParam?: string) {
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  if (startParam && endParam) {
    const s = new Date(startParam)
    const e = new Date(endParam)
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
      return { startDate: s, endDate: e }
    }
  }

  switch (range || "30d") {
    case "7d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
      break
    case "30d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
      break
    case "90d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 90)
      startDate.setHours(0, 0, 0, 0)
      break
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    case "all":
      startDate = new Date(0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      break
    default:
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
  }

  return { startDate, endDate }
}

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    const { startDate, endDate } = getDateRange(
      query.range ?? null,
      query.start,
      query.end
    )

    const staffFilter = { addedByAdminUserId: query.staffId }

    const [
      offlineIncome,
      collections,
      waterDonations,
      sponsorshipDonations,
      offlineCash,
      offlineBank,
      offlineCount,
      collectionsCount,
      waterCount,
      sponsorshipCount,
    ] = await Promise.all([
      prisma.offlineIncome.aggregate({
        where: {
          ...staffFilter,
          receivedAt: { gte: startDate, lte: endDate },
        },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.collection.aggregate({
        where: {
          ...staffFilter,
          collectedAt: { gte: startDate, lte: endDate },
        },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.waterProjectDonation.aggregate({
        where: {
          ...staffFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETE",
        },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.sponsorshipDonation.aggregate({
        where: {
          ...staffFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETE",
        },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.offlineIncome.aggregate({
        where: {
          ...staffFilter,
          source: "CASH",
          receivedAt: { gte: startDate, lte: endDate },
        },
        _sum: { amountPence: true },
      }),
      prisma.offlineIncome.aggregate({
        where: {
          ...staffFilter,
          source: "BANK_TRANSFER",
          receivedAt: { gte: startDate, lte: endDate },
        },
        _sum: { amountPence: true },
      }),
      prisma.offlineIncome.count({
        where: {
          ...staffFilter,
          receivedAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.collection.count({
        where: {
          ...staffFilter,
          collectedAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.waterProjectDonation.count({
        where: {
          ...staffFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETE",
        },
      }),
      prisma.sponsorshipDonation.count({
        where: {
          ...staffFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETE",
        },
      }),
    ])

    const totalAmountPence =
      (offlineIncome._sum.amountPence || 0) +
      (collections._sum.amountPence || 0) +
      (waterDonations._sum.amountPence || 0) +
      (sponsorshipDonations._sum.amountPence || 0)

    const paymentBreakdown = [
      {
        label: formatPaymentMethod(PAYMENT_METHODS.CASH),
        amountPence: offlineCash._sum.amountPence || 0,
        count: 0,
      },
      {
        label: formatPaymentMethod(PAYMENT_METHODS.BANK_TRANSFER),
        amountPence: offlineBank._sum.amountPence || 0,
        count: 0,
      },
      {
        label: "Collections (Masjid)",
        amountPence: collections._sum.amountPence || 0,
        count: collectionsCount,
      },
      {
        label: "Water Projects",
        amountPence: waterDonations._sum.amountPence || 0,
        count: waterCount,
      },
      {
        label: "Sponsorships",
        amountPence: sponsorshipDonations._sum.amountPence || 0,
        count: sponsorshipCount,
      },
    ]

    return NextResponse.json({
      range: { start: startDate.toISOString(), end: endDate.toISOString() },
      summary: {
        totalAmountPence,
        totalFormatted: formatCurrency(totalAmountPence),
        offlineIncomePence: offlineIncome._sum.amountPence || 0,
        collectionsPence: collections._sum.amountPence || 0,
        waterDonationsPence: waterDonations._sum.amountPence || 0,
        sponsorshipDonationsPence: sponsorshipDonations._sum.amountPence || 0,
        counts: {
          offlineIncome: offlineCount,
          collections: collectionsCount,
          waterDonations: waterCount,
          sponsorshipDonations: sponsorshipCount,
        },
      },
      paymentBreakdown,
    })
  } catch (error) {
    console.error("Staff dashboard API error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load staff dashboard" },
      { status: 500 }
    )
  }
}
