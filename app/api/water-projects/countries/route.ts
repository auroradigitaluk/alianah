import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** Public endpoint: list active water project countries for donation/fundraiser forms. No auth required. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectType = searchParams.get("projectType")

    const where = projectType
      ? {
          projectType: projectType as "WATER_PUMP" | "WATER_WELL" | "WATER_TANK" | "WUDHU_AREA",
          isActive: true,
        }
      : { isActive: true }

    const countries = await prisma.waterProjectCountry.findMany({
      where,
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    })

    return NextResponse.json(countries)
  } catch (error) {
    console.error("Error fetching water project countries:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
