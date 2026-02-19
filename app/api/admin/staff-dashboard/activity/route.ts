import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { formatCurrency, formatEnum } from "@/lib/utils"

const querySchema = z.object({
  staffId: z.string().min(1),
})

export type ActivityItem = {
  type: string
  message: string
  timestamp: string
}

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    const { staffId } = query

    const [
      auditLogs,
      offlineIncome,
      collections,
      masjids,
      collectionBookings,
      waterDonations,
      sponsorshipDonations,
    ] = await Promise.all([
      prisma.auditLog.findMany({
        where: { adminUserId: staffId },
        orderBy: { createdAt: "desc" },
        select: { action: true, entityType: true, createdAt: true },
      }),
      prisma.offlineIncome.findMany({
        where: { addedByAdminUserId: staffId },
        orderBy: { receivedAt: "desc" },
        select: {
          amountPence: true,
          source: true,
          receivedAt: true,
          appeal: { select: { title: true } },
        },
      }),
      prisma.collection.findMany({
        where: { addedByAdminUserId: staffId },
        orderBy: { collectedAt: "desc" },
        select: {
          amountPence: true,
          type: true,
          collectedAt: true,
          otherLocationName: true,
          masjid: { select: { name: true } },
        },
      }),
      prisma.masjid.findMany({
        where: { addedByAdminUserId: staffId },
        orderBy: { createdAt: "desc" },
        select: { name: true, createdAt: true },
      }),
      prisma.collectionBooking.findMany({
        where: { addedByAdminUserId: staffId },
        orderBy: { createdAt: "desc" },
        select: { locationName: true, createdAt: true },
      }),
      prisma.waterProjectDonation.findMany({
        where: { addedByAdminUserId: staffId },
        orderBy: { createdAt: "desc" },
        select: {
          amountPence: true,
          createdAt: true,
          waterProject: { select: { projectType: true } },
        },
      }),
      prisma.sponsorshipDonation.findMany({
        where: { addedByAdminUserId: staffId },
        orderBy: { createdAt: "desc" },
        select: {
          amountPence: true,
          createdAt: true,
          sponsorshipProject: { select: { projectType: true } },
        },
      }),
    ])

    const activities: ActivityItem[] = []

    const deleteMessageByEntityType: Record<string, string> = {
      offline_income: "Deleted offline donation",
      collection: "Deleted collection",
      collection_booking: "Deleted collection booking",
      masjid: "Deleted masjid",
      water_project_donation: "Deleted water donation",
      sponsorship_donation: "Deleted sponsorship donation",
    }
    auditLogs.forEach((a) => {
      if (a.action === "LOGIN" || a.action === "LOGOUT") {
        const actionLabel = a.action === "LOGIN" ? "Logged in" : "Logged out"
        activities.push({
          type: "session",
          message: actionLabel,
          timestamp: a.createdAt.toISOString(),
        })
      } else if (a.action === "DELETE" && a.entityType in deleteMessageByEntityType) {
        activities.push({
          type: "delete",
          message: deleteMessageByEntityType[a.entityType as keyof typeof deleteMessageByEntityType],
          timestamp: a.createdAt.toISOString(),
        })
      }
    })
    offlineIncome.forEach((i) => {
      activities.push({
        type: "offline",
        message: `Added offline donation: ${formatCurrency(i.amountPence)} (${formatEnum(i.source)}${i.appeal?.title ? ` · ${i.appeal.title}` : ""})`,
        timestamp: i.receivedAt.toISOString(),
      })
    })
    collections.forEach((c) => {
      const location = c.masjid?.name ?? c.otherLocationName ?? "Collection"
      activities.push({
        type: "collection",
        message: `Added collection: ${formatCurrency(c.amountPence)} — ${location} (${formatEnum(c.type)})`,
        timestamp: c.collectedAt.toISOString(),
      })
    })
    masjids.forEach((m) => {
      activities.push({
        type: "masjid",
        message: `Added masjid: ${m.name}`,
        timestamp: m.createdAt.toISOString(),
      })
    })
    collectionBookings.forEach((b) => {
      activities.push({
        type: "booking",
        message: `Added collection booking: ${b.locationName}`,
        timestamp: b.createdAt.toISOString(),
      })
    })
    waterDonations.forEach((d) => {
      const projectType = d.waterProject?.projectType ?? "Water"
      activities.push({
        type: "water",
        message: `Added water donation: ${formatCurrency(d.amountPence)} (${formatEnum(projectType)})`,
        timestamp: d.createdAt.toISOString(),
      })
    })
    sponsorshipDonations.forEach((d) => {
      const projectType = d.sponsorshipProject?.projectType ?? "Sponsorship"
      activities.push({
        type: "sponsorship",
        message: `Added sponsorship donation: ${formatCurrency(d.amountPence)} (${formatEnum(projectType)})`,
        timestamp: d.createdAt.toISOString(),
      })
    })

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ activities })
  } catch (error) {
    console.error("Staff activity API error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load activity" },
      { status: 500 }
    )
  }
}
