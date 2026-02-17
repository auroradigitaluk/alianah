import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { z } from "zod"

export const dynamic = 'force-dynamic'

const updateSchema = z
  .object({
    isActive: z.boolean().optional(),
    fundraiserName: z.string().min(1, "Name is required").optional(),
    email: z.string().email("Invalid email").optional(),
    message: z.string().nullable().optional(),
    targetAmountPence: z.union([z.number().int().min(0), z.null()]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field required" })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
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
        waterProject: {
          select: {
            id: true,
            projectType: true,
            description: true,
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
        waterProjectDonations: {
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
        },
        cashDonations: {
          where: { status: "APPROVED" },
          orderBy: { receivedAt: "desc" },
        },
      },
    })

    if (!fundraiser) {
      return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })
    }

    const normalizedWaterDonations = fundraiser.waterProjectDonations.map((donation) => ({
      id: donation.id,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      frequency: "ONE_OFF",
      status: donation.status === "PENDING" ? "PENDING" : "COMPLETED",
      paymentMethod: donation.paymentMethod,
      giftAid: donation.giftAid,
      transactionId: donation.transactionId,
      billingAddress: donation.billingAddress,
      billingCity: donation.billingCity,
      billingPostcode: donation.billingPostcode,
      billingCountry: donation.billingCountry,
      createdAt: donation.createdAt,
      completedAt: donation.completedAt,
      donor: donation.donor,
      appeal: fundraiser.waterProject
        ? {
            title:
              fundraiser.waterProject.projectType === "WATER_PUMP"
                ? "Water Pumps"
                : fundraiser.waterProject.projectType === "WATER_WELL"
                  ? "Water Wells"
                  : fundraiser.waterProject.projectType === "WATER_TANK"
                    ? "Water Tanks"
                    : fundraiser.waterProject.projectType === "WUDHU_AREA"
                      ? "Wudhu Areas"
                      : "Water Project",
          }
        : null,
      product: null,
    }))

    const normalizedDonations = fundraiser.donations.map((donation) => ({
      id: donation.id,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      frequency: donation.frequency,
      status: donation.status,
      paymentMethod: donation.paymentMethod,
      giftAid: donation.giftAid,
      transactionId: donation.transactionId,
      billingAddress: donation.billingAddress,
      billingCity: donation.billingCity,
      billingPostcode: donation.billingPostcode,
      billingCountry: donation.billingCountry,
      createdAt: donation.createdAt,
      completedAt: donation.completedAt,
      donor: donation.donor,
      appeal: donation.appeal,
      product: donation.product,
    }))

    const campaignTitleForCash = fundraiser.appeal?.title
      ?? (fundraiser.waterProject?.projectType === "WATER_PUMP"
        ? "Water Pumps"
        : fundraiser.waterProject?.projectType === "WATER_WELL"
          ? "Water Wells"
          : fundraiser.waterProject?.projectType === "WATER_TANK"
            ? "Water Tanks"
            : fundraiser.waterProject?.projectType === "WUDHU_AREA"
              ? "Wudhu Areas"
              : "Water Project")

    const normalizedCashDonations = fundraiser.cashDonations.map((cash) => ({
      id: `cash-${cash.id}`,
      amountPence: cash.amountPence,
      donationType: "GENERAL",
      frequency: "ONE_OFF",
      status: "COMPLETED",
      paymentMethod: "CASH",
      giftAid: false,
      transactionId: null,
      billingAddress: null,
      billingCity: null,
      billingPostcode: null,
      billingCountry: null,
      createdAt: cash.receivedAt,
      completedAt: cash.reviewedAt ?? cash.receivedAt,
      donor: {
        title: null,
        firstName: cash.donorName?.trim() || "Cash donor",
        lastName: "",
        email: "",
      },
      appeal: { title: campaignTitleForCash },
      product: null,
    }))

    const combinedDonations = normalizedDonations
      .concat(normalizedWaterDonations)
      .concat(normalizedCashDonations)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Calculate statistics
    const completedDonations = combinedDonations.filter((d) => d.status === "COMPLETED")
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
    const campaignTitle = fundraiser.appeal?.title
      ? fundraiser.appeal.title
      : fundraiser.waterProject?.projectType === "WATER_PUMP"
        ? "Water Pumps"
        : fundraiser.waterProject?.projectType === "WATER_WELL"
          ? "Water Wells"
          : fundraiser.waterProject?.projectType === "WATER_TANK"
            ? "Water Tanks"
            : fundraiser.waterProject?.projectType === "WUDHU_AREA"
              ? "Wudhu Areas"
              : "Water Project"

    const serialized = {
      ...fundraiser,
      createdAt: fundraiser.createdAt.toISOString(),
      campaign: {
        id: fundraiser.appeal?.id || fundraiser.waterProject?.id || "",
        title: campaignTitle,
        slug: fundraiser.appeal?.slug || "",
        summary: fundraiser.appeal?.summary || fundraiser.waterProject?.description || null,
        isActive: fundraiser.appeal?.isActive ?? fundraiser.waterProject?.isActive ?? false,
        type: fundraiser.appeal ? "APPEAL" : "WATER",
      },
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
      donations: combinedDonations.map((donation) => ({
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
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateSchema.parse(body)

    const updateData: {
      isActive?: boolean
      fundraiserName?: string
      email?: string
      message?: string | null
      targetAmountPence?: number | null
    } = {}
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.fundraiserName !== undefined) updateData.fundraiserName = data.fundraiserName
    if (data.email !== undefined) updateData.email = data.email
    if (data.message !== undefined) updateData.message = data.message
    if (data.targetAmountPence !== undefined) updateData.targetAmountPence = data.targetAmountPence

    const fundraiser = await prisma.fundraiser.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(fundraiser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update fundraiser" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params

    await prisma.fundraiser.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })
    }
    console.error("Error deleting fundraiser:", error)
    return NextResponse.json({ error: "Failed to delete fundraiser" }, { status: 500 })
  }
}
