import { prisma } from "@/lib/prisma"
import { orderNumberFromNotes } from "@/lib/qurbani-checkout"

type QurbaniCartItem = {
  qurbaniCountryId?: string
  fundraiserId?: string
}

/** If the basket has one fundraiser on any qurbani line, apply it to all qurbani lines (same checkout). */
export function normalizeFundraiserOnQurbaniCheckoutItems<T extends QurbaniCartItem>(
  items: T[]
): T[] {
  const fundraiserIds = new Set(
    items
      .filter((item) => item.qurbaniCountryId && item.fundraiserId)
      .map((item) => item.fundraiserId as string)
  )
  if (fundraiserIds.size !== 1) return items
  const fundraiserId = [...fundraiserIds][0]
  return items.map((item) =>
    item.qurbaniCountryId && !item.fundraiserId ? { ...item, fundraiserId } : item
  )
}

type OrderQurbaniItem = {
  qurbaniCountryId?: string | null
  fundraiserId?: string | null
}

/** Resolve fundraiser for each qurbani order line from the full order (checkout normalization). */
export function resolveFundraiserIdForOrderQurbaniItem(
  item: OrderQurbaniItem,
  orderItems: OrderQurbaniItem[]
): string | null {
  if (item.fundraiserId) return item.fundraiserId
  const fundraiserIds = new Set(
    orderItems
      .filter((i) => i.qurbaniCountryId && i.fundraiserId)
      .map((i) => i.fundraiserId as string)
  )
  if (fundraiserIds.size !== 1) return null
  return [...fundraiserIds][0]
}

export type QurbaniFundraiserRow = {
  id: string
  amountPence: number
  fundraiserId: string | null
  notes: string | null
  transactionId: string | null
  createdAt: Date
  isAnonymous?: boolean | null
  donor: { firstName: string | null; lastName?: string | null }
}

export function getQurbaniCheckoutKey(row: {
  id: string
  notes: string | null
  transactionId?: string | null
}): string {
  const checkout = orderNumberFromNotes(row.notes)
  if (checkout) return `checkout:${checkout}`
  if (row.transactionId) return `tx:${row.transactionId}`
  return `single:${row.id}`
}

/**
 * Totals for a fundraiser: sum every qurbani line in a checkout if any line in that
 * checkout is attributed to this fundraiser (fixes multi-qurbani baskets that only stored
 * fundraiserId on one line).
 */
export function aggregateQurbaniForFundraiser(
  rows: QurbaniFundraiserRow[],
  fundraiserId: string
): { totalRaisedPence: number; checkoutCount: number } {
  const byCheckout = new Map<string, QurbaniFundraiserRow[]>()
  for (const row of rows) {
    const key = getQurbaniCheckoutKey(row)
    const group = byCheckout.get(key) ?? []
    group.push(row)
    byCheckout.set(key, group)
  }

  let totalRaisedPence = 0
  let checkoutCount = 0
  for (const group of byCheckout.values()) {
    if (!group.some((row) => row.fundraiserId === fundraiserId)) continue
    checkoutCount += 1
    totalRaisedPence += group.reduce((sum, row) => sum + row.amountPence, 0)
  }

  return { totalRaisedPence, checkoutCount }
}

/** One recent-supporter entry per checkout session attributed to this fundraiser. */
export function groupQurbaniForFundraiserRecentList(
  rows: QurbaniFundraiserRow[],
  fundraiserId: string
): Array<{
  id: string
  amountPence: number
  isAnonymous?: boolean | null
  createdAt: Date
  donor: { firstName: string | null; lastName?: string | null }
}> {
  const byCheckout = new Map<string, QurbaniFundraiserRow[]>()
  for (const row of rows) {
    const key = getQurbaniCheckoutKey(row)
    const group = byCheckout.get(key) ?? []
    group.push(row)
    byCheckout.set(key, group)
  }

  return Array.from(byCheckout.values())
    .filter((group) => group.some((row) => row.fundraiserId === fundraiserId))
    .map((group) => {
      const sorted = [...group].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const primary = sorted[0]
      return {
        id: primary.id,
        amountPence: group.reduce((sum, row) => sum + row.amountPence, 0),
        isAnonymous: group.some((row) => row.isAnonymous) ? true : primary.isAnonymous,
        donor: primary.donor,
        createdAt: primary.createdAt,
      }
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/** Checkout order numbers that include at least one line for this fundraiser. */
const qurbaniFundraiserSelect = {
  id: true,
  amountPence: true,
  fundraiserId: true,
  notes: true,
  transactionId: true,
  createdAt: true,
  isAnonymous: true,
  donor: { select: { firstName: true, lastName: true } },
} as const

/** Load all qurbani rows for checkouts that include a gift to these fundraisers. */
export async function loadQurbaniRowsForFundraiserTotals(
  fundraiserIds: string[]
): Promise<QurbaniFundraiserRow[]> {
  if (fundraiserIds.length === 0) return []

  const attributed = await prisma.qurbaniDonation.findMany({
    where: { fundraiserId: { in: fundraiserIds } },
    select: qurbaniFundraiserSelect,
  })

  const checkoutRefs = new Set<string>()
  for (const row of attributed) {
    const ref = orderNumberFromNotes(row.notes)
    if (ref) checkoutRefs.add(ref)
  }

  if (checkoutRefs.size === 0) return attributed

  const siblings = await prisma.qurbaniDonation.findMany({
    where: {
      OR: [...checkoutRefs].map((ref) => ({
        notes: { contains: `OrderNumber:${ref}` },
      })),
    },
    select: qurbaniFundraiserSelect,
  })

  const byId = new Map<string, QurbaniFundraiserRow>()
  for (const row of [...attributed, ...siblings]) {
    byId.set(row.id, row)
  }
  return [...byId.values()]
}

export async function getQurbaniRaisedPenceByFundraiserIds(
  fundraiserIds: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  for (const id of fundraiserIds) out.set(id, 0)
  const rows = await loadQurbaniRowsForFundraiserTotals(fundraiserIds)
  for (const fid of fundraiserIds) {
    out.set(fid, aggregateQurbaniForFundraiser(rows, fid).totalRaisedPence)
  }
  return out
}

export function checkoutOrderNumbersForFundraiser(
  rows: Array<{ fundraiserId: string | null; notes: string | null }>,
  fundraiserId: string
): string[] {
  const refs = new Set<string>()
  for (const row of rows) {
    if (row.fundraiserId !== fundraiserId) continue
    const ref = orderNumberFromNotes(row.notes)
    if (ref) refs.add(ref)
  }
  return [...refs]
}
