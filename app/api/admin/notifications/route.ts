import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

const PAGE_KEYS = [
  "donations",
  "recurring",
  "offline-income",
  "collections",
  "tasks",
  "water-for-life",
  "sponsorships",
  "qurbani",
  "bookings",
  "fundraisers",
  "donors",
  "volunteers",
  "distributions",
  "appeals",
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
    const sinceWaterForLife = getSinceDate(visits, "water-for-life")
    const sinceSponsorships = getSinceDate(visits, "sponsorships")
    const sinceQurbani = getSinceDate(visits, "qurbani")
    const sinceBookings = getSinceDate(visits, "bookings")
    const sinceFundraisers = getSinceDate(visits, "fundraisers")
    const sinceDonors = getSinceDate(visits, "donors")
    const sinceVolunteers = getSinceDate(visits, "volunteers")
    const sinceDistributions = getSinceDate(visits, "distributions")
    const sinceAppeals = getSinceDate(visits, "appeals")

    const [
      donationsCount,
      recurringCount,
      offlineCount,
      collectionsCount,
      tasksCount,
      waterForLifeCount,
      sponsorshipsCount,
      qurbaniCount,
      bookingsCount,
      fundraisersCount,
      donorsCount,
      volunteersCount,
      distributionsCount,
      appealsCount,
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
      prisma.waterProjectDonation.count({
        where: sinceWaterForLife ? { createdAt: { gt: sinceWaterForLife } } : undefined,
      }),
      prisma.sponsorshipDonation.count({
        where: sinceSponsorships ? { createdAt: { gt: sinceSponsorships } } : undefined,
      }),
      prisma.qurbaniDonation.count({
        where: sinceQurbani ? { createdAt: { gt: sinceQurbani } } : undefined,
      }),
      prisma.collectionBooking.count({
        where: sinceBookings ? { createdAt: { gt: sinceBookings } } : undefined,
      }),
      prisma.fundraiser.count({
        where: sinceFundraisers ? { createdAt: { gt: sinceFundraisers } } : undefined,
      }),
      prisma.donor.count({
        where: sinceDonors ? { createdAt: { gt: sinceDonors } } : undefined,
      }),
      prisma.volunteer.count({
        where: sinceVolunteers ? { createdAt: { gt: sinceVolunteers } } : undefined,
      }),
      prisma.distribution.count({
        where: sinceDistributions ? { createdAt: { gt: sinceDistributions } } : undefined,
      }),
      prisma.appeal.count({
        where: sinceAppeals ? { createdAt: { gt: sinceAppeals } } : undefined,
      }),
    ])

    const counts: NotificationCounts = {
      donations: donationsCount,
      recurring: recurringCount,
      "offline-income": offlineCount,
      collections: collectionsCount,
      tasks: tasksCount,
      "water-for-life": waterForLifeCount,
      sponsorships: sponsorshipsCount,
      qurbani: qurbaniCount,
      bookings: bookingsCount,
      fundraisers: fundraisersCount,
      donors: donorsCount,
      volunteers: volunteersCount,
      distributions: distributionsCount,
      appeals: appealsCount,
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
