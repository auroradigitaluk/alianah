import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { getAdminUser } from "@/lib/admin-auth"
import { SponsorshipDonationsTable } from "@/components/sponsorship-donations-table"
import { StaffFilterSelect } from "@/components/staff-filter-select"
import { getSponsorshipDonationsForAdmin } from "@/lib/sponsorship-donations-admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function OrphansDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string; open?: string }>
}) {
  const user = await getAdminUser()
  const params = await searchParams
  const staffId = params?.staff || null
  const initialOpenId = params?.open || null

  const staffUsers = user?.role === "ADMIN"
    ? await prisma.adminUser.findMany({
        where: { role: { in: ["ADMIN", "STAFF"] } },
        orderBy: { email: "asc" },
        select: { id: true, email: true, role: true, firstName: true, lastName: true },
      })
    : []

  const { projectId, donations } = await getSponsorshipDonationsForAdmin("ORPHANS", staffId)

  return (
    <>
      <AdminHeader title="Orphans - Donations" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Orphans Donations</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Manage all Orphans sponsorship donations
                    </p>
                  </div>
                  {staffUsers.length > 0 && (
                    <StaffFilterSelect staffUsers={staffUsers} />
                  )}
                </div>
                <div>
                  {projectId ? (
                    <SponsorshipDonationsTable donations={donations} projectType="ORPHANS" projectId={projectId} initialOpenId={initialOpenId} />
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground">No project found</p>
                  )}
                  {donations.length === 0 && projectId && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">No donations yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
