import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  isActive: z.boolean(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const fundraiser = await prisma.fundraiser.findUnique({
      where: { id },
      include: {
        appeal: {
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            isActive: true,
          },
        },
        donations: {
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
        },
      },
    })

    if (!fundraiser) {
      return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })
    }

    // Calculate statistics
    const completedDonations = fundraiser.donations.filter((d) => d.status === "COMPLETED")
    const totalRaised = completedDonations.reduce((sum, d) => sum + d.amountPence, 0)
    const donationCount = completedDonations.length
    const averageDonation = donationCount > 0 ? totalRaised / donationCount : 0
    const progressPercentage = fundraiser.targetAmountPence
      ? Math.min((totalRaised / fundraiser.targetAmountPence) * 100, 100)
      : 0

    // Group by donation type
    const donationsByType = completedDonations.reduce((acc, d) => {
      acc[d.donationType] = (acc[d.donationType] || 0) + d.amountPence
      return acc
    }, {} as Record<string, number>)

    // Group by payment method
    const donationsByPaymentMethod = completedDonations.reduce((acc, d) => {
      acc[d.paymentMethod] = (acc[d.paymentMethod] || 0) + d.amountPence
      return acc
    }, {} as Record<string, number>)

    // Gift aid count
    const giftAidCount = completedDonations.filter((d) => d.giftAid).length

    // Serialize dates
    const serialized = {
      ...fundraiser,
      createdAt: fundraiser.createdAt.toISOString(),
      statistics: {
        totalRaised,
        donationCount,
        averageDonation,
        progressPercentage,
        targetAmountPence: fundraiser.targetAmountPence,
        donationsByType,
        donationsByPaymentMethod,
        giftAidCount,
        giftAidPercentage: donationCount > 0 ? (giftAidCount / donationCount) * 100 : 0,
      },
      donations: fundraiser.donations.map((donation) => ({
        ...donation,
        createdAt: donation.createdAt.toISOString(),
        completedAt: donation.completedAt?.toISOString() || null,
      })),
    }

    return NextResponse.json(serialized)
  } catch (error) {
    console.error("Error fetching fundraiser details:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("Error details:", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    })
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ 
      error: `Internal server error: ${errorMessage}`,
      details: process.env.NODE_ENV === "development" ? String(error) : undefined
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateSchema.parse(body)

    const fundraiser = await prisma.fundraiser.update({
      where: { id },
      data: {
        isActive: data.isActive,
      },
    })

    return NextResponse.json(fundraiser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update fundraiser" }, { status: 500 })
  }
}
