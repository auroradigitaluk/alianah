import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  amountPence: z.number().int().positive("Amount must be positive"),
  donorName: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  receivedAt: z.string().datetime().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const email = await getFundraiserEmail()
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const fundraiser = await prisma.fundraiser.findFirst({
      where: { id, email },
      select: { id: true },
    })
    if (!fundraiser) return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })

    const list = await prisma.fundraiserCashDonation.findMany({
      where: { fundraiserId: id },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    return NextResponse.json(
      list.map((d) => ({
        id: d.id,
        fundraiserId: d.fundraiserId,
        amountPence: d.amountPence,
        donorName: d.donorName,
        notes: d.notes,
        receivedAt: d.receivedAt.toISOString(),
        status: d.status,
        reviewedAt: d.reviewedAt?.toISOString() ?? null,
        reviewedBy: d.reviewedBy
          ? {
              id: d.reviewedBy.id,
              firstName: d.reviewedBy.firstName,
              lastName: d.reviewedBy.lastName,
              email: d.reviewedBy.email,
            }
          : null,
        createdAt: d.createdAt.toISOString(),
      }))
    )
  } catch (error) {
    console.error("Fundraiser cash donations GET error:", error)
    return NextResponse.json({ error: "Failed to load cash donations" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const email = await getFundraiserEmail()
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const fundraiser = await prisma.fundraiser.findFirst({
      where: { id, email },
      select: { id: true },
    })
    if (!fundraiser) return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })

    const body = await request.json()
    const data = createSchema.parse(body)
    const receivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date()

    const cash = await prisma.fundraiserCashDonation.create({
      data: {
        fundraiserId: id,
        amountPence: data.amountPence,
        donorName: data.donorName?.trim() || null,
        notes: data.notes?.trim() || null,
        receivedAt,
        status: "PENDING_REVIEW",
      },
    })

    return NextResponse.json({
      id: cash.id,
      fundraiserId: cash.fundraiserId,
      amountPence: cash.amountPence,
      donorName: cash.donorName,
      notes: cash.notes,
      receivedAt: cash.receivedAt.toISOString(),
      status: cash.status,
      createdAt: cash.createdAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      )
    }
    console.error("Fundraiser cash donations POST error:", error)
    return NextResponse.json({ error: "Failed to submit cash donation" }, { status: 500 })
  }
}
