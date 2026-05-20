/** Checkout order reference embedded in qurbani donation notes after Stripe finalize. */
export function orderNumberFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null
  const match = notes.match(/OrderNumber:([A-Z0-9-]+)/)
  return match?.[1] ?? null
}

export function getQurbaniCheckoutGroupKey(row: {
  id: string
  notes: string | null | undefined
}): string {
  const checkout = orderNumberFromNotes(row.notes)
  if (checkout) return `checkout:${checkout}`
  return `single:${row.id}`
}

export type QurbaniLineSummary = {
  id: string
  country: string
  size: string
  amountPence: number
  donationNumber: string | null
}

export type QurbaniDonationsTableRowInput = {
  id: string
  amountPence: number
  donationType: string
  paymentMethod: string
  collectedVia: string | null
  transactionId: string | null
  donationNumber: string | null
  notes: string | null | undefined
  giftAid: boolean
  billingAddress: string | null
  billingCity: string | null
  billingPostcode: string | null
  billingCountry: string | null
  createdAt: Date
  size: string
  donor: {
    title?: string | null
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    address?: string | null
    city?: string | null
    postcode?: string | null
    country?: string | null
  }
  qurbaniCountry: { country: string }
  fundraiser: {
    fundraiserName: string
    title: string
    slug: string
    waterProjectId?: string | null
    waterProject?: { projectType: string } | null
    waterProjectCountry?: { country: string } | null
  } | null
}

export type QurbaniDonationsTableRow<T extends QurbaniDonationsTableRowInput = QurbaniDonationsTableRowInput> =
  T & {
    listKind: "qurbani"
    frequency: "ONE_OFF"
    status: "COMPLETED"
    orderNumber: string | null
    completedAt: Date
    qurbaniLineCount: number
    qurbaniSize: string
    qurbaniCountry: { country: string }
  }

/** One admin donations-table row per checkout; offline / single rows stay as one row each. */
export function consolidateQurbaniRowsForDonationsTable<T extends QurbaniDonationsTableRowInput>(
  rows: T[]
): QurbaniDonationsTableRow<T>[] {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const key = getQurbaniCheckoutGroupKey(row)
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }

  const consolidated: QurbaniDonationsTableRow<T>[] = []
  for (const group of groups.values()) {
    const sorted = [...group].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
    const primary = sorted[0]
    const checkoutOrder = orderNumberFromNotes(primary.notes)
    const displayOrderNumber = checkoutOrder ?? primary.donationNumber

    consolidated.push({
      ...primary,
      listKind: "qurbani",
      frequency: "ONE_OFF",
      status: "COMPLETED",
      amountPence: group.reduce((sum, row) => sum + row.amountPence, 0),
      orderNumber: displayOrderNumber,
      completedAt: sorted.reduce(
        (latest, row) => (row.createdAt > latest ? row.createdAt : latest),
        primary.createdAt
      ),
      qurbaniLineCount: group.length,
      qurbaniSize: primary.size,
      qurbaniCountry: primary.qurbaniCountry,
    })
  }

  consolidated.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return consolidated
}
