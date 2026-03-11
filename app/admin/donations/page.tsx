import type { DemoOrder, DemoOrderItem } from "@prisma/client"
import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { DonationsPageContent } from "@/components/donations-page-content"

type AbandonedCheckoutRow = DemoOrder & { items: DemoOrderItem[] }

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getDonations() {
  try {
    const rows = await prisma.donation.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      include: {
        donor: { select: { title: true, firstName: true, lastName: true, email: true } },
        appeal: { select: { title: true } },
        product: { select: { name: true } },
        fundraiser: {
          select: {
            fundraiserName: true,
            title: true,
            slug: true,
            waterProjectId: true,
            waterProject: { select: { projectType: true } },
            waterProjectCountry: { select: { country: true } },
          },
        },
      },
    })
    // Show one row per transaction: deduplicate by (orderNumber, transactionId) so the same payment
    // doesn't appear twice when both client confirm and webhook ran.
    const byTx = new Map<string, typeof rows>()
    for (const row of rows) {
      const key =
        row.orderNumber && row.transactionId
          ? `${row.orderNumber}:${row.transactionId}`
          : row.id
      const group = byTx.get(key)
      if (!group) byTx.set(key, [row])
      else group.push(row)
    }
    const deduped = Array.from(byTx.values()).map((group) => {
      if (group.length === 1) return group[0]
      return group[0]
    })
    deduped.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
    return deduped
  } catch (error) {
    return []
  }
}

/** Set of "email|totalPence" for completed donation order totals (same email + same amount = recovered). */
async function getCompletedDonorEmailAmounts(): Promise<Set<string>> {
  try {
    const donations = await prisma.donation.findMany({
      where: { status: "COMPLETED" },
      select: {
        id: true,
        orderNumber: true,
        transactionId: true,
        amountPence: true,
        donor: { select: { email: true } },
      },
    })
    const byOrder = new Map<string, { email: string; totalPence: number }>()
    for (const d of donations) {
      const key = d.orderNumber && d.transactionId
        ? `${d.orderNumber}:${d.transactionId}`
        : d.orderNumber ?? d.id
      const email = d.donor?.email?.trim().toLowerCase()
      if (!email) continue
      const existing = byOrder.get(key)
      if (existing) {
        existing.totalPence += d.amountPence
      } else {
        byOrder.set(key, { email, totalPence: d.amountPence })
      }
    }
    const set = new Set<string>()
    for (const { email, totalPence } of byOrder.values()) {
      set.add(`${email}|${totalPence}`)
    }
    return set
  } catch {
    return new Set()
  }
}

async function getAbandonedCheckouts(): Promise<AbandonedCheckoutRow[]> {
  try {
    // Include recovered (COMPLETED + abandonedEmail1SentAt) when that column exists
    return await prisma.demoOrder.findMany({
      where: {
        OR: [
          { status: { in: ["PENDING", "ABANDONED"] } },
          { status: "COMPLETED", abandonedEmail1SentAt: { not: null } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    })
  } catch (err) {
    // Fallback when migration not run yet (abandonedEmail1SentAt column missing): query without that column
    console.error("[getAbandonedCheckouts] primary query failed:", err)
    try {
      return (await prisma.demoOrder.findMany({
        where: { status: { in: ["PENDING", "ABANDONED"] } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          donorFirstName: true,
          donorLastName: true,
          donorEmail: true,
          totalPence: true,
          abandonedEmail2SentAt: true,
          items: {
            select: {
              appealTitle: true,
              productName: true,
              amountPence: true,
            },
          },
        },
      })) as AbandonedCheckoutRow[]
    } catch (fallbackErr) {
      console.error("[getAbandonedCheckouts] fallback query failed:", fallbackErr)
      return []
    }
  }
}

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>
}) {
  const params = await searchParams
  const [donations, abandonedCheckoutsRaw, completedDonorEmailAmounts] = await Promise.all([
    getDonations(),
    getAbandonedCheckouts(),
    getCompletedDonorEmailAmounts(),
  ])

  // Mark as recovered only when same email has a completed donation with the same total amount
  const withRecovered = abandonedCheckoutsRaw.map((order) => {
    const email = order.donorEmail?.trim().toLowerCase()
    const recoveredBySameEmail =
      !!email &&
      completedDonorEmailAmounts.has(`${email}|${order.totalPence}`) &&
      order.status !== "COMPLETED"
    return { ...order, recoveredBySameEmail }
  })

  // Dedupe: same name, email, amount and date (day) → keep only the earliest
  const dedupeKey = (order: (typeof withRecovered)[0]) => {
    const name = `${(order.donorFirstName ?? "").trim()} ${(order.donorLastName ?? "").trim()}`.trim().toLowerCase()
    const email = (order.donorEmail ?? "").trim().toLowerCase()
    const date = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt as string)
    const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
    return `${name}|${email}|${order.totalPence}|${dateKey}`
  }
  const byKey = new Map<string, (typeof withRecovered)[0]>()
  const sortedByCreatedAsc = [...withRecovered].sort(
    (a, b) =>
      (a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as string).getTime()) -
      (b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as string).getTime())
  )
  for (const order of sortedByCreatedAsc) {
    const key = dedupeKey(order)
    if (!byKey.has(key)) byKey.set(key, order)
  }
  const abandonedCheckouts = Array.from(byKey.values()).sort(
    (a, b) =>
      (b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt as string).getTime()) -
      (a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt as string).getTime())
  )

  return (
    <>
      <AdminHeader title="Donations" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-base sm:text-lg font-semibold">Website Donations</h2>
                </div>
                <div>
                  <DonationsPageContent
                    donations={donations}
                    abandonedCheckouts={abandonedCheckouts}
                    openId={params?.open ?? undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
