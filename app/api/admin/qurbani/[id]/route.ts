import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"

const qurbaniCountrySchema = z.object({
  country: z.string().min(1),
  priceOneSeventhPence: z.number().int().nonnegative().nullable(),
  priceSmallPence: z.number().int().nonnegative().nullable(),
  priceLargePence: z.number().int().nonnegative().nullable(),
  labelOneSeventh: z.string().nullable().optional(),
  labelSmall: z.string().nullable().optional(),
  labelLarge: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
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
    const data = qurbaniCountrySchema.parse(body)
    const country = await prisma.qurbaniCountry.update({
      where: { id },
      data: {
        country: data.country,
        priceOneSeventhPence: data.priceOneSeventhPence ?? null,
        priceSmallPence: data.priceSmallPence ?? null,
        priceLargePence: data.priceLargePence ?? null,
        labelOneSeventh: data.labelOneSeventh ?? null,
        labelSmall: data.labelSmall ?? null,
        labelLarge: data.labelLarge ?? null,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    })
    return NextResponse.json(country)
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues }, { status: 400 })
    }
    console.error("Qurbani country update error:", e)
    return NextResponse.json({ error: "Failed to update qurbani country" }, { status: 500 })
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
    await prisma.qurbaniCountry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Qurbani country delete error:", e)
    return NextResponse.json({ error: "Failed to delete qurbani country" }, { status: 500 })
  }
}
