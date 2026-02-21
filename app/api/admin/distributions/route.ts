import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"

const createSchema = z.object({
  appealId: z.string().min(1, "Appeal is required"),
  amountPence: z.number().int().positive("Amount must be positive"),
  description: z.string().trim().optional().transform((v) => v ?? ""),
  country: z.string().trim().optional().transform((v) => (v === "" ? null : v ?? null)),
  itemsDistributed: z.string().trim().optional().transform((v) => (v === "" ? null : v ?? null)),
})

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err

  try {
    const { searchParams } = new URL(request.url)
    const appealId = searchParams.get("appealId") ?? undefined

    const distributions = await prisma.distribution.findMany({
      where: appealId ? { appealId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        appeal: { select: { id: true, title: true } },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json(
      distributions.map((d) => ({
        id: d.id,
        appealId: d.appealId,
        appealTitle: d.appeal.title,
        amountPence: d.amountPence,
        description: d.description,
        country: d.country,
        itemsDistributed: d.itemsDistributed,
        createdAt: d.createdAt.toISOString(),
        createdById: d.createdById,
        createdBy: d.createdBy,
      }))
    )
  } catch (error) {
    console.error("Distributions GET error:", error)
    return NextResponse.json(
      { error: "Failed to load distributions" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const [user, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const distribution = await prisma.distribution.create({
      data: {
        appealId: data.appealId,
        amountPence: data.amountPence,
        description: data.description.trim(),
        country: data.country ?? null,
        itemsDistributed: data.itemsDistributed ?? null,
        createdById: user.id,
      },
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
    console.error("Distributions POST error:", error)
    return NextResponse.json(
      { error: "Failed to create distribution" },
      { status: 500 }
    )
  }
}
