import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

/** One donation per (orderNumber, transactionId); use first occurrence so amount is not doubled. */
export function deduplicateDonationsByTransaction<
  T extends { id: string; orderNumber: string | null; transactionId: string | null }
>(donations: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const d of donations) {
    const key =
      d.orderNumber && d.transactionId ? `${d.orderNumber}:${d.transactionId}` : d.id
    if (seen.has(key)) continue
    seen.add(key)
    out.push(d)
  }
  return out
}

/** Sum amountPence counting each transaction once (deduplicated by orderNumber + transactionId). */
export function sumDonationsDeduplicated(
  donations: Array<{
    id: string
    amountPence: number
    orderNumber: string | null
    transactionId: string | null
  }>
): number {
  const deduped = deduplicateDonationsByTransaction(donations)
  return deduped.reduce((s, d) => s + d.amountPence, 0)
}

/** Deduplicated sum of donations matching where (one amount per Stripe transaction). */
export async function getDeduplicatedDonationSum(
  where: Prisma.DonationWhereInput
): Promise<number> {
  const rows = await prisma.donation.findMany({
    where,
    select: { id: true, amountPence: true, orderNumber: true, transactionId: true },
  })
  return sumDonationsDeduplicated(rows)
}

/** Deduplicated count of donations (unique transactions). */
export async function getDeduplicatedDonationCount(
  where: Prisma.DonationWhereInput
): Promise<number> {
  const rows = await prisma.donation.findMany({
    where,
    select: { id: true, orderNumber: true, transactionId: true },
  })
  return deduplicateDonationsByTransaction(rows).length
}

type DonationGroupByKey = "donationType" | "paymentMethod" | "status" | "appealId" | "fundraiserId" | "collectedVia"

export type DeduplicatedDonationGroupByRow = {
  _sum: { amountPence: number }
  _count: { _all: number }
} & Partial<Record<DonationGroupByKey, string | null>>

/** GroupBy with deduplication: one row per transaction, then group by field and sum. Returns shape compatible with Prisma groupBy (_count._all). */
export async function getDeduplicatedDonationGroupBy(
  where: Prisma.DonationWhereInput,
  by: DonationGroupByKey
): Promise<DeduplicatedDonationGroupByRow[]> {
  const rows = await prisma.donation.findMany({
    where,
    select: {
      id: true,
      amountPence: true,
      orderNumber: true,
      transactionId: true,
      [by]: true,
    } as { id: true; amountPence: true; orderNumber: true; transactionId: true; [key: string]: true },
  })
  const deduped = deduplicateDonationsByTransaction(
    rows as unknown as Array<{ id: string; amountPence: number; orderNumber: string | null; transactionId: string | null }>
  )
  const byKey = new Map<string, { sum: number; count: number }>()
  for (const d of deduped) {
    const key = String((d as Record<string, unknown>)[by] ?? "__null__")
    const current = byKey.get(key) ?? { sum: 0, count: 0 }
    current.sum += d.amountPence
    current.count += 1
    byKey.set(key, current)
  }
  return Array.from(byKey.entries()).map(([k, v]) => ({
    [by]: k === "__null__" ? null : k,
    _sum: { amountPence: v.sum },
    _count: { _all: v.count },
  }))
}
