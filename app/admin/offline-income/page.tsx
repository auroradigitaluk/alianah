import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus } from "lucide-react"
import { OfflineIncomeTable } from "@/components/offline-income-table"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOfflineIncome() {
  try {
    return await prisma.offlineIncome.findMany({
      orderBy: { receivedAt: "desc" },
      include: { appeal: { select: { title: true } } },
    })
  } catch (error) {
    return []
  }
}

export default async function OfflineIncomePage() {
  const income = await getOfflineIncome()

  return (
    <>
      <AdminHeader
        title="Offline Income"
        actions={
          <Button asChild>
            <Link href="/admin/offline-income/new">
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Link>
          </Button>
        }
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Offline Income</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Cash and bank transfer income</p>
                </div>
                <div>
                  <OfflineIncomeTable income={income} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
