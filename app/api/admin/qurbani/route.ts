import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe, requireAdminRoleSafe } from "@/lib/admin-auth"
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

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const countries = await prisma.qurbaniCountry.findMany({
      orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
      include: {
        _count: { select: { donations: true } },
      },
    })
    return NextResponse.json(countries)
  } catch (e) {
    console.error("Qurbani countries list error:", e)
    return NextResponse.json({ error: "Failed to load qurbani countries" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const body = await request.json()
    const data = qurbaniCountrySchema.parse(body)
    const country = await prisma.qurbaniCountry.create({
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
    console.error("Qurbani country create error:", e)
    return NextResponse.json({ error: "Failed to create qurbani country" }, { status: 500 })
  }
}
