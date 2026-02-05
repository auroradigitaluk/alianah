import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

const parseJsonArrayLength = (value: string | undefined): number => {
  if (!value) return 0
  try {
    const arr = JSON.parse(value)
    return Array.isArray(arr) ? arr.length : 0
  } catch {
    return 0
  }
}

const appealSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string(),
  sectionIntro: z.string().optional(),
  sectionNeed: z.string().optional(),
  sectionFundsUsed: z.string().optional(),
  sectionImpact: z.string().optional(),
  framerUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  isActive: z.boolean(),
  donationTypesEnabled: z.array(z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"])),
  allowMonthly: z.boolean(),
  allowYearly: z.boolean(),
  allowFundraising: z.boolean().optional().default(false),
  appealImageUrls: z.string().optional(),
  fundraisingImageUrls: z.string().optional(),
  fundraisingDefaultMessage: z.string().nullable().optional(),
  monthlyPricePence: z.number().nullable().optional(),
  yearlyPricePence: z.number().nullable().optional(),
  oneOffPresetAmountsPence: z.string().optional(),
  monthlyPresetAmountsPence: z.string().optional(),
  yearlyPresetAmountsPence: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.allowFundraising) {
    const count = parseJsonArrayLength(data.fundraisingImageUrls)
    if (count < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fundraisingImageUrls"],
        message: "At least 1 fundraising image is required when fundraising is enabled.",
      })
    }
  }
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params
    const body = await request.json()
    const data = appealSchema.parse(body)

    const updateData: Prisma.AppealUpdateInput = {
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      framerUrl: data.framerUrl || null,
      isActive: data.isActive,
      donationTypesEnabled: JSON.stringify(data.donationTypesEnabled),
      allowMonthly: data.allowMonthly,
      // Appeals do not support yearly recurring (yearly is sponsorship-only)
      allowYearly: false,
      allowCustomYearly: false,
      allowFundraising: data.allowFundraising ?? false,
      appealImageUrls: data.appealImageUrls || "[]",
      fundraisingImageUrls: data.fundraisingImageUrls || "[]",
      fundraisingDefaultMessage: data.fundraisingDefaultMessage || null,
      monthlyPricePence: data.monthlyPricePence || null,
      yearlyPricePence: null,
      oneOffPresetAmountsPence: data.oneOffPresetAmountsPence || "[]",
      monthlyPresetAmountsPence: data.monthlyPresetAmountsPence || "[]",
      yearlyPresetAmountsPence: "[]",
    }

    // Only update section fields if provided
    if (data.sectionIntro !== undefined) updateData.sectionIntro = data.sectionIntro
    if (data.sectionNeed !== undefined) updateData.sectionNeed = data.sectionNeed
    if (data.sectionFundsUsed !== undefined) updateData.sectionFundsUsed = data.sectionFundsUsed
    if (data.sectionImpact !== undefined) updateData.sectionImpact = data.sectionImpact

    const appeal = await prisma.appeal.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(appeal)
  } catch (error) {
    console.error("Appeal update error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to update appeal"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

const archiveSchema = z.object({
  archived: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = archiveSchema.parse(body)

    const appeal = await prisma.appeal.update({
      where: { id },
      data: {
        archivedAt: data.archived ? new Date() : null,
      },
    })

    return NextResponse.json(appeal)
  } catch (error) {
    console.error("Appeal archive error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to archive appeal"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params

    // Donations are preserved (Donation.appealId uses onDelete: SetNull).
    // Deleting an appeal will remove dependent records like appeal_products/fundraisers.
    await prisma.appeal.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Appeal delete error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to delete appeal"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
