import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { z } from "zod"

const updateDonationSchema = z.object({
  status: z.enum(["WAITING_TO_REVIEW", "ORDERED", "PENDING", "COMPLETE"]).optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params
    const body = await request.json()
    const data = updateDonationSchema.parse(body)

    const donation = await prisma.sponsorshipDonation.update({
      where: { id },
      data,
      include: {
        donor: true,
        country: true,
        sponsorshipProject: true,
      },
    })

    return NextResponse.json(donation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating sponsorship donation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params

    const donation = await prisma.sponsorshipDonation.findUnique({
      where: { id },
      include: {
        donor: true,
        country: true,
        sponsorshipProject: true,
      },
    })

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 })
    }

    return NextResponse.json(donation)
  } catch (error) {
    console.error("Error fetching sponsorship donation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
