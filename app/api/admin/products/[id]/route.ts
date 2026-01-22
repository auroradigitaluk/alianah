import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.enum(["FIXED", "VARIABLE"]),
  unitLabel: z.string().min(1),
  fixedAmountPence: z.number().int().nullable().optional(),
  minAmountPence: z.number().int().nullable().optional(),
  maxAmountPence: z.number().int().nullable().optional(),
  isActive: z.boolean(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = productSchema.parse(body)

    const product = await prisma.product.update({
      where: { id },
      data,
    })

    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}
