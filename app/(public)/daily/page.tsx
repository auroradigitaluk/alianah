import { prisma } from "@/lib/prisma"
import { getDailyGivingSettings } from "@/lib/settings"
import { RamadhanDailyGivingForm } from "@/components/ramadhan-daily-giving-form"

export const dynamic = "force-dynamic"

/** Appeals to show on the daily giving page (IDs set in admin Daily giving setup). */
async function getDailyGivingAppeals(appealIds: string[]) {
  if (appealIds.length === 0) return []
  const appeals = await prisma.appeal.findMany({
    where: {
      id: { in: appealIds },
      isActive: true,
      archivedAt: null,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      donationTypesEnabled: true,
      oneOffPresetAmountsPence: true,
    },
    orderBy: { sortOrder: "asc" },
  })
  return appeals
}

export default async function RamadhanDailyGivingPage() {
  const dailyGiving = await getDailyGivingSettings()
  const appeals = await getDailyGivingAppeals(dailyGiving.dailyGivingAppealIds)

  const ramadhanEndDate = dailyGiving.ramadhanEndDate
  const ramadhanStartDate = dailyGiving.ramadhanStartDate

  return (
    <div className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:px-6 max-w-lg">
        {appeals.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No appeals are currently available for daily giving. Check back soon.
            </p>
          </div>
        ) : (
          <RamadhanDailyGivingForm
            appeals={appeals}
            ramadhanEndDate={ramadhanEndDate ? ramadhanEndDate.toISOString() : null}
            ramadhanStartDate={ramadhanStartDate ? ramadhanStartDate.toISOString() : null}
          />
        )}
    </div>
  )
}
