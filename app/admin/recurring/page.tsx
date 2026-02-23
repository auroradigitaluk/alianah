import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { RecurringTable } from "@/components/recurring-table"
import { DailyGivingTabClient } from "@/components/daily-giving-tab-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getRecurringDonations() {
  try {
    const rows = await prisma.recurringDonation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        donor: { select: { title: true, firstName: true, lastName: true, email: true } },
        appeal: { select: { title: true } },
        product: { select: { name: true } },
      },
    })
    return rows.map((r) => ({
      ...r,
      nextPaymentDate: r.nextPaymentDate?.toISOString() ?? null,
      lastPaymentDate: r.lastPaymentDate?.toISOString() ?? null,
      scheduleEndDate: r.scheduleEndDate?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  } catch (error) {
    return []
  }
}

async function getAppealsForDailyGiving() {
  try {
    return await prisma.appeal.findMany({
      where: { isActive: true, archivedAt: null },
      select: { id: true, title: true },
      orderBy: { sortOrder: "asc" },
    })
  } catch {
    return []
  }
}

async function getDailyGivingSubscriptions() {
  try {
    const rows = await prisma.recurringDonation.findMany({
      where: { frequency: "DAILY" },
      orderBy: { createdAt: "desc" },
      include: {
        donor: { select: { title: true, firstName: true, lastName: true, email: true } },
        appeal: { select: { title: true } },
      },
    })
    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      nextPaymentDate: r.nextPaymentDate?.toISOString() ?? null,
      lastPaymentDate: r.lastPaymentDate?.toISOString() ?? null,
      scheduleEndDate: r.scheduleEndDate?.toISOString() ?? null,
    }))
  } catch {
    return []
  }
}

export default async function RecurringPage() {
  const [recurring, appeals, dailyGivingSubscriptions] = await Promise.all([
    getRecurringDonations(),
    getAppealsForDailyGiving(),
    getDailyGivingSubscriptions(),
  ])

  return (
    <>
      <AdminHeader title="Recurring Donations" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <Tabs defaultValue="recurring" className="w-full">
                  <TabsList>
                    <TabsTrigger value="recurring">Recurring donations</TabsTrigger>
                    <TabsTrigger value="daily-giving">Daily giving</TabsTrigger>
                  </TabsList>
                  <TabsContent value="recurring" className="mt-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold">Recurring Donations</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground">Recurring donation subscriptions</p>
                    </div>
                    <div className="mt-4">
                      <RecurringTable recurring={recurring} />
                    </div>
                  </TabsContent>
                  <TabsContent value="daily-giving" className="mt-4">
                    <DailyGivingTabClient appeals={appeals} dailyGivingSubscriptions={dailyGivingSubscriptions} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
