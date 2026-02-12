import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { formatAdminUserName } from "@/lib/utils"
import { z } from "zod"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        masjid: { select: { name: true } },
        appeal: { select: { title: true } },
        addedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    })
    if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (user.role === "STAFF" && collection.addedByAdminUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({
      id: collection.id,
      amountPence: collection.amountPence,
      donationType: collection.donationType,
      sadaqahPence: collection.sadaqahPence,
      zakatPence: collection.zakatPence,
      lillahPence: collection.lillahPence,
      cardPence: collection.cardPence,
      type: collection.type,
      collectedAt: collection.collectedAt,
      masjidId: collection.masjidId,
      otherLocationName: collection.otherLocationName,
      appealId: collection.appealId,
      masjid: collection.masjid,
      appeal: collection.appeal,
      notes: collection.notes,
      addedByName: formatAdminUserName(collection.addedBy),
    })
  } catch (error) {
    console.error("Collection GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const patchSchema = z.object({
  masjidId: z.string().nullable().optional(),
  otherLocationName: z.string().nullable().optional().transform((v) => (v == null || (typeof v === "string" && !v.trim()) ? null : String(v).trim())),
  appealId: z.string().nullable().optional(),
  amountPence: z.number().int().min(0).optional(),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]).optional(),
  sadaqahPence: z.number().int().min(0).optional(),
  zakatPence: z.number().int().min(0).optional(),
  lillahPence: z.number().int().min(0).optional(),
  cardPence: z.number().int().min(0).optional(),
  type: z.enum(["JUMMAH", "RAMADAN", "EID", "SPECIAL", "OTHER"]).optional(),
  collectedAt: z.string().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const data = patchSchema.parse(body)

    if (user.role === "STAFF") {
      const existing = await prisma.collection.findUnique({
        where: { id },
        select: { addedByAdminUserId: true },
      })
      if (!existing || existing.addedByAdminUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    const updateData: Record<string, unknown> = {}
    if (data.masjidId !== undefined) updateData.masjidId = data.masjidId
    if (data.otherLocationName !== undefined) updateData.otherLocationName = data.otherLocationName
    if (data.appealId !== undefined) updateData.appealId = data.appealId
    if (data.type !== undefined) updateData.type = data.type
    if (data.collectedAt !== undefined) updateData.collectedAt = new Date(data.collectedAt)
    if (data.notes !== undefined) updateData.notes = data.notes

    if (
      data.sadaqahPence !== undefined ||
      data.zakatPence !== undefined ||
      data.lillahPence !== undefined ||
      data.cardPence !== undefined
    ) {
      const sadaqah = data.sadaqahPence ?? undefined
      const zakat = data.zakatPence ?? undefined
      const lillah = data.lillahPence ?? undefined
      const card = data.cardPence ?? undefined
      const existing = await prisma.collection.findUnique({
        where: { id },
        select: { sadaqahPence: true, zakatPence: true, lillahPence: true, cardPence: true },
      })
      if (existing) {
        updateData.sadaqahPence = sadaqah ?? existing.sadaqahPence
        updateData.zakatPence = zakat ?? existing.zakatPence
        updateData.lillahPence = lillah ?? existing.lillahPence
        updateData.cardPence = card ?? existing.cardPence
        const total =
          (updateData.sadaqahPence as number) +
          (updateData.zakatPence as number) +
          (updateData.lillahPence as number) +
          (updateData.cardPence as number)
        updateData.amountPence = total
        updateData.donationType = "GENERAL"
      }
    } else if (data.amountPence !== undefined || data.donationType !== undefined) {
      if (data.amountPence !== undefined) updateData.amountPence = data.amountPence
      if (data.donationType !== undefined) updateData.donationType = data.donationType
    }

    await prisma.collection.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Collection PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const { id } = await params
    if (user.role === "STAFF") {
      const existing = await prisma.collection.findUnique({
        where: { id },
        select: { addedByAdminUserId: true },
      })
      if (!existing || existing.addedByAdminUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    await prisma.collection.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Collection DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
