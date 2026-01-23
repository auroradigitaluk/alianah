import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify fundraiser exists
    const fundraiser = await prisma.fundraiser.findUnique({
      where: { id },
    })

    if (!fundraiser) {
      return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })
    }

    // Fetch all donations for this fundraiser
    const donations = await prisma.donation.findMany({
      where: {
        fundraiserId: id,
      },
      include: {
        donor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        appeal: {
          select: {
            title: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Serialize dates
    const serializedDonations = donations.map((donation) => ({
      ...donation,
      createdAt: donation.createdAt.toISOString(),
      completedAt: donation.completedAt?.toISOString() || null,
    }))

    return NextResponse.json(serializedDonations)
  } catch (error) {
    console.error("Error fetching fundraiser donations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
