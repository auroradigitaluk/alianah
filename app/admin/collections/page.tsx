import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { CollectionsPageClient } from "@/components/collections-page-client"
import { getAdminUser } from "@/lib/admin-auth"
import { formatAdminUserName } from "@/lib/utils"

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
  } catch {
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
  const staffId = isStaff ? user!.id : params?.staff || null

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
  const canCreate = Boolean(user && user.role !== "VIEWER")

  return (
    <>
      <AdminHeader title="Collections" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <CollectionsPageClient
                collections={collections}
                masjids={masjids}
                appeals={appeals}
                staffUsers={staffUsers}
                canCreate={canCreate}
                showLoggedBy={user?.role !== "STAFF"}
                canEdit={user?.role === "ADMIN" || user?.role === "STAFF"}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
