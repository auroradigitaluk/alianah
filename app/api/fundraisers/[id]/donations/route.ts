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
      include: {
        waterProject: {
          select: {
            projectType: true,
          },
        },
      },
    })

    if (!fundraiser) {
      return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })
    }

    // Fetch all donations for this fundraiser
    const [donations, waterDonations] = await Promise.all([
      prisma.donation.findMany({
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
      }),
      prisma.waterProjectDonation.findMany({
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
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ])

    const waterCampaignTitle =
      fundraiser.waterProject?.projectType === "WATER_PUMP"
        ? "Water Pumps"
        : fundraiser.waterProject?.projectType === "WATER_WELL"
          ? "Water Wells"
          : fundraiser.waterProject?.projectType === "WATER_TANK"
            ? "Water Tanks"
            : fundraiser.waterProject?.projectType === "WUDHU_AREA"
              ? "Wudhu Areas"
              : "Water Project"

    const normalizedDonations = donations.map((donation) => ({
      id: donation.id,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      frequency: donation.frequency,
      status: donation.status,
      paymentMethod: donation.paymentMethod,
      giftAid: donation.giftAid,
      transactionId: donation.transactionId,
      createdAt: donation.createdAt,
      completedAt: donation.completedAt,
      donor: donation.donor,
      appeal: donation.appeal,
      product: donation.product,
    }))

    const normalizedWaterDonations = waterDonations.map((donation) => ({
      id: donation.id,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      frequency: "ONE_OFF",
      status: donation.status === "PENDING" ? "PENDING" : "COMPLETED",
      paymentMethod: donation.paymentMethod,
      giftAid: donation.giftAid,
      transactionId: donation.transactionId,
      createdAt: donation.createdAt,
      completedAt: donation.completedAt,
      donor: donation.donor,
      appeal: fundraiser.waterProject ? { title: waterCampaignTitle } : null,
      product: null,
    }))

    // Serialize dates
    const serializedDonations = normalizedDonations
      .concat(normalizedWaterDonations)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((donation) => ({
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
