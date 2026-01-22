import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus } from "lucide-react"
import { MasjidsTable } from "@/components/masjids-table"

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
        city: masjid.city,
        address: masjid.address,
        contactName: masjid.contactName,
        phone: masjid.phone,
        email: masjid.email,
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
          <Button asChild>
            <Link href="/admin/masjids/new">
              <Plus className="mr-2 h-4 w-4" />
              New Masjid
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
