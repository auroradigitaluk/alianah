import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { MasjidsTable } from "@/components/masjids-table"
import { MasjidCreateButton } from "@/components/masjid-create-button"
import { formatAdminUserName } from "@/lib/utils"
import { getAdminUser } from "@/lib/admin-auth"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getMasjids(filterByAddedByUserId: string | null) {
  try {
    const masjids = await prisma.masjid.findMany({
      where: filterByAddedByUserId
        ? { addedByAdminUserId: filterByAddedByUserId }
        : undefined,
      orderBy: { name: "asc" },
      include: {
        collections: {
          orderBy: { collectedAt: "desc" },
          include: {
            appeal: { select: { title: true } },
            addedBy: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    })

    const addedByUserIds = [...new Set(masjids.map((m) => m.addedByAdminUserId).filter(Boolean))] as string[]
    const addedByUsers =
      addedByUserIds.length > 0
        ? await prisma.adminUser.findMany({
            where: { id: { in: addedByUserIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : []
    const addedByNameMap = new Map(addedByUsers.map((u) => [u.id, formatAdminUserName(u)]))

    return masjids.map((masjid) => {
      const collectionCount = masjid.collections.length
      const totalAmountRaised = masjid.collections.reduce(
        (sum, c) => sum + c.amountPence,
        0
      )
      const collections = masjid.collections.map((c) => ({
        id: c.id,
        amountPence: c.amountPence,
        donationType: c.donationType,
        type: c.type,
        collectedAt: c.collectedAt.toISOString(),
        masjidId: c.masjidId,
        appealId: c.appealId,
        masjid: { name: masjid.name },
        appeal: c.appeal ? { title: c.appeal.title } : null,
        notes: c.notes,
        addedByName: formatAdminUserName(c.addedBy),
      }))

      return {
        id: masjid.id,
        name: masjid.name,
        status: masjid.status,
        city: masjid.city,
        address: masjid.address,
        postcode: masjid.postcode,
        country: masjid.country,
        region: masjid.region,
        contactName: masjid.contactName,
        contactRole: masjid.contactRole,
        phone: masjid.phone,
        phoneAlt: masjid.phoneAlt,
        email: masjid.email,
        emailAlt: masjid.emailAlt,
        secondaryContactName: masjid.secondaryContactName,
        secondaryContactRole: masjid.secondaryContactRole,
        website: masjid.website,
        preferredContactMethod: masjid.preferredContactMethod,
        lastContactedAt: masjid.lastContactedAt?.toISOString() ?? null,
        nextFollowUpAt: masjid.nextFollowUpAt?.toISOString() ?? null,
        notes: masjid.notes,
        createdAt: masjid.createdAt.toISOString(),
        updatedAt: masjid.updatedAt.toISOString(),
        addedByName: masjid.addedByAdminUserId ? addedByNameMap.get(masjid.addedByAdminUserId) ?? null : null,
        collectionCount,
        totalAmountRaised,
        collections,
      }
    })
  } catch (error) {
    console.error("getMasjids error:", error)
    return []
  }
}

export default async function MasjidsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>
}) {
  const user = await getAdminUser()
  // Staff see only masjids they added; admins see all masjids regardless of who added them
  const filterByAddedBy = user?.role === "STAFF" ? user.id : null
  const params = await searchParams
  const masjids = await getMasjids(filterByAddedBy)

  return (
    <>
      <AdminHeader title="Masjids" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Masjids</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Masjid contact directory</p>
                  </div>
                  <MasjidCreateButton />
                </div>
                <div>
                  <MasjidsTable masjids={masjids} initialSelectedId={params?.open ?? undefined} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
