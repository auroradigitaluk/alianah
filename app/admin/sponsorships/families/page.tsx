import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { getAdminUser } from "@/lib/admin-auth"
import { SponsorshipDonationsTable } from "@/components/sponsorship-donations-table"
import { StaffFilterSelect } from "@/components/staff-filter-select"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getDonations(staffId: string | null) {
  try {
    const project = await prisma.sponsorshipProject.findUnique({
      where: { projectType: "FAMILIES" },
      include: {
        donations: {
          where: staffId ? { addedByAdminUserId: staffId } : undefined,
          include: {
            donor: {
              select: { title: true, firstName: true, lastName: true, email: true, phone: true },
            },
            country: { select: { country: true, pricePence: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    const donations = project?.donations || []
    return donations.map((d) => ({
      id: d.id,
      amountPence: d.amountPence,
      donationType: d.donationType,
      paymentMethod: d.paymentMethod,
      giftAid: d.giftAid,
      billingAddress: d.billingAddress,
      billingCity: d.billingCity,
      billingPostcode: d.billingPostcode,
      billingCountry: d.billingCountry,
      emailSent: d.emailSent,
      reportSent: d.reportSent,
      notes: d.notes,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      completedAt: d.completedAt?.toISOString() ?? null,
      donor: d.donor,
      country: d.country,
    }))
  } catch (error) {
    console.error("Error fetching Families donations:", error)
    return []
  }
}

export default async function FamiliesDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string; open?: string }>
}) {
  const user = await getAdminUser()
  const isStaff = user?.role === "STAFF"
  const params = await searchParams
  const staffId = isStaff ? user!.id : params?.staff || null
  const initialOpenId = params?.open || null

  const staffUsers = user?.role === "ADMIN"
    ? await prisma.adminUser.findMany({
        where: { role: { in: ["ADMIN", "STAFF"] } },
        orderBy: { email: "asc" },
        select: { id: true, email: true, role: true, firstName: true, lastName: true },
      })
    : []

  const donations = await getDonations(staffId)

  return (
    <>
      <AdminHeader title="Families - Donations" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Families Donations</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Manage all Families sponsorship donations
                    </p>
                  </div>
                  {staffUsers.length > 0 && (
                    <StaffFilterSelect staffUsers={staffUsers} />
                  )}
                </div>
                <div>
                  {donations.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No donations yet</p>
                  ) : (
                    <SponsorshipDonationsTable donations={donations} projectType="FAMILIES" initialOpenId={initialOpenId} />
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
