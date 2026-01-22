import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { nanoid } from "nanoid"
import { sendFundraiserWelcomeEmail } from "@/lib/email"

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

    // Check if email already has fundraisers - if so, require login
    const existingFundraiser = await prisma.fundraiser.findFirst({
      where: {
        email: data.email,
      },
      select: {
        id: true,
      },
    })

    if (existingFundraiser) {
      return NextResponse.json(
        { 
          error: "Email already registered",
          requiresLogin: true,
          message: "This email is already registered. Please login to create a new fundraiser."
        },
        { status: 403 }
      )
    }

    // Verify appeal exists and allows fundraising
    const appeal = await prisma.appeal.findUnique({
      where: { id: data.appealId },
      select: { id: true, title: true, allowFundraising: true, isActive: true },
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

    // Send welcome email with fundraising link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const fundraiserUrl = `${baseUrl}/fundraise/${fundraiser.slug}`
    
    try {
      await sendFundraiserWelcomeEmail({
        fundraiserEmail: fundraiser.email,
        fundraiserName: fundraiser.fundraiserName,
        fundraiserTitle: fundraiser.title,
        appealTitle: appeal.title || "the appeal",
        fundraiserUrl,
      })
    } catch (emailError) {
      // Log error but don't fail the request - fundraiser is already created
      console.error("Error sending welcome email:", emailError)
    }

    return NextResponse.json({ slug: fundraiser.slug })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Fundraiser creation error:", error)
    return NextResponse.json({ error: "Failed to create fundraiser" }, { status: 500 })
  }
}
