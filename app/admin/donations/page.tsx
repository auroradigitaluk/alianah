import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { DonationsPageContent } from "@/components/donations-page-content"
import { ExportCsvButton } from "@/components/export-csv-button"

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

async function getAbandonedCheckouts() {
  try {
    return await prisma.donation.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        donor: { select: { title: true, firstName: true, lastName: true, email: true } },
        appeal: { select: { title: true } },
        product: { select: { name: true } },
      },
    })
  } catch (error) {
    return []
  }
}

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>
}) {
  const params = await searchParams
  const [donations, abandonedDonations] = await Promise.all([
    getDonations(),
    getAbandonedCheckouts(),
  ])

  return (
    <>
      <AdminHeader
        title="Donations"
        actions={<ExportCsvButton variant="donations" data={donations} />}
      />
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
                    abandonedDonations={abandonedDonations}
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
