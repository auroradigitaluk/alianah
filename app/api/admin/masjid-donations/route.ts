import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"
import { backingAppealData, getMasjidStats, isBackingAppealSlugTaken, slugify } from "@/lib/masjid"

const masjidSchema = z.object({
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

export async function GET() {
  const [, err] = await requireAdminRoleSafe(["ADMIN", "STAFF"])
  if (err) return err
  try {
    const projects = await prisma.masjidProject.findMany({
      orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
    })
    const withStats = await Promise.all(
      projects.map(async (p) => ({ ...p, stats: await getMasjidStats(p.appealId) }))
    )
    return NextResponse.json(withStats)
  } catch (error) {
    console.error("Error fetching masjid projects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const data = masjidSchema.parse(await request.json())
    const slug = slugify(data.slug || data.country)
    if (!slug) {
      return NextResponse.json({ error: "A valid slug or country is required" }, { status: 400 })
    }

    const existing = await prisma.masjidProject.findUnique({ where: { slug } })
    if (existing || (await isBackingAppealSlugTaken(slug))) {
      return NextResponse.json({ error: "A masjid country with this slug already exists" }, { status: 409 })
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

    const maxOrder = await prisma.masjidProject.aggregate({ _max: { sortOrder: true } })
    const nextSortOrder = (maxOrder._max.sortOrder ?? 0) + 1
    const appealMaxOrder = await prisma.appeal.aggregate({ _max: { sortOrder: true } })

    const project = await prisma.$transaction(async (tx) => {
      const appeal = await tx.appeal.create({
        data: { ...backingAppealData(content), sortOrder: (appealMaxOrder._max.sortOrder ?? 0) + 1 },
      })
      return tx.masjidProject.create({
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
          sortOrder: nextSortOrder,
          appealId: appeal.id,
        },
      })
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Masjid project creation error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Failed to create masjid country"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
