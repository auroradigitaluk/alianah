import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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
  monthlyPricePence: z.number().nullable().optional(),
  yearlyPricePence: z.number().nullable().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = appealSchema.parse(body)

    const updateData: any = {
      title: data.title,
      slug: data.slug,
      summary: data.summary,
      framerUrl: data.framerUrl || null,
      isActive: data.isActive,
      donationTypesEnabled: JSON.stringify(data.donationTypesEnabled),
      allowMonthly: data.allowMonthly,
      allowYearly: data.allowYearly,
      allowFundraising: data.allowFundraising ?? false,
      appealImageUrls: data.appealImageUrls || "[]",
      monthlyPricePence: data.monthlyPricePence || null,
      yearlyPricePence: data.yearlyPricePence || null,
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
