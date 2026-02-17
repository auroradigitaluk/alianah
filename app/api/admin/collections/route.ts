import { NextRequest, NextResponse } from "next/server"
import { prisma, invalidatePrismaCache } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/admin-auth"
import { z } from "zod"
import { sendCollectionReceiptEmail } from "@/lib/email"
import { isValidEmail } from "@/lib/utils"

const createSchema = z.object({
  masjidId: z.string().nullable().optional().transform((v) => (v && v !== "__none__" ? v : null)),
  otherLocationName: z.string().nullable().optional().transform((v) => (v == null || (typeof v === "string" && !v.trim()) ? null : String(v).trim())),
  appealId: z.string().nullable().optional().transform((v) => (v && v !== "__none__" ? v : null)),
  sadaqahPence: z.number().int().min(0).optional().default(0),
  zakatPence: z.number().int().min(0).optional().default(0),
  lillahPence: z.number().int().min(0).optional().default(0),
  cardPence: z.number().int().min(0).optional().default(0),
  type: z.enum(["JUMMAH", "RAMADAN", "EID", "SPECIAL", "OTHER"]),
  collectedAt: z.string(),
  notes: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v == null || (typeof v === "string" && !v.trim()) ? null : String(v).trim())),
  receiptEmail: z
    .string()
    .optional()
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : undefined)),
})

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
    const collectedAt = new Date(data.collectedAt)

    const totalPence =
      data.sadaqahPence + data.zakatPence + data.lillahPence + data.cardPence
    if (totalPence <= 0) {
      return NextResponse.json({ error: "Enter at least one amount" }, { status: 400 })
    }

    const collection = await prisma.collection.create({
      data: {
        ...(data.masjidId ? { masjid: { connect: { id: data.masjidId } } } : {}),
        otherLocationName: data.otherLocationName ?? null,
        ...(data.appealId ? { appeal: { connect: { id: data.appealId } } } : {}),
        type: data.type,
        collectedAt,
        notes: data.notes ?? null,
        addedBy: { connect: { id: adminUser.id } },
        amountPence: totalPence,
        donationType: "GENERAL",
        sadaqahPence: data.sadaqahPence,
        zakatPence: data.zakatPence,
        lillahPence: data.lillahPence,
        cardPence: data.cardPence,
      },
      include: { masjid: { select: { name: true } } },
    })

    const receiptEmail = data.receiptEmail
    if (receiptEmail) {
      if (!isValidEmail(receiptEmail)) {
        return NextResponse.json({ error: "Invalid receipt email address" }, { status: 400 })
      }
      const locationName =
        collection.masjid?.name ?? data.otherLocationName ?? "Collection"
      try {
        await sendCollectionReceiptEmail({
          recipientEmail: receiptEmail,
          locationName,
          collectionType: data.type,
          collectedAt,
          totalPence,
          sadaqahPence: data.sadaqahPence,
          zakatPence: data.zakatPence,
          lillahPence: data.lillahPence,
          cardPence: data.cardPence,
        })
      } catch (err) {
        console.error("Failed to send collection receipt:", err)
        return NextResponse.json(
          { error: "Collection created but receipt email failed to send" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, collection, count: 1 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      return NextResponse.json({ error: message || "Invalid request" }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("Unknown argument") && (msg.includes("sadaqahPence") || msg.includes("collection.create"))) {
      invalidatePrismaCache()
      return NextResponse.json(
        { error: "Schema was updated. Please try creating the collection again." },
        { status: 503 }
      )
    }
    console.error("Collections POST error:", error)
    return NextResponse.json({ error: msg || "Failed to create collection" }, { status: 500 })
  }
}
