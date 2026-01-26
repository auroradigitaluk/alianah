import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus } from "lucide-react"
import { CollectionsTable } from "@/components/collections-table"
import { ExportCsvButton } from "@/components/export-csv-button"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCollections() {
  try {
    return await prisma.collection.findMany({
      orderBy: { collectedAt: "desc" },
      include: {
        masjid: { select: { name: true } },
        appeal: { select: { title: true } },
      },
    })
  } catch (error) {
    return []
  }
}

export default async function CollectionsPage() {
  const collections = await getCollections()

  return (
    <>
      <AdminHeader
        title="Collections"
        actions={
          <div className="flex items-center gap-2">
            <ExportCsvButton variant="collections" data={collections} />
            <Button asChild>
              <Link href="/admin/collections/new">
                <Plus className="mr-2 h-4 w-4" />
                New Collection
              </Link>
            </Button>
          </div>
        }
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Collections</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Masjid collections (Jummah, Ramadan, Eid, etc.)</p>
                </div>
                <div>
                  <CollectionsTable collections={collections} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
