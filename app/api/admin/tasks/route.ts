import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe, requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  assigneeId: z.string().min(1, "Assignee is required"),
  dueDate: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const assigneeId = searchParams.get("assigneeId") ?? undefined
    const status = searchParams.get("status") ?? undefined
    const view = searchParams.get("view") ?? undefined // "active" | "completed"

    const where: { assigneeId?: string; status?: string | { in: string[] } } = {}
    if (user.role === "STAFF") {
      where.assigneeId = user.id
    } else {
      if (assigneeId) where.assigneeId = assigneeId
    }
    if (view === "active") {
      where.status =
        status === "TODO" || status === "IN_PROGRESS"
          ? status
          : { in: ["TODO", "IN_PROGRESS"] }
    } else if (view === "completed") {
      where.status = "DONE"
    } else if (status) {
      where.status = status
    }

    const orderBy = view === "completed"
      ? [{ updatedAt: "desc" as const }]
      : [{ createdAt: "desc" as const }]

    const tasks = await prisma.task.findMany({
      where,
      orderBy,
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        dueDate: t.dueDate?.toISOString() ?? null,
        staffNote: t.staffNote,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        assigneeId: t.assigneeId,
        assignee: t.assignee,
        createdById: t.createdById,
        createdBy: t.createdBy,
      }))
    )
  } catch (error) {
    console.error("Tasks GET error:", error)
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 })
  }
}

const staffCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const parsed =
      user.role === "STAFF"
        ? staffCreateSchema.parse(body)
        : createSchema.parse(body)
    const assigneeId =
      user.role === "STAFF" ? user.id : (parsed as z.infer<typeof createSchema>).assigneeId

    const task = await prisma.task.create({
      data: {
        title: parsed.title,
        description: parsed.description ?? null,
        assigneeId,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        status: "TODO",
        createdById: user.id,
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
    console.error("Tasks POST error:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
