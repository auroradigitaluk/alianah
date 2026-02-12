import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Valid email is required"),
  phone: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  dateOfBirth: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
})

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim() || ""

    const where = q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { city: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}

    const volunteers = await prisma.volunteer.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    })

    return NextResponse.json(
      volunteers.map((v) => ({
        id: v.id,
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone,
        city: v.city,
        dateOfBirth: v.dateOfBirth?.toISOString() ?? null,
        notes: v.notes,
        status: v.status,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      }))
    )
  } catch (error) {
    console.error("Admin volunteers GET error:", error)
    return NextResponse.json({ error: "Failed to load volunteers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const volunteer = await prisma.volunteer.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || null,
        city: data.city?.trim() || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        notes: data.notes?.trim() || null,
        status: data.status ?? "ACTIVE",
      },
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
    console.error("Admin volunteers POST error:", error)
    return NextResponse.json({ error: "Failed to create volunteer" }, { status: 500 })
  }
}
