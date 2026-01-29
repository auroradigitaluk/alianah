import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { MasjidsTable } from "@/components/masjids-table"
import { ExportCsvButton } from "@/components/export-csv-button"
import { MasjidCreateButton } from "@/components/masjid-create-button"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getMasjids() {
  try {
    const masjids = await prisma.masjid.findMany({
      orderBy: { name: "asc" },
      include: {
        collections: {
          select: {
            amountPence: true,
          },
        },
      },
    })

    return masjids.map((masjid) => {
      const collectionCount = masjid.collections.length
      const totalAmountRaised = masjid.collections.reduce(
        (sum, c) => sum + c.amountPence,
        0
      )

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
        collectionCount,
        totalAmountRaised,
      }
    })
  } catch (error) {
    return []
  }
}

export default async function MasjidsPage() {
  const masjids = await getMasjids()

  return (
    <>
      <AdminHeader
        title="Masjids"
        actions={
          <div className="flex items-center gap-2">
            <ExportCsvButton variant="masjids" data={masjids} />
            <MasjidCreateButton />
          </div>
        }
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Masjids</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Masjid contact directory</p>
                </div>
                <div>
                  <MasjidsTable masjids={masjids} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
