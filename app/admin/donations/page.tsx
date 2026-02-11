import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { DonationsPageContent } from "@/components/donations-page-content"
import { ExportCsvButton } from "@/components/export-csv-button"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getDonations() {
  try {
    return await prisma.donation.findMany({
      where: { status: { not: "PENDING" } },
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
