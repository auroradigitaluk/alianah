import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { DonorsTable } from "@/components/donors-table"
import { ExportCsvButton } from "@/components/export-csv-button"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDonors() {
  try {
    const donors = await prisma.donor.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        donations: {
          where: {
            status: "COMPLETED",
          },
          select: {
            amountPence: true,
          },
        },
        recurringDonations: {
          where: {
            status: "ACTIVE",
          },
          select: {
            amountPence: true,
          },
        },
      },
    })

    return donors.map((donor) => {
      const totalDonations = donor.donations.reduce((sum, d) => sum + d.amountPence, 0)
      const totalRecurring = donor.recurringDonations.reduce((sum, r) => sum + r.amountPence, 0)
      const totalAmountDonated = totalDonations + totalRecurring

      return {
        id: donor.id,
        title: donor.title,
        firstName: donor.firstName,
        lastName: donor.lastName,
        email: donor.email,
        phone: donor.phone,
        address: donor.address,
        city: donor.city,
        postcode: donor.postcode,
        country: donor.country,
        totalAmountDonated,
      }
    })
  } catch (error) {
    return []
  }
}

export default async function DonorsPage() {
  const donors = await getDonors()

  return (
    <>
      <AdminHeader
        title="Donors"
        actions={<ExportCsvButton variant="donors" data={donors} />}
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-base sm:text-lg font-semibold">Donors</h2>
                  <p className="text-xs sm:text-xs sm:text-sm text-muted-foreground">Donor information</p>
                </div>
                <div>
                  <DonorsTable donors={donors} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
