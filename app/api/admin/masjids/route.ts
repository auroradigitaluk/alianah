import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const statusOptions = ["ACTIVE", "INACTIVE", "PROSPECT", "ON_HOLD"] as const
const contactMethodOptions = ["EMAIL", "PHONE", "WHATSAPP", "SMS", "ANY"] as const

const masjidSchema = z.object({
  name: z.string().min(1),
  status: z.enum(statusOptions).default("ACTIVE"),
  city: z.string().min(1),
  address: z.string().min(1),
  postcode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactRole: z.string().optional().nullable(),
  secondaryContactName: z.string().optional().nullable(),
  secondaryContactRole: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = masjidSchema.parse(body)

    const masjid = await prisma.masjid.create({
      data: {
        name: data.name.trim(),
        status: data.status,
        city: data.city.trim(),
        address: data.address.trim(),
        postcode: normalizeString(data.postcode),
        country: normalizeString(data.country),
        region: normalizeString(data.region),
        contactName: normalizeString(data.contactName),
        contactRole: normalizeString(data.contactRole),
        secondaryContactName: normalizeString(data.secondaryContactName),
        secondaryContactRole: normalizeString(data.secondaryContactRole),
        phone: normalizeString(data.phone),
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
    console.error("Masjid creation error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to create masjid"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
