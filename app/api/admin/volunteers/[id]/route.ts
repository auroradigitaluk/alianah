import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { z } from "zod"

const patchSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params
    const body = await request.json()
    const data = patchSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim()
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim()
    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase()
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null
    if (data.city !== undefined) updateData.city = data.city?.trim() || null
    if (data.dateOfBirth !== undefined)
      updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null
    if (data.status !== undefined) updateData.status = data.status

    const volunteer = await prisma.volunteer.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      id: volunteer.id,
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      email: volunteer.email,
      phone: volunteer.phone,
      city: volunteer.city,
      dateOfBirth: volunteer.dateOfBirth?.toISOString() ?? null,
      notes: volunteer.notes,
      status: volunteer.status,
      createdAt: volunteer.createdAt.toISOString(),
      updatedAt: volunteer.updatedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      )
    }
    console.error("Volunteer PATCH error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update volunteer" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params
    await prisma.volunteer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Volunteer DELETE error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete volunteer" },
      { status: 500 }
    )
  }
}
