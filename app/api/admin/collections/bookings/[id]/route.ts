import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"

const patchSchema = z.object({
  locationName: z.string().min(1).trim().optional(),
  addressLine1: z.string().min(1).trim().optional(),
  postcode: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  bookedByName: z.string().nullable().optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminRoleSafe(["ADMIN", "STAFF"])
  if (err) return err
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const data = patchSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (data.locationName !== undefined) updateData.locationName = data.locationName
    if (data.addressLine1 !== undefined) updateData.addressLine1 = data.addressLine1
    if (data.postcode !== undefined) updateData.postcode = data.postcode
    if (data.city !== undefined) updateData.city = data.city
    if (data.country !== undefined) updateData.country = data.country
    if (data.bookedByName !== undefined) updateData.bookedByName = data.bookedByName
    if (data.scheduledAt !== undefined) updateData.scheduledAt = new Date(data.scheduledAt)
    if (data.notes !== undefined) updateData.notes = data.notes

    await prisma.collectionBooking.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      return NextResponse.json({ error: message || "Invalid request" }, { status: 400 })
    }
    console.error("Collection booking PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminRoleSafe(["ADMIN", "STAFF"])
  if (err) return err
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params
    const existing = await prisma.collectionBooking.findUnique({
      where: { id },
      select: { addedByAdminUserId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }
    await prisma.collectionBooking.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Collection booking DELETE error:", error)
    const message = error instanceof Error ? error.message : "Failed to delete booking"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
