import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const countrySchema = z.object({
  projectType: z.enum(["WATER_PUMP", "WATER_WELL", "WATER_TANK", "WUDHU_AREA"]),
  country: z.string().min(1),
  pricePence: z.number().int().positive(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = countrySchema.parse(body)

    const country = await prisma.waterProjectCountry.create({
      data,
    })

    return NextResponse.json(country)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating country:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectType = searchParams.get("projectType")

    const where = projectType ? { projectType: projectType as any, isActive: true } : { isActive: true }

    const countries = await prisma.waterProjectCountry.findMany({
      where,
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    })

    return NextResponse.json(countries)
  } catch (error) {
    console.error("Error fetching countries:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
