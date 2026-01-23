import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const countrySchema = z.object({
  projectType: z.enum(["ORPHANS", "HIFZ", "FAMILIES"]).optional(),
  country: z.string().min(1).optional(),
  pricePence: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = countrySchema.parse(body)

    const country = await prisma.sponsorshipProjectCountry.update({
      where: { id },
      data,
    })

    return NextResponse.json(country)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating sponsorship country:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.sponsorshipProjectCountry.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sponsorship country:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
