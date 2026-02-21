import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"

const patchSchema = z.object({
  appealId: z.string().min(1).optional(),
  amountPence: z.number().int().positive().optional(),
  description: z.string().trim().optional(),
  country: z
    .union([z.string().trim(), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  itemsDistributed: z
    .union([z.string().trim(), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const data = patchSchema.parse(body)

    const updateData: Parameters<typeof prisma.distribution.update>[0]["data"] = {}
    if (data.appealId !== undefined) updateData.appeal = { connect: { id: data.appealId } }
    if (data.amountPence !== undefined) updateData.amountPence = data.amountPence
    if (data.description !== undefined) updateData.description = data.description.trim()
    if (data.country !== undefined) updateData.country = data.country
    if (data.itemsDistributed !== undefined) updateData.itemsDistributed = data.itemsDistributed

    const distribution = await prisma.distribution.update({
      where: { id },
      data: updateData,
      include: {
        appeal: { select: { id: true, title: true } },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json({
      id: distribution.id,
      appealId: distribution.appealId,
      appealTitle: distribution.appeal.title,
      amountPence: distribution.amountPence,
      description: distribution.description,
      country: distribution.country,
      itemsDistributed: distribution.itemsDistributed,
      createdAt: distribution.createdAt.toISOString(),
      createdById: distribution.createdById,
      createdBy: distribution.createdBy,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      )
    }
    console.error("Distribution PATCH error:", error)
    const message =
      error instanceof Error ? error.message : "Failed to update distribution"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err

  try {
    const { id } = await params
    await prisma.distribution.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Distribution DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete distribution" },
      { status: 500 }
    )
  }
}
