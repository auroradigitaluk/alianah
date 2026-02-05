import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { CollectionsTable } from "@/components/collections-table"
import { CollectionModal } from "@/components/collection-modal"
import { ExportCsvButton } from "@/components/export-csv-button"
import { getAdminUser } from "@/lib/admin-auth"
import { formatAdminUserName } from "@/lib/utils"
import { StaffFilterSelect } from "@/components/staff-filter-select"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getCollections(staffId: string | null) {
  try {
    return await prisma.collection.findMany({
      where: staffId ? { addedByAdminUserId: staffId } : undefined,
      orderBy: { collectedAt: "desc" },
      include: {
        masjid: { select: { name: true } },
        appeal: { select: { title: true } },
        addedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    })
  } catch (error) {
    return []
  }
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string }>
}) {
  const user = await getAdminUser()
  const isStaff = user?.role === "STAFF"
  const params = await searchParams
  const staffParam = params?.staff
  const staffId = isStaff ? user!.id : staffParam || null

  const staffUsers = user?.role === "ADMIN"
    ? await prisma.adminUser.findMany({
        where: { role: { in: ["ADMIN", "STAFF"] } },
        orderBy: { email: "asc" },
        select: { id: true, email: true, role: true, firstName: true, lastName: true },
      })
    : []

  const [collectionsRaw, masjids, appeals] = await Promise.all([
    getCollections(staffId),
    prisma.masjid.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.appeal.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ])
  const collections = collectionsRaw.map((c) => ({
    ...c,
    addedByName: formatAdminUserName(c.addedBy),
  }))
  const canCreate = user && user.role !== "VIEWER"

  return (
    <>
      <AdminHeader
        title="Collections"
        actions={
          <div className="flex items-center gap-2">
            <ExportCsvButton variant="collections" data={collections} />
            {canCreate && (
              <CollectionModal masjids={masjids} appeals={appeals} />
            )}
          </div>
        }
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Collections</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Masjid collections (Jummah, Ramadan, Eid, etc.)</p>
                  </div>
                  {staffUsers.length > 0 && (
                    <StaffFilterSelect staffUsers={staffUsers} />
                  )}
                </div>
                <div>
                  <CollectionsTable
                    collections={collections}
                    showLoggedBy={user?.role !== "STAFF"}
                    canEdit={user?.role === "ADMIN" || user?.role === "STAFF"}
                    masjids={masjids}
                    appeals={appeals}
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
