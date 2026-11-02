import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getAdminUser } from "@/lib/admin-auth"
import { getMasjidStats } from "@/lib/masjid"
import { MasjidProjectsTable, type MasjidRow } from "@/components/masjid-projects-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getRows(): Promise<MasjidRow[]> {
  try {
    const projects = await prisma.masjidProject.findMany({
      orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
    })
    return Promise.all(
      projects.map(async (p) => ({
        id: p.id,
        country: p.country,
        slug: p.slug,
        priceFromPence: p.priceFromPence,
        priceToPence: p.priceToPence,
        isActive: p.isActive,
        allowFundraising: p.allowFundraising,
        stats: await getMasjidStats(p.appealId),
      }))
    )
  } catch {
    return []
  }
}

export default async function MasjidDonationsPage() {
  const [rows, user] = await Promise.all([getRows(), getAdminUser()])
  const canManage = user?.role === "ADMIN"

  return (
    <>
      <AdminHeader title="Masjid Donations" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Countries</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Manage masjid countries, prices and content. Copy a link to use on Framer.
                    </p>
                  </div>
                  {canManage && (
                    <Button asChild>
                      <Link href="/admin/masjid-donations/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Country
                      </Link>
                    </Button>
                  )}
                </div>
                <MasjidProjectsTable rows={rows} canManage={canManage} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
