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
  fundraisingImageUrls: z.string().optional(),
  monthlyPricePence: z.number().nullable().optional(),
  yearlyPricePence: z.number().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = appealSchema.parse(body)

    const appeal = await prisma.appeal.create({
      data: {
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        sectionIntro: data.sectionIntro ?? "",
        sectionNeed: data.sectionNeed ?? "",
        sectionFundsUsed: data.sectionFundsUsed ?? "",
        sectionImpact: data.sectionImpact ?? "",
        framerUrl: data.framerUrl || null,
        isActive: data.isActive,
        donationTypesEnabled: JSON.stringify(data.donationTypesEnabled),
        allowMonthly: data.allowMonthly,
        allowYearly: data.allowYearly,
        allowFundraising: data.allowFundraising ?? false,
        appealImageUrls: data.appealImageUrls || "[]",
        fundraisingImageUrls: data.fundraisingImageUrls || "[]",
        monthlyPricePence: data.monthlyPricePence || null,
        yearlyPricePence: data.yearlyPricePence || null,
      },
    })

    return NextResponse.json(appeal)
  } catch (error) {
    console.error("Appeal creation error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to create appeal"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
