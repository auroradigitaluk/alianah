import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

const PAGE_KEYS = [
  "donations",
  "recurring",
  "offline-income",
  "collections",
  "tasks",
] as const

export type NotificationCounts = Record<(typeof PAGE_KEYS)[number], number>

function getSinceDate(visits: { pageKey: string; lastVisitedAt: Date }[], pageKey: string): Date | null {
  const v = visits.find((x) => x.pageKey === pageKey)
  return v ? v.lastVisitedAt : null
}

export async function GET() {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const visits = await prisma.adminPageVisit.findMany({
      where: { adminUserId: user.id },
      select: { pageKey: true, lastVisitedAt: true },
    })

    const sinceDonations = getSinceDate(visits, "donations")
    const sinceRecurring = getSinceDate(visits, "recurring")
    const sinceOffline = getSinceDate(visits, "offline-income")
    const sinceCollections = getSinceDate(visits, "collections")
    const sinceTasks = getSinceDate(visits, "tasks")

    const [
      donationsCount,
      recurringCount,
      offlineCount,
      collectionsCount,
      tasksCount,
    ] = await Promise.all([
      prisma.donation.count({
        where: sinceDonations ? { createdAt: { gt: sinceDonations } } : undefined,
      }),
      prisma.recurringDonation.count({
        where: sinceRecurring ? { createdAt: { gt: sinceRecurring } } : undefined,
      }),
      prisma.offlineIncome.count({
        where: sinceOffline ? { receivedAt: { gt: sinceOffline } } : undefined,
      }),
      prisma.collection.count({
        where: sinceCollections ? { collectedAt: { gt: sinceCollections } } : undefined,
      }),
      prisma.task.count({
        where: {
          assigneeId: user.id,
          ...(sinceTasks ? { createdAt: { gt: sinceTasks } } : {}),
        },
      }),
    ])

    const counts: NotificationCounts = {
      donations: donationsCount,
      recurring: recurringCount,
      "offline-income": offlineCount,
      collections: collectionsCount,
      tasks: tasksCount,
    }

    return NextResponse.json(counts)
  } catch (error) {
    console.error("Notifications GET error:", error)
    return NextResponse.json(
      { error: "Failed to load notification counts" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const page = body?.page
    if (!page || !(PAGE_KEYS as readonly string[]).includes(page)) {
      return NextResponse.json({ error: "Invalid page key" }, { status: 400 })
    }

    const now = new Date()
    await prisma.adminPageVisit.upsert({
      where: {
        adminUserId_pageKey: { adminUserId: user.id, pageKey: page },
      },
      create: {
        adminUserId: user.id,
        pageKey: page,
        lastVisitedAt: now,
      },
      update: { lastVisitedAt: now },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Notifications POST error:", error)
    return NextResponse.json(
      { error: "Failed to record page visit" },
      { status: 500 }
    )
  }
}
