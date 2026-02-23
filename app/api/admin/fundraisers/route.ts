import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { z } from "zod"
import { nanoid } from "nanoid"
import { sendFundraiserWelcomeEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

const createSchema = z
  .object({
    appealId: z.string().optional(),
    waterProjectId: z.string().optional(),
    title: z.string().min(1).optional(),
    fundraiserName: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    message: z.string().optional(),
    targetAmountPence: z.number().int().min(0).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const hasAppeal = Boolean(data.appealId)
    const hasWaterProject = Boolean(data.waterProjectId)
    if (hasAppeal === hasWaterProject) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appealId"],
        message: "Select either an appeal or a water project",
      })
    }
  })

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    let campaignTitle = ""
    let appealTitleForEmail = ""
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
        return NextResponse.json({ error: "This appeal is not active" }, { status: 403 })
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
        return NextResponse.json({ error: "This water project is not active" }, { status: 403 })
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

    const title =
      data.title && data.title.trim()
        ? data.title.trim()
        : `${data.fundraiserName} is fundraising for ${campaignTitle}`

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
        title,
        slug,
        fundraiserName: data.fundraiserName,
        email: data.email,
        message: data.message?.trim() || null,
        targetAmountPence: data.targetAmountPence ?? null,
        isActive: true,
      },
    })

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
      console.error("Error sending fundraiser welcome email:", emailError)
      return NextResponse.json(
        {
          error: "Fundraiser created but email failed to send",
          slug: fundraiser.slug,
          fundraiserUrl,
          emailError: emailError instanceof Error ? emailError.message : "Unknown error",
        },
        { status: 201 }
      )
    }

    return NextResponse.json({ slug: fundraiser.slug, fundraiserUrl })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Validation failed", issues: error.issues }, { status: 400 })
    }
    console.error("Admin create fundraiser error:", error)
    return NextResponse.json({ error: "Failed to create fundraiser" }, { status: 500 })
  }
}
