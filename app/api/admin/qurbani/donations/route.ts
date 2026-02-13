import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { searchParams } = request.nextUrl
    const name = searchParams.get("name")?.trim() || undefined
    const country = searchParams.get("country")?.trim() || undefined
    const size = searchParams.get("size")?.trim() || undefined

    const where: {
      qurbaniCountry?: { country?: { contains: string; mode: "insensitive" } }
      size?: string
      donor?: { OR: Array<{ firstName?: { contains: string; mode: "insensitive" }; lastName?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }> }
    } = {}

    if (country) {
      where.qurbaniCountry = { country: { contains: country, mode: "insensitive" } }
    }
    if (size && ["ONE_SEVENTH", "SMALL", "LARGE"].includes(size)) {
      where.size = size
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
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(donations)
  } catch (e) {
    console.error("Qurbani donations list error:", e)
    return NextResponse.json({ error: "Failed to load qurbani donations" }, { status: 500 })
  }
}
