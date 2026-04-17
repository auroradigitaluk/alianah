import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { nanoid } from "nanoid"
import { sendFundraiserWelcomeEmail } from "@/lib/email"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"

const fundraiserSchema = z
  .object({
    appealId: z.string().optional(),
    waterProjectId: z.string().optional(),
    waterProjectCountryId: z.string().optional(),
    qurbaniCountryId: z.string().optional(),
    isCustom: z.boolean().optional().default(false),
    customImageUrls: z.array(z.string().url()).optional(),
    title: z.string().min(1),
    fundraiserName: z.string().min(1),
    email: z.string().email(),
    message: z.string().optional(),
    targetAmountPence: z.number().min(1, "Target amount is required"),
    plaqueName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasAppeal = Boolean(data.appealId)
    const hasWaterProject = Boolean(data.waterProjectId)
    const hasQurbani = Boolean(data.qurbaniCountryId)
    if ([hasAppeal, hasWaterProject, hasQurbani].filter(Boolean).length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appealId"],
        message: "Provide exactly one campaign: appeal, water project, or qurbani country",
      })
    }
    if (data.waterProjectId && !data.waterProjectCountryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["waterProjectCountryId"],
        message: "Water project fundraiser requires a country selection",
      })
    }

    if (data.isCustom) {
      const images = data.customImageUrls ?? []
      if (!Array.isArray(images) || images.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customImageUrls"],
          message: "Custom fundraisers must include at least 3 image URLs",
        })
      }
    }
  })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = fundraiserSchema.parse(body)

    // If email already has fundraisers, allow creation only when session email matches (returning user)
    const sessionEmail = await getFundraiserEmail()
    const bodyEmailNormalized = data.email.trim().toLowerCase()
    const existingFundraiser = await prisma.fundraiser.findFirst({
      where: { email: bodyEmailNormalized },
      select: { id: true },
    })

    if (existingFundraiser && (!sessionEmail || sessionEmail !== bodyEmailNormalized)) {
      return NextResponse.json(
        {
          error: "Email already registered",
          requiresLogin: true,
          message: "This email is already registered. Please login to create a new fundraiser.",
        },
        { status: 403 }
      )
    }

    let campaignTitle = data.title
    let appealTitleForEmail = "the appeal"
    let appealId: string | null = null
    let waterProjectId: string | null = null
    let qurbaniCountryId: string | null = null

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
        select: { id: true, projectType: true, allowFundraising: true, isActive: true, plaqueAvailable: true },
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

      if (data.waterProjectCountryId) {
        const country = await prisma.waterProjectCountry.findFirst({
          where: {
            id: data.waterProjectCountryId,
            projectType: project.projectType,
            isActive: true,
          },
        })
        if (!country) {
          return NextResponse.json(
            { error: "Invalid country for this water project" },
            { status: 400 }
          )
        }
      }

      if (project.plaqueAvailable && (!data.plaqueName || !String(data.plaqueName).trim())) {
        return NextResponse.json(
          { error: "Name on plaque is required for this water project" },
          { status: 400 }
        )
      }

      const waterProjectLabels: Record<string, string> = {
        WATER_PUMP: "Water Pumps",
        WATER_WELL: "Water Wells",
        WATER_TANK: "Water Tanks",
        WUDHU_AREA: "Wudhu Areas",
      }
      appealTitleForEmail = waterProjectLabels[project.projectType] || "Water Project"
      waterProjectId = project.id
    }

    if (data.qurbaniCountryId) {
      const country = await prisma.qurbaniCountry.findUnique({
        where: { id: data.qurbaniCountryId },
        select: { id: true, country: true, isActive: true },
      })
      if (!country) {
        return NextResponse.json({ error: "Qurbani country not found" }, { status: 404 })
      }
      if (!country.isActive) {
        return NextResponse.json({ error: "This qurbani country is not active" }, { status: 403 })
      }
      appealTitleForEmail = `Qurbani - ${country.country}`
      qurbaniCountryId = country.id
    }

    const title = (data.title && data.title.trim()) ? data.title.trim() : appealTitleForEmail

    // Generate unique slug
    let slug = nanoid(12)
    let exists = await prisma.fundraiser.findUnique({ where: { slug } })
    while (exists) {
      slug = nanoid(12)
      exists = await prisma.fundraiser.findUnique({ where: { slug } })
    }

    const isCustom = data.isCustom ?? false
    const fundraiser = await prisma.fundraiser.create({
      data: {
        ...(appealId
          ? {
              appeal: {
                connect: { id: appealId },
              },
            }
          : {}),
        ...(waterProjectId
          ? {
              waterProject: {
                connect: { id: waterProjectId },
              },
            }
          : {}),
        ...(data.waterProjectCountryId
          ? {
              waterProjectCountry: {
                connect: { id: data.waterProjectCountryId },
              },
            }
          : {}),
        ...(qurbaniCountryId
          ? {
              qurbaniCountry: {
                connect: { id: qurbaniCountryId },
              },
            }
          : {}),
        ...(data.plaqueName != null && data.plaqueName.trim() !== ""
          ? { plaqueName: data.plaqueName.trim() }
          : {}),
        title,
        slug,
        fundraiserName: data.fundraiserName,
        email: data.email,
        message: data.message || null,
        targetAmountPence: data.targetAmountPence,
        isCustom,
        customApprovalStatus: isCustom ? "PENDING" : "APPROVED",
        customImageUrls: JSON.stringify(data.customImageUrls ?? []),
        isActive: !isCustom,
      },
    })

    // Send welcome email with fundraising link for immediate-live campaigns
    const { getFundraiserBaseUrl } = await import("@/lib/utils")
    const fundraiserUrl = `${getFundraiserBaseUrl()}/fundraise/${fundraiser.slug}`

    if (!isCustom) {
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
    }

    if (isCustom) {
      return NextResponse.json({
        slug: fundraiser.slug,
        pendingApproval: true,
        message: "Custom fundraiser submitted for admin approval",
      })
    }

    return NextResponse.json({ slug: fundraiser.slug, pendingApproval: false })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Fundraiser creation error:", error)
    return NextResponse.json({ error: "Failed to create fundraiser" }, { status: 500 })
  }
}
