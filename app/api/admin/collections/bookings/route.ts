import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRole, requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"

const createSchema = z.object({
  locationName: z.string().min(1, "Location name is required").trim(),
  addressLine1: z.string().min(1, "First line of address is required").trim(),
  postcode: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && !v.trim()) ? null : String(v).trim())),
  city: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && !v.trim()) ? null : String(v).trim())),
  country: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && !v.trim()) ? null : String(v).trim())),
  bookedByName: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && !v.trim()) ? null : String(v).trim())),
  scheduledAt: z.string(), // ISO datetime
  notes: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && !v.trim()) ? null : String(v).trim())),
})

export async function GET() {
  const [user, err] = await requireAdminRoleSafe(["ADMIN", "STAFF", "VIEWER"])
  if (err) return err
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const bookings = await prisma.collectionBooking.findMany({
      where: { scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      include: {
        addedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    })
    return NextResponse.json({ bookings })
  } catch (error) {
    console.error("Collection bookings GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let adminUser: { id: string }
  try {
    adminUser = await requireAdminRole(["ADMIN", "STAFF"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const scheduledAt = new Date(data.scheduledAt)

    const booking = await prisma.collectionBooking.create({
      data: {
        locationName: data.locationName,
        addressLine1: data.addressLine1,
        postcode: data.postcode ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        bookedByName: data.bookedByName ?? null,
        scheduledAt,
        notes: data.notes ?? null,
        addedBy: { connect: { id: adminUser.id } },
      },
    })

    return NextResponse.json({ success: true, booking })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      return NextResponse.json({ error: message || "Invalid request" }, { status: 400 })
    }
    console.error("Collection bookings POST error:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}
