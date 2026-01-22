import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { DonationsTable } from "@/components/donations-table"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDonations() {
  try {
    return await prisma.donation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        donor: { select: { firstName: true, lastName: true, email: true } },
        appeal: { select: { title: true } },
        product: { select: { name: true } },
      },
    })
  } catch (error) {
    return []
  }
}

export default async function DonationsPage() {
  const donations = await getDonations()

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
                  <p className="text-xs sm:text-xs sm:text-sm text-muted-foreground">Online donations</p>
                </div>
                <div>
                  {donations.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No donations yet</p>
                  ) : (
                    <DonationsTable donations={donations} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
