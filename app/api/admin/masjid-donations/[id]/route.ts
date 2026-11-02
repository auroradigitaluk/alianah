import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"
import {
  MASJID_APPEAL_SLUG_PREFIX,
  backingAppealUpdateData,
  isBackingAppealSlugTaken,
  slugify,
} from "@/lib/masjid"

const updateSchema = z.object({
  country: z.string().min(1),
  slug: z.string().optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().nullable().optional(),
  priceFromPence: z.number().int().positive(),
  priceToPence: z.number().int().positive().nullable().optional(),
  priceNote: z.string().nullable().optional(),
  imageUrls: z.array(z.string()).optional().default([]),
  fundraisingImageUrls: z.array(z.string()).optional().default([]),
  fundraisingDefaultMessage: z.string().nullable().optional(),
  allowFundraising: z.boolean().optional().default(true),
  allowPartialDonations: z.boolean().optional().default(true),
  framerUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
  isActive: z.boolean().optional().default(true),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN", "STAFF"])
  if (err) return err
  try {
    const { id } = await params
    const project = await prisma.masjidProject.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching masjid project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params
    const existing = await prisma.masjidProject.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const data = updateSchema.parse(await request.json())
    const slug = slugify(data.slug || data.country)
    if (!slug) {
      return NextResponse.json({ error: "A valid slug or country is required" }, { status: 400 })
    }
    if (slug !== existing.slug) {
      const clash = await prisma.masjidProject.findUnique({ where: { slug } })
      if (clash || (await isBackingAppealSlugTaken(slug, existing.appealId))) {
        return NextResponse.json({ error: "A masjid country with this slug already exists" }, { status: 409 })
      }
    }

    const content = {
      title: data.title,
      slug,
      summary: data.summary,
      imageUrls: JSON.stringify(data.imageUrls),
      fundraisingImageUrls: JSON.stringify(data.fundraisingImageUrls),
      fundraisingDefaultMessage: data.fundraisingDefaultMessage ?? null,
      allowFundraising: data.allowFundraising,
      priceFromPence: data.priceFromPence,
      framerUrl: data.framerUrl || null,
      isActive: data.isActive,
    }

    const project = await prisma.$transaction(async (tx) => {
      await tx.appeal.update({
        where: { id: existing.appealId },
        data: backingAppealUpdateData(content),
      })
      return tx.masjidProject.update({
        where: { id },
        data: {
          country: data.country,
          slug,
          title: data.title,
          summary: data.summary,
          content: data.content ?? null,
          priceFromPence: data.priceFromPence,
          priceToPence: data.priceToPence ?? null,
          priceNote: data.priceNote ?? null,
          imageUrls: content.imageUrls,
          fundraisingImageUrls: content.fundraisingImageUrls,
          fundraisingDefaultMessage: content.fundraisingDefaultMessage,
          allowFundraising: data.allowFundraising,
          allowPartialDonations: data.allowPartialDonations,
          framerUrl: content.framerUrl,
          isActive: data.isActive,
        },
      })
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Masjid project update error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Failed to update masjid country"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Delete the masjid country row and archive its backing appeal. The appeal is
 * never hard-deleted (it may hold donations) — it is deactivated and archived so
 * no donation data is lost. Its slug is suffixed so the country can be re-added later.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params
    const existing = await prisma.masjidProject.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.masjidProject.delete({ where: { id } })
      await tx.appeal.update({
        where: { id: existing.appealId },
        data: {
          isActive: false,
          allowFundraising: false,
          archivedAt: new Date(),
          slug: `${MASJID_APPEAL_SLUG_PREFIX}${existing.slug}-archived-${Date.now()}`,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Masjid project delete error:", error)
    return NextResponse.json({ error: "Failed to delete masjid country" }, { status: 500 })
  }
}
