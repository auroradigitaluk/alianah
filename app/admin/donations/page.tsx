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
  const [donations, abandonedCheckouts] = await Promise.all([
    getDonations(),
    getAbandonedCheckouts(),
  ])

  return (
    <>
      <AdminHeader title="Donations" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-base sm:text-lg font-semibold">Donations</h2>
                  <p className="text-xs sm:text-xs sm:text-sm text-muted-foreground">
                    Online donations. Use the &quot;Abandoned checkouts&quot; tab to view incomplete sessions.
                  </p>
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
