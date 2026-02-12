import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  amountPence: z.number().int().positive("Amount must be positive"),
  donorName: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
})

/**
 * Public endpoint: allow anyone to record a cash donation for a fundraiser (no login).
 * Donation is created with status PENDING_REVIEW for staff/fundraiser to confirm.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fundraiserId } = await params
    const fundraiser = await prisma.fundraiser.findFirst({
      where: { id: fundraiserId, isActive: true },
      select: { id: true },
    })
    if (!fundraiser)
      return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })

    const body = await request.json()
    const data = bodySchema.parse(body)

    const cash = await prisma.fundraiserCashDonation.create({
      data: {
        fundraiserId: fundraiser.id,
        amountPence: data.amountPence,
        donorName: data.donorName?.trim() || null,
        notes: data.notes?.trim() || null,
        receivedAt: new Date(),
        status: "PENDING_REVIEW",
      },
    })

    return NextResponse.json({
      id: cash.id,
      amountPence: cash.amountPence,
      message: "Cash donation recorded. It will be reviewed and added to the total once confirmed.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      )
    }
    console.error("Public fundraiser cash donation POST error:", error)
    return NextResponse.json(
      { error: "Failed to submit cash donation" },
      { status: 500 }
    )
  }
}
