import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { RecurringTable } from "@/components/recurring-table"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getRecurringDonations() {
  try {
    return await prisma.recurringDonation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        donor: { select: { title: true, firstName: true, lastName: true, email: true } },
        appeal: { select: { title: true } },
      },
    })
  } catch (error) {
    return []
  }
}

export default async function RecurringPage() {
  const recurring = await getRecurringDonations()

  return (
    <>
      <AdminHeader title="Recurring Donations" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Recurring Donations</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Recurring donation subscriptions</p>
                </div>
                <div>
                  <RecurringTable recurring={recurring} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
