import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const appealSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string(),
  framerUrl: z.string().url().nullable().optional(),
  isActive: z.boolean(),
  donationTypesEnabled: z.array(z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"])),
  allowMonthly: z.boolean(),
  allowYearly: z.boolean(),
  allowFundraising: z.boolean().optional().default(false),
  appealImageUrls: z.string().optional(),
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
        framerUrl: data.framerUrl || null,
        isActive: data.isActive,
        donationTypesEnabled: data.donationTypesEnabled,
        allowMonthly: data.allowMonthly,
        allowYearly: data.allowYearly,
        allowFundraising: data.allowFundraising ?? false,
        appealImageUrls: data.appealImageUrls || "[]",
        monthlyPricePence: data.monthlyPricePence || null,
        yearlyPricePence: data.yearlyPricePence || null,
      },
    })

    return NextResponse.json(appeal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create appeal" }, { status: 500 })
  }
}
