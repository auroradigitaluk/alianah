import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { z } from "zod"

const postSchema = z.object({
  content: z.string().min(1, "Note content is required"),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id: taskId } = await params
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { assigneeId: true },
    })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (user.role === "STAFF" && task.assigneeId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { content } = postSchema.parse(body)

    const note = await prisma.taskNote.create({
      data: {
        taskId,
        content: content.trim(),
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      createdBy: note.createdBy,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Task note POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to add note"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
