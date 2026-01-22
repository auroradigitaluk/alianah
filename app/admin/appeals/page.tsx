import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus } from "lucide-react"
import { AppealsTable } from "@/components/appeals-table"

async function getAppeals() {
  try {
    return await prisma.appeal.findMany({
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    return []
  }
}

export default async function AppealsPage() {
  const appeals = await getAppeals()

  return (
    <>
      <AdminHeader
        title="Appeals"
        actions={
          <Button asChild>
            <Link href="/admin/appeals/new">
              <Plus className="mr-2 h-4 w-4" />
              New Appeal
            </Link>
          </Button>
        }
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-base sm:text-lg font-semibold">Appeals</h2>
                  <p className="text-xs sm:text-xs sm:text-sm text-muted-foreground">Manage donation appeals</p>
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
