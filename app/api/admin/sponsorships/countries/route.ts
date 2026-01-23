import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const countrySchema = z.object({
  projectType: z.enum(["ORPHANS", "HIFZ", "FAMILIES"]),
  country: z.string().min(1),
  pricePence: z.number().int().positive(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = countrySchema.parse(body)

    const country = await prisma.sponsorshipProjectCountry.create({
      data,
    })

    return NextResponse.json(country)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating sponsorship country:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectType = searchParams.get("projectType")

    const where = projectType
      ? { projectType: projectType as "ORPHANS" | "HIFZ" | "FAMILIES", isActive: true }
      : { isActive: true }

    const countries = await prisma.sponsorshipProjectCountry.findMany({
      where,
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    })

    return NextResponse.json(countries)
  } catch (error) {
    console.error("Error fetching sponsorship countries:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
