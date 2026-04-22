import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

const createSchema = z.object({
  description: z.string().trim().min(1, "Daily update is required").max(5000),
  completedAt: z.string().datetime({ offset: true }),
})

export async function GET(request: NextRequest) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim()
    const submittedById = searchParams.get("submittedById")?.trim()
    const effectiveSubmittedById = user.role === "STAFF" ? user.id : submittedById
    const completedDate = searchParams.get("completedDate")?.trim()

    let completedAtFilter: { gte: Date; lte: Date } | undefined
    if (completedDate) {
      const start = new Date(`${completedDate}T00:00:00.000Z`)
      const end = new Date(`${completedDate}T23:59:59.999Z`)
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        completedAtFilter = { gte: start, lte: end }
      }
    }

    const submissions = await prisma.employeeTaskSubmission.findMany({
      where: {
        ...(effectiveSubmittedById ? { submittedByAdminUserId: effectiveSubmittedById } : {}),
        ...(completedAtFilter ? { completedAt: completedAtFilter } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        submittedBy: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    })

    return NextResponse.json(
      submissions.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        completedAt: row.completedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        submittedByAdminUserId: row.submittedByAdminUserId,
        submittedBy: row.submittedBy,
      }))
    )
  } catch (error) {
    console.error("Employee task submissions GET error:", error)
    return NextResponse.json({ error: "Failed to load submissions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await request.json()
    const parsed = createSchema.parse(body)

    const created = await prisma.employeeTaskSubmission.create({
      data: {
        title: "Daily Submission",
        description: parsed.description,
        completedAt: new Date(parsed.completedAt),
        submittedByAdminUserId: user.id,
      },
      include: {
        submittedBy: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    })

    return NextResponse.json({
      id: created.id,
      title: created.title,
      description: created.description,
      completedAt: created.completedAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      submittedByAdminUserId: created.submittedByAdminUserId,
      submittedBy: created.submittedBy,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Employee task submissions POST error:", error)
    return NextResponse.json({ error: "Failed to submit completed task" }, { status: 500 })
  }
}
