import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

const patchSchema = z.object({
  description: z.string().trim().min(1, "Daily update is required").max(5000),
  completedAt: z.string().datetime({ offset: true }),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id } = await params
    const existing = await prisma.employeeTaskSubmission.findUnique({
      where: { id },
      select: { id: true, submittedByAdminUserId: true },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (user.role !== "ADMIN" && existing.submittedByAdminUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = patchSchema.parse(body)

    const updated = await prisma.employeeTaskSubmission.update({
      where: { id },
      data: {
        title: "Daily Submission",
        description: parsed.description,
        completedAt: new Date(parsed.completedAt),
      },
      include: {
        submittedBy: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    })

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      completedAt: updated.completedAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      submittedByAdminUserId: updated.submittedByAdminUserId,
      submittedBy: updated.submittedBy,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Employee task submissions PATCH error:", error)
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id } = await params
    const existing = await prisma.employeeTaskSubmission.findUnique({
      where: { id },
      select: { id: true, submittedByAdminUserId: true },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (user.role !== "ADMIN" && existing.submittedByAdminUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.employeeTaskSubmission.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Employee task submissions DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 })
  }
}
