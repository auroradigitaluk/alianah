import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { nanoid } from "nanoid"

const fundraiserSchema = z.object({
  appealId: z.string(),
  title: z.string().min(1),
  fundraiserName: z.string().min(1),
  email: z.string().email(),
  message: z.string().optional(),
  targetAmountPence: z.number().min(1, "Target amount is required"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = fundraiserSchema.parse(body)

    // Verify appeal exists and allows fundraising
    const appeal = await prisma.appeal.findUnique({
      where: { id: data.appealId },
      select: { id: true, allowFundraising: true, isActive: true },
    })

    if (!appeal) {
      return NextResponse.json({ error: "Appeal not found" }, { status: 404 })
    }

    if (!appeal.allowFundraising) {
      return NextResponse.json(
        { error: "Fundraising is not enabled for this appeal" },
        { status: 403 }
      )
    }

    if (!appeal.isActive) {
      return NextResponse.json(
        { error: "This appeal is not active" },
        { status: 403 }
      )
    }

    // Generate unique slug
    let slug = nanoid(12)
    let exists = await prisma.fundraiser.findUnique({ where: { slug } })
    while (exists) {
      slug = nanoid(12)
      exists = await prisma.fundraiser.findUnique({ where: { slug } })
    }

    const fundraiser = await prisma.fundraiser.create({
      data: {
        appealId: data.appealId,
        title: data.title,
        slug,
        fundraiserName: data.fundraiserName,
        email: data.email,
        message: data.message || null,
        targetAmountPence: data.targetAmountPence,
        isActive: true,
      },
    })

    return NextResponse.json({ slug: fundraiser.slug })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Fundraiser creation error:", error)
    return NextResponse.json({ error: "Failed to create fundraiser" }, { status: 500 })
  }
}
