import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { WaterProjectDonationsTable } from "@/components/water-project-donations-table"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDonations() {
  try {
    const project = await prisma.waterProject.findUnique({
      where: { projectType: "WATER_TANK" },
      include: {
        donations: {
          include: {
            donor: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            country: {
              select: {
                country: true,
                pricePence: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    // Explicitly serialize to ensure all fields are included
    const donations = project?.donations || []
    return donations.map((donation) => ({
      id: donation.id,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      paymentMethod: donation.paymentMethod,
      giftAid: donation.giftAid,
      emailSent: donation.emailSent,
      reportSent: donation.reportSent,
      notes: donation.notes,
      status: donation.status,
      createdAt: donation.createdAt.toISOString(),
      completedAt: donation.completedAt?.toISOString() || null,
      donor: donation.donor,
      country: donation.country,
    }))
  } catch (error) {
    console.error("Error fetching donations:", error)
    return []
  }
}

export default async function WaterTanksDonationsPage() {
  const donations = await getDonations()

  return (
    <>
      <AdminHeader title="Water Tanks - Donations" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Water Tanks Donations</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Comprehensive management for all Water Tank donations</p>
                  </div>
                </div>
                <div>
                  {donations.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No donations yet</p>
                  ) : (
                    <WaterProjectDonationsTable donations={donations} projectType="WATER_TANK" />
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
