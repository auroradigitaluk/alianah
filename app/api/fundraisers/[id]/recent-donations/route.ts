import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const MAX_RECENT = 100

/**
 * Public API: recent completed donations for a fundraiser (for "Recent supporters" list).
 * No auth required. Only returns data for active fundraisers.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fundraiserId } = await params

    const fundraiser = await prisma.fundraiser.findFirst({
      where: { id: fundraiserId, isActive: true },
      select: { id: true },
    })

    if (!fundraiser) {
      return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })
    }

    const [donations, approvedCash] = await Promise.all([
      prisma.donation.findMany({
        where: {
          fundraiserId,
          status: "COMPLETED",
        },
        select: {
          id: true,
          amountPence: true,
          isAnonymous: true,
          createdAt: true,
          donor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_RECENT,
      }),
      prisma.fundraiserCashDonation.findMany({
        where: { fundraiserId, status: "APPROVED" },
        select: {
          id: true,
          amountPence: true,
          donorName: true,
          receivedAt: true,
        },
        orderBy: { receivedAt: "desc" },
        take: MAX_RECENT,
      }),
    ])

    const onlineList = donations.map((d) => ({
      id: d.id,
      amountPence: d.amountPence,
      isAnonymous: d.isAnonymous,
      donor: d.donor,
      createdAt: d.createdAt.toISOString(),
    }))

    const cashList = approvedCash.map((d) => ({
      id: `cash-${d.id}`,
      amountPence: d.amountPence,
      isAnonymous: !d.donorName?.trim(),
      donor: d.donorName?.trim()
        ? { firstName: d.donorName.trim(), lastName: null as string | null }
        : { firstName: null, lastName: null },
      createdAt: new Date(d.receivedAt).toISOString(),
    }))

    const list = [...onlineList, ...cashList]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_RECENT)

    return NextResponse.json(list)
  } catch (error) {
    console.error("Error fetching recent donations:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
