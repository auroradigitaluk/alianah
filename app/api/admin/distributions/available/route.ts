import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

/**
 * GET /api/admin/distributions/available
 * Returns per-appeal: total received (donations + offline income + collections) and total distributed, so available = received - distributed.
 * Admin only.
 */
export async function GET() {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err

  try {
    const appeals = await prisma.appeal.findMany({
      where: { archivedAt: null },
      select: { id: true, title: true },
      orderBy: { sortOrder: "asc" },
    })

    const appealIds = appeals.map((a) => a.id)
    if (appealIds.length === 0) {
      return NextResponse.json([])
    }

    const distributedPromise = prisma.distribution
      .groupBy({
        by: ["appealId"],
        where: { appealId: { in: appealIds } },
        _sum: { amountPence: true },
      })
      .catch((e: unknown) => {
        console.warn("Distributions available: distribution groupBy failed", e)
        return [] as { appealId: string; _sum: { amountPence: number | null } }[]
      })

    const [donationsSum, offlineSum, collectionsSum, distributedSum] = await Promise.all([
      prisma.donation.groupBy({
        by: ["appealId"],
        where: {
          appealId: { in: appealIds },
          status: "COMPLETED",
        },
        _sum: { amountPence: true },
      }),
      prisma.offlineIncome.groupBy({
        by: ["appealId"],
        where: {
          appealId: { in: appealIds },
        },
        _sum: { amountPence: true },
      }),
      prisma.collection.groupBy({
        by: ["appealId"],
        where: {
          appealId: { in: appealIds },
        },
        _sum: { amountPence: true },
      }),
      distributedPromise,
    ])

    const toMap = (
      arr: { appealId: string | null; _sum: { amountPence: number | null } }[],
      key: "appealId"
    ) => {
      const m = new Map<string, number>()
      for (const row of arr) {
        const id = row[key]
        if (id) m.set(id, (row._sum?.amountPence ?? 0) || 0)
      }
      return m
    }

    const donationsByAppeal = toMap(donationsSum, "appealId")
    const offlineByAppeal = toMap(offlineSum, "appealId")
    const collectionsByAppeal = toMap(collectionsSum, "appealId")
    const distributedByAppeal = toMap(distributedSum, "appealId")

    const result = appeals.map((appeal) => {
      const received =
        (donationsByAppeal.get(appeal.id) ?? 0) +
        (offlineByAppeal.get(appeal.id) ?? 0) +
        (collectionsByAppeal.get(appeal.id) ?? 0)
      const distributed = distributedByAppeal.get(appeal.id) ?? 0
      const availablePence = Math.max(0, received - distributed)
      return {
        appealId: appeal.id,
        appealTitle: appeal.title,
        totalReceivedPence: received,
        distributedPence: distributed,
        availablePence,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Distributions available GET error:", error)
    const message = error instanceof Error ? error.message : "Failed to load available funds"
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Failed to load available funds" },
      { status: 500 }
    )
  }
}
