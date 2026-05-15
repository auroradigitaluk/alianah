import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { getDashboardDateRange } from "@/lib/dashboard-date-range"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { searchParams } = request.nextUrl
    const name = searchParams.get("name")?.trim() || undefined
    const country = searchParams.get("country")?.trim() || undefined
    const rangeParam = searchParams.get("range")?.trim() || "all"
    const startParam = searchParams.get("start")
    const endParam = searchParams.get("end")

    const { startDate, endDate } = getDashboardDateRange(rangeParam, startParam, endParam)

    const where: {
      createdAt: { gte: Date; lte: Date }
      qurbaniCountry?: { country?: { contains: string; mode: "insensitive" } }
      donor?: { OR: Array<{ firstName?: { contains: string; mode: "insensitive" }; lastName?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }> }
    } = {
      createdAt: { gte: startDate, lte: endDate },
    }

    if (country) {
      where.qurbaniCountry = { country: { contains: country, mode: "insensitive" } }
    }
    if (name) {
      const term = name
      where.donor = {
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
        ],
      }
    }

    const donations = await prisma.qurbaniDonation.findMany({
      where,
      include: {
        qurbaniCountry: true,
        donor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    })

    return NextResponse.json(donations)
  } catch (e) {
    console.error("Qurbani donations list error:", e)
    return NextResponse.json({ error: "Failed to load qurbani donations" }, { status: 500 })
  }
}
