import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

const querySchema = z.object({
  staffId: z.string().min(1),
  range: z.string().optional(),
})

function getDateRange(range: string | null) {
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

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
    const { startDate, endDate } = getDateRange(query.range ?? null)
    const staffFilter = { addedByAdminUserId: query.staffId }

    const [offlineIncome, collections, waterDonations, sponsorshipDonations] = await Promise.all([
      prisma.offlineIncome.findMany({
        where: {
          ...staffFilter,
          receivedAt: { gte: startDate, lte: endDate },
        },
        orderBy: { receivedAt: "desc" },
        include: {
          appeal: { select: { title: true } },
          addedBy: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      prisma.collection.findMany({
        where: {
          ...staffFilter,
          collectedAt: { gte: startDate, lte: endDate },
        },
        orderBy: { collectedAt: "desc" },
        include: {
          masjid: { select: { name: true } },
          appeal: { select: { title: true } },
          addedBy: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      prisma.waterProjectDonation.findMany({
        where: {
          ...staffFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETE",
        },
        orderBy: { createdAt: "desc" },
        include: {
          waterProject: { select: { projectType: true, location: true } },
          country: { select: { country: true } },
          donor: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.sponsorshipDonation.findMany({
        where: {
          ...staffFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETE",
        },
        orderBy: { createdAt: "desc" },
        include: {
          sponsorshipProject: { select: { projectType: true, location: true } },
          country: { select: { country: true } },
          donor: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
    ])

    return NextResponse.json({
      offlineIncome: offlineIncome.map((i) => ({
        id: i.id,
        amountPence: i.amountPence,
        donationType: i.donationType,
        source: i.source,
        receivedAt: i.receivedAt.toISOString(),
        notes: i.notes,
        appealTitle: i.appeal?.title ?? null,
      })),
      collections: collections.map((c) => ({
        id: c.id,
        amountPence: c.amountPence,
        donationType: c.donationType,
        type: c.type,
        collectedAt: c.collectedAt.toISOString(),
        notes: c.notes,
        masjidName: c.masjid?.name ?? c.otherLocationName ?? null,
        appealTitle: c.appeal?.title ?? null,
      })),
      waterDonations: waterDonations.map((d) => ({
        id: d.id,
        amountPence: d.amountPence,
        donationType: d.donationType,
        projectType: d.waterProject?.projectType ?? null,
        location: d.waterProject?.location ?? null,
        country: d.country?.country ?? null,
        donorName: d.donor
          ? `${d.donor.firstName} ${d.donor.lastName}`.trim() || d.donor.email
          : null,
        createdAt: d.createdAt.toISOString(),
      })),
      sponsorshipDonations: sponsorshipDonations.map((d) => ({
        id: d.id,
        amountPence: d.amountPence,
        donationType: d.donationType,
        projectType: d.sponsorshipProject?.projectType ?? null,
        location: d.sponsorshipProject?.location ?? null,
        country: d.country?.country ?? null,
        donorName: d.donor
          ? `${d.donor.firstName} ${d.donor.lastName}`.trim() || d.donor.email
          : null,
        createdAt: d.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Staff details API error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load staff details" },
      { status: 500 }
    )
  }
}
