import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { getAdminUser } from "@/lib/admin-auth"
import { getFundraiserTotalRaisedAndCount } from "@/lib/fundraiser-totals"
import { WaterProjectDonationsTable } from "@/components/water-project-donations-table"
import { StaffFilterSelect } from "@/components/staff-filter-select"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDonations(staffId: string | null) {
  try {
    const project = await prisma.waterProject.findUnique({
      where: { projectType: "WUDHU_AREA" },
      include: {
        donations: {
          where: staffId ? { addedByAdminUserId: staffId } : undefined,
          include: {
            donor: { select: { title: true, firstName: true, lastName: true, email: true, phone: true } },
            country: { select: { country: true, pricePence: true } },
            fundraiser: { select: { id: true, slug: true, title: true, targetAmountPence: true, plaqueName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })
    const donations = project?.donations || []
    const fundraiserIds = [...new Set(donations.map((d) => d.fundraiserId).filter(Boolean))] as string[]
    const totalsByFundraiser: Record<string, number> = {}
    await Promise.all(fundraiserIds.map(async (fid) => {
      const { totalRaisedPence } = await getFundraiserTotalRaisedAndCount(fid, true)
      totalsByFundraiser[fid] = totalRaisedPence
    }))
    return donations.map((donation) => ({
      id: donation.id,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      paymentMethod: donation.paymentMethod,
      giftAid: donation.giftAid,
      plaqueName: donation.plaqueName,
      billingAddress: donation.billingAddress,
      billingCity: donation.billingCity,
      billingPostcode: donation.billingPostcode,
      billingCountry: donation.billingCountry,
      emailSent: donation.emailSent,
      reportSent: donation.reportSent,
      notes: donation.notes,
      status: donation.status,
      createdAt: donation.createdAt.toISOString(),
      completedAt: donation.completedAt?.toISOString() || null,
      donor: donation.donor,
      country: donation.country,
      fundraiser: donation.fundraiser ? { id: donation.fundraiser.id, slug: donation.fundraiser.slug, title: donation.fundraiser.title, targetAmountPence: donation.fundraiser.targetAmountPence, plaqueName: donation.fundraiser.plaqueName } : null,
      fundraiserTotalRaisedPence: donation.fundraiserId ? totalsByFundraiser[donation.fundraiserId] ?? 0 : null,
      fundraiserTargetMet: donation.fundraiser != null && donation.fundraiser.targetAmountPence != null && (totalsByFundraiser[donation.fundraiserId!] ?? 0) >= donation.fundraiser.targetAmountPence,
    }))
  } catch (error) {
    console.error("Error fetching donations:", error)
    return []
  }
}

export default async function WudhuAreasDonationsPage({
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
      <AdminHeader title="Wudhu Areas - Donations" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Wudhu Areas Donations</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Comprehensive management for all Wudhu Area donations</p>
                  </div>
                  {staffUsers.length > 0 && (
                    <StaffFilterSelect staffUsers={staffUsers} />
                  )}
                </div>
                <div>
                  {donations.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No donations yet</p>
                  ) : (
                    <WaterProjectDonationsTable donations={donations} projectType="WUDHU_AREA" initialOpenId={initialOpenId} />
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
