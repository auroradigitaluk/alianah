import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe, requireAdminRoleSafe } from "@/lib/admin-auth"
import { formatAdminUserName } from "@/lib/utils"
import { z } from "zod"

const adminPatchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assigneeId: z.string().min(1).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  dueDate: z.string().nullable().optional(),
})

const staffPatchSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  staffNote: z.string().nullable().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (user.role === "STAFF" && task.assigneeId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate?.toISOString() ?? null,
      staffNote: task.staffNote,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assigneeId: task.assigneeId,
      assignee: task.assignee,
      assigneeName: formatAdminUserName(task.assignee),
      createdById: task.createdById,
      createdBy: task.createdBy,
      createdByName: task.createdBy ? formatAdminUserName(task.createdBy) : null,
    })
  } catch (error) {
    console.error("Task GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const existing = await prisma.task.findUnique({
      where: { id },
      select: { assigneeId: true },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const isStaff = user.role === "STAFF"
    if (isStaff && existing.assigneeId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (user.role === "ADMIN") {
      const body = await request.json()
      const data = adminPatchSchema.parse(body)
      const task = await prisma.task.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.dueDate !== undefined && {
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
          }),
        },
        include: {
          assignee: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      })
      return NextResponse.json({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        dueDate: task.dueDate?.toISOString() ?? null,
        staffNote: task.staffNote,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        assigneeId: task.assigneeId,
        assignee: task.assignee,
        createdById: task.createdById,
        createdBy: task.createdBy,
      })
    }

    const body = await request.json()
    const data = staffPatchSchema.parse(body)
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.staffNote !== undefined && { staffNote: data.staffNote }),
      },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })
    return NextResponse.json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate?.toISOString() ?? null,
      staffNote: task.staffNote,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assigneeId: task.assigneeId,
      assignee: task.assignee,
      createdById: task.createdById,
      createdBy: task.createdBy,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Task PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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
    await prisma.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Task DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
