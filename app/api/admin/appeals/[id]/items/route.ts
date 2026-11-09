import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"

/**
 * Appeal Items (e.g. Winter Appeal: blankets, tents, jackets).
 * Uses the existing `products` + `appeal_products` tables — no schema changes.
 * Each item = one FIXED-price Product linked to the appeal as ONE_OFF.
 */

const FREQ = "ONE_OFF"

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

async function listItems(appealId: string) {
  const rows = await prisma.appealProduct.findMany({
    where: { appealId, frequency: FREQ },
    orderBy: { sortOrder: "asc" },
    include: { product: { include: { _count: { select: { donations: true } } } } },
  })
  return rows.map((r) => ({
    productId: r.productId,
    sortOrder: r.sortOrder,
    name: r.product.name,
    slug: r.product.slug,
    unitLabel: r.product.unitLabel,
    pricePence: r.product.fixedAmountPence ?? 0,
    isActive: r.product.isActive,
    donationCount: r.product._count.donations,
  }))
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  const { id } = await params
  return NextResponse.json({ items: await listItems(id) })
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  pricePence: z.number().int().positive(),
  unitLabel: z.string().trim().max(40).optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params
    const data = createSchema.parse(await req.json())
    const appeal = await prisma.appeal.findUnique({ where: { id }, select: { slug: true } })
    if (!appeal) return NextResponse.json({ error: "Appeal not found" }, { status: 404 })

    // Unique product slug: <appeal-slug>-<item-name>[-n]
    const base = `${appeal.slug}-${slugify(data.name)}`
    let slug = base
    for (let n = 2; await prisma.product.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`

    const maxSort = await prisma.appealProduct.aggregate({
      where: { appealId: id, frequency: FREQ },
      _max: { sortOrder: true },
    })

    await prisma.product.create({
      data: {
        name: data.name,
        slug,
        type: "FIXED",
        unitLabel: data.unitLabel || "item",
        fixedAmountPence: data.pricePence,
        isActive: true,
        appeals: {
          create: {
            appealId: id,
            frequency: FREQ,
            presetAmountsPence: "[]",
            allowCustom: false,
            sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          },
        },
      },
    })
    return NextResponse.json({ items: await listItems(id) })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid item" }, { status: 400 })
    console.error("Create appeal item failed:", e)
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 })
  }
}

const updateSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  pricePence: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params
    const data = updateSchema.parse(await req.json())
    const link = await prisma.appealProduct.findUnique({
      where: { appealId_productId_frequency: { appealId: id, productId: data.productId, frequency: FREQ } },
    })
    if (!link) return NextResponse.json({ error: "Item not found" }, { status: 404 })

    await prisma.product.update({
      where: { id: data.productId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.pricePence !== undefined ? { fixedAmountPence: data.pricePence } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })
    if (data.sortOrder !== undefined) {
      await prisma.appealProduct.update({
        where: { appealId_productId_frequency: { appealId: id, productId: data.productId, frequency: FREQ } },
        data: { sortOrder: data.sortOrder },
      })
    }
    return NextResponse.json({ items: await listItems(id) })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Invalid update" }, { status: 400 })
    console.error("Update appeal item failed:", e)
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params
    const productId = req.nextUrl.searchParams.get("productId")
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { _count: { select: { donations: true, recurringDonations: true } } },
    })
    if (!product) return NextResponse.json({ error: "Item not found" }, { status: 404 })

    // Never hard-delete an item that has donations — keep reporting intact, just hide it.
    if (product._count.donations > 0 || product._count.recurringDonations > 0) {
      await prisma.product.update({ where: { id: productId }, data: { isActive: false } })
    } else {
      await prisma.product.delete({ where: { id: productId } }) // cascades appeal_products link
    }
    return NextResponse.json({ items: await listItems(id) })
  } catch (e) {
    console.error("Delete appeal item failed:", e)
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}
