import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { SponsorshipDonationsTable } from "@/components/sponsorship-donations-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getDonations() {
  try {
    const project = await prisma.sponsorshipProject.findUnique({
      where: { projectType: "FAMILIES" },
      include: {
        donations: {
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

export default async function FamiliesDonationsPage() {
  const donations = await getDonations()

  return (
    <>
      <AdminHeader title="Families - Donations" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Families Donations</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Manage all Families sponsorship donations
                    </p>
                  </div>
                </div>
                <div>
                  {donations.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No donations yet</p>
                  ) : (
                    <SponsorshipDonationsTable donations={donations} projectType="FAMILIES" />
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
