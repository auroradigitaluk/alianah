import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

type SizeBreakdown = Record<
  "ONE_SEVENTH" | "SMALL" | "LARGE",
  { totalPence: number; count: number }
>

function emptyBySize(): SizeBreakdown {
  return {
    ONE_SEVENTH: { totalPence: 0, count: 0 },
    SMALL: { totalPence: 0, count: 0 },
    LARGE: { totalPence: 0, count: 0 },
  }
}

/** Calendar-year totals per qurbani country (same notion of “this year” as other admin stats). */
export async function GET() {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err

  try {
    const now = new Date()
    const year = now.getFullYear()
    const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999)

    const [countries, grouped, byCountryAndSize] = await Promise.all([
      prisma.qurbaniCountry.findMany({
        orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
        select: { id: true, country: true, sortOrder: true },
      }),
      prisma.qurbaniDonation.groupBy({
        by: ["qurbaniCountryId"],
        where: {
          createdAt: { gte: startOfYear, lte: endOfYear },
        },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
      prisma.qurbaniDonation.groupBy({
        by: ["qurbaniCountryId", "size"],
        where: {
          createdAt: { gte: startOfYear, lte: endOfYear },
        },
        _sum: { amountPence: true },
        _count: { _all: true },
      }),
    ])

    const byId = new Map(grouped.map((g) => [g.qurbaniCountryId, g]))

    const breakdownByCountryId = new Map<string, SizeBreakdown>()
    for (const c of countries) {
      breakdownByCountryId.set(c.id, emptyBySize())
    }
    for (const row of byCountryAndSize) {
      const b = breakdownByCountryId.get(row.qurbaniCountryId)
      if (!b) continue
      const key = row.size as keyof SizeBreakdown
      if (key in b) {
        b[key] = {
          totalPence: row._sum.amountPence ?? 0,
          count: row._count._all,
        }
      }
    }

    const rows = countries.map((c) => {
      const g = byId.get(c.id)
      return {
        id: c.id,
        country: c.country,
        sortOrder: c.sortOrder,
        totalPence: g?._sum.amountPence ?? 0,
        donationCount: g?._count._all ?? 0,
        bySize: breakdownByCountryId.get(c.id) ?? emptyBySize(),
      }
    })

    const grandTotalPence = rows.reduce((s, r) => s + r.totalPence, 0)

    return NextResponse.json({
      year,
      grandTotalPence,
      countries: rows,
    })
  } catch (e) {
    console.error("Qurbani year stats error:", e)
    return NextResponse.json({ error: "Failed to load qurbani year stats" }, { status: 500 })
  }
}
