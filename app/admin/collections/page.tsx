import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { CollectionsPageClient } from "@/components/collections-page-client"
import { ExportCsvButton } from "@/components/export-csv-button"
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
  } catch (error) {
    return []
  }
}

async function getUpcomingBookings() {
  try {
    return await prisma.collectionBooking.findMany({
      where: { scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      include: {
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
  // Staff only see collections they've logged; admins can filter by staff via ?staff=
  const staffId = isStaff ? user!.id : params?.staff || null

  const staffUsers = user?.role === "ADMIN"
    ? await prisma.adminUser.findMany({
        where: { role: { in: ["ADMIN", "STAFF"] } },
        orderBy: { email: "asc" },
        select: { id: true, email: true, role: true, firstName: true, lastName: true },
      })
    : []

  const [collectionsRaw, masjids, appeals, upcomingBookings] = await Promise.all([
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
    getUpcomingBookings(),
  ])
  const collections = collectionsRaw.map((c) => ({
    ...c,
    addedByName: formatAdminUserName(c.addedBy),
  }))
  const canCreate = Boolean(user && user.role !== "VIEWER")

  const initialBookings = upcomingBookings.map((b) => ({
    id: b.id,
    locationName: b.locationName,
    addressLine1: b.addressLine1,
    postcode: b.postcode,
    city: b.city,
    country: b.country,
    bookedByName: b.bookedByName,
    scheduledAt: b.scheduledAt.toISOString(),
    notes: b.notes,
    addedBy: b.addedBy,
  }))

  return (
    <>
      <AdminHeader
        title="Collections"
        actions={
          <ExportCsvButton variant="collections" data={collections} />
        }
      />
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
                initialBookings={initialBookings}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
