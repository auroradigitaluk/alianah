import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/admin-auth"
import { z } from "zod"

const createSchema = z.object({
  masjidId: z.string().nullable(),
  appealId: z.string().nullable(),
  amountPence: z.number().int().positive(),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
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

    const collection = await prisma.collection.create({
      data: {
        masjidId: data.masjidId || null,
        appealId: data.appealId || null,
        amountPence: data.amountPence,
        donationType: data.donationType,
        type: data.type,
        collectedAt,
        notes: data.notes || null,
        addedByAdminUserId: adminUser.id,
      },
    })

    return NextResponse.json(collection)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Collections POST error:", error)
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 })
  }
}
