import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/** Public list of active qurbani countries for the /qurbani donation page */
export async function GET() {
  try {
    const countries = await prisma.qurbaniCountry.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
    })
    return NextResponse.json(countries)
  } catch (e) {
    console.error("Public qurbani list error:", e)
    return NextResponse.json({ error: "Failed to load qurbani options" }, { status: 500 })
  }
}
