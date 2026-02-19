import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"

const statusOptions = ["ACTIVE", "INACTIVE", "PROSPECT", "ON_HOLD"] as const
const contactMethodOptions = ["EMAIL", "PHONE", "WHATSAPP", "SMS", "ANY"] as const

const masjidSchema = z.object({
  name: z.string().min(1),
  status: z.enum(statusOptions).default("ACTIVE"),
  city: z.string().min(1),
  address: z.string().min(1),
  postcode: z.string().min(1, "Postcode is required"),
  country: z.string().min(1, "Country is required"),
  region: z.string().optional().nullable(),
  contactName: z.string().min(1, "Contact name is required"),
  contactRole: z.string().min(1, "Contact role is required"),
  secondaryContactName: z.string().optional().nullable(),
  secondaryContactRole: z.string().optional().nullable(),
  phone: z.string().min(1, "Phone is required"),
  phoneAlt: z.string().optional().nullable(),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  emailAlt: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  website: z.string().optional().nullable(),
  preferredContactMethod: z.enum(contactMethodOptions).optional().nullable(),
  lastContactedAt: z.union([z.string(), z.null(), z.undefined()]),
  nextFollowUpAt: z.union([z.string(), z.null(), z.undefined()]),
  notes: z.string().optional().nullable(),
})

const normalizeString = (value?: string | null) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value")
  }
  return date
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminRoleSafe(["ADMIN", "STAFF"])
  if (err) return err
  try {
    const { id } = await params
    if (user.role === "STAFF") {
      const existing = await prisma.masjid.findUnique({
        where: { id },
        select: { addedByAdminUserId: true },
      })
      if (!existing || existing.addedByAdminUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    const body = await request.json()
    const data = masjidSchema.parse(body)

    const masjid = await prisma.masjid.update({
      where: { id },
      data: {
        name: data.name.trim(),
        status: data.status,
        city: data.city.trim(),
        address: data.address.trim(),
        postcode: data.postcode.trim(),
        country: data.country.trim(),
        region: normalizeString(data.region),
        contactName: data.contactName.trim(),
        contactRole: data.contactRole.trim(),
        secondaryContactName: normalizeString(data.secondaryContactName),
        secondaryContactRole: normalizeString(data.secondaryContactRole),
        phone: data.phone.trim(),
        phoneAlt: normalizeString(data.phoneAlt),
        email: normalizeString(data.email),
        emailAlt: normalizeString(data.emailAlt),
        website: normalizeString(data.website),
        preferredContactMethod: data.preferredContactMethod ?? null,
        lastContactedAt: parseDate(data.lastContactedAt),
        nextFollowUpAt: parseDate(data.nextFollowUpAt),
        notes: normalizeString(data.notes),
      },
    })

    return NextResponse.json(masjid)
  } catch (error) {
    console.error("Masjid update error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to update masjid"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminRoleSafe(["ADMIN", "STAFF"])
  if (err) return err
  try {
    const { id } = await params
    if (user.role === "STAFF") {
      const existing = await prisma.masjid.findUnique({
        where: { id },
        select: { addedByAdminUserId: true },
      })
      if (!existing || existing.addedByAdminUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    await prisma.auditLog.create({
      data: {
        adminUserId: user.id,
        action: "DELETE",
        entityType: "masjid",
        entityId: id,
      },
    })
    await prisma.masjid.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Masjid delete error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to delete masjid"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
