import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/admin-auth"
import { z } from "zod"

const createSchema = z.object({
  masjidId: z.string().nullable(),
  appealId: z.string().nullable(),
  sadaqahPence: z.number().int().min(0).default(0),
  zakatPence: z.number().int().min(0).default(0),
  lillahPence: z.number().int().min(0).default(0),
  cardPence: z.number().int().min(0).default(0),
  type: z.enum(["JUMMAH", "RAMADAN", "EID", "SPECIAL", "OTHER"]),
  collectedAt: z.string(),
  notes: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  let adminUser: { id: string }
  try {
    adminUser = await requireAdminRole(["ADMIN", "STAFF"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const collectedAt = new Date(data.collectedAt)

    const entries: Array<{ amountPence: number; donationType: string }> = []
    if (data.sadaqahPence > 0) entries.push({ amountPence: data.sadaqahPence, donationType: "SADAQAH" })
    if (data.zakatPence > 0) entries.push({ amountPence: data.zakatPence, donationType: "ZAKAT" })
    if (data.lillahPence > 0) entries.push({ amountPence: data.lillahPence, donationType: "LILLAH" })
    if (data.cardPence > 0) entries.push({ amountPence: data.cardPence, donationType: "GENERAL" })

    if (entries.length === 0) {
      return NextResponse.json({ error: "Enter at least one amount" }, { status: 400 })
    }

    const base = {
      masjidId: data.masjidId || null,
      appealId: data.appealId || null,
      type: data.type,
      collectedAt,
      notes: data.notes || null,
      addedByAdminUserId: adminUser.id,
    }

    const collections = await prisma.$transaction(
      entries.map((e) =>
        prisma.collection.create({
          data: { ...base, amountPence: e.amountPence, donationType: e.donationType },
        })
      )
    )

    return NextResponse.json({ success: true, collections, count: collections.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Collections POST error:", error)
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 })
  }
}
