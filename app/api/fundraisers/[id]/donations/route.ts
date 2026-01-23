import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const email = await getFundraiserEmail()

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the fundraiser belongs to the logged-in user
    const fundraiser = await prisma.fundraiser.findFirst({
      where: {
        id,
        email,
      },
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
            title: true,
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
