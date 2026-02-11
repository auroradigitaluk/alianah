import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { nanoid } from "nanoid"
import { sendFundraiserWelcomeEmail } from "@/lib/email"

const fundraiserSchema = z
  .object({
    appealId: z.string().optional(),
    waterProjectId: z.string().optional(),
    title: z.string().min(1),
    fundraiserName: z.string().min(1),
    email: z.string().email(),
    message: z.string().optional(),
    targetAmountPence: z.number().min(1, "Target amount is required"),
  })
  .superRefine((data, ctx) => {
    const hasAppeal = Boolean(data.appealId)
    const hasWaterProject = Boolean(data.waterProjectId)
    if (hasAppeal === hasWaterProject) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appealId"],
        message: "Provide either appealId or waterProjectId",
      })
    }
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

    let campaignTitle = data.title
    let appealTitleForEmail = "the appeal"
    let appealId: string | null = null
    let waterProjectId: string | null = null

    if (data.appealId) {
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

      campaignTitle = appeal.title
      appealTitleForEmail = appeal.title
      appealId = appeal.id
    }

    if (data.waterProjectId) {
      const project = await prisma.waterProject.findUnique({
        where: { id: data.waterProjectId },
        select: { id: true, projectType: true, allowFundraising: true, isActive: true },
      })

      if (!project) {
        return NextResponse.json({ error: "Water project not found" }, { status: 404 })
      }

      if (!project.allowFundraising) {
        return NextResponse.json(
          { error: "Fundraising is not enabled for this water project" },
          { status: 403 }
        )
      }

      if (!project.isActive) {
        return NextResponse.json(
          { error: "This water project is not active" },
          { status: 403 }
        )
      }

      const waterProjectLabels: Record<string, string> = {
        WATER_PUMP: "Water Pumps",
        WATER_WELL: "Water Wells",
        WATER_TANK: "Water Tanks",
        WUDHU_AREA: "Wudhu Areas",
      }
      campaignTitle = waterProjectLabels[project.projectType] || "Water Project"
      appealTitleForEmail = campaignTitle
      waterProjectId = project.id
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
        ...(appealId ? { appealId } : {}),
        ...(waterProjectId ? { waterProjectId } : {}),
        title: campaignTitle,
        slug,
        fundraiserName: data.fundraiserName,
        email: data.email,
        message: data.message || null,
        targetAmountPence: data.targetAmountPence,
        isActive: true,
      },
    })

    // Send welcome email with fundraising link
    const { getFundraiserBaseUrl } = await import("@/lib/utils")
    const fundraiserUrl = `${getFundraiserBaseUrl()}/fundraise/${fundraiser.slug}`
    
    try {
      await sendFundraiserWelcomeEmail({
        fundraiserEmail: fundraiser.email,
        fundraiserName: fundraiser.fundraiserName,
        fundraiserTitle: fundraiser.title,
        appealTitle: appealTitleForEmail,
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
