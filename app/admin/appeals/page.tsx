import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus } from "lucide-react"
import { AppealsTable } from "@/components/appeals-table"
import { ArchivedAppealsModal } from "@/components/archived-appeals-modal"

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getDateRange(range: string | null, start?: string | null, end?: string | null) {
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  // Handle custom range
  if (range === "custom" && start && end) {
    startDate = new Date(start)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(end)
    endDate.setHours(23, 59, 59, 999)
    return { startDate, endDate }
  }

  switch (range) {
    case "all_time":
    case null:
      return { startDate: new Date(0), endDate: new Date() , isAllTime: true }
    case "this_week": {
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
      break
    }
    case "last_week": {
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
      const lastMonday = new Date(now.getFullYear(), now.getMonth(), diff - 7)
      startDate = new Date(lastMonday)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(lastMonday)
      endDate.setDate(endDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
      break
    }
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
    case "90d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 90)
      startDate.setHours(0, 0, 0, 0)
      break
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    case "last_year":
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      break
    default:
      // Default to all time
      return { startDate: new Date(0), endDate: new Date(), isAllTime: true }
  }

  return { startDate, endDate, isAllTime: false }
}

async function getAppeals(range: string | null, start: string | null, end: string | null) {
  try {
    const { startDate, endDate, isAllTime } = getDateRange(range, start, end)
    const where = isAllTime
      ? {}
      : {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }

    return await prisma.appeal.findMany({
      where,
      include: {
        donations: {
          select: {
            id: true,
            amountPence: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
        offlineIncome: {
          select: {
            id: true,
            amountPence: true,
            source: true,
            receivedAt: true,
          },
        },
        collections: {
          select: {
            id: true,
            amountPence: true,
            collectedAt: true,
          },
        },
        fundraisers: {
          select: {
            id: true,
            title: true,
            fundraiserName: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    })
  } catch {
    return []
  }
}

export default async function AppealsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; start?: string; end?: string }>
}) {
  const params = await searchParams

  const allAppeals = await getAppeals(params?.range || null, params?.start || null, params?.end || null)
  const appeals = allAppeals.filter((a) => !a.archivedAt)

  const archivedAppeals = await prisma.appeal.findMany({
    where: { archivedAt: { not: null } },
    select: { id: true, title: true, slug: true, archivedAt: true },
    orderBy: { archivedAt: "desc" },
  })

  return (
    <>
      <AdminHeader title="Appeals" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-base sm:text-base sm:text-lg font-semibold">Appeals</h2>
                    <p className="text-xs sm:text-xs sm:text-sm text-muted-foreground">Manage donation appeals</p>
                  </div>
                  <div className="flex flex-nowrap items-end gap-2">
                    <ArchivedAppealsModal appeals={archivedAppeals} />
                    <Button asChild>
                      <Link href="/admin/appeals/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Appeal
                      </Link>
                    </Button>
                  </div>
                </div>
                <div>
                  <AppealsTable appeals={appeals} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
