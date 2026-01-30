import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { OfflineIncomeTable } from "@/components/offline-income-table"
import { ExportCsvButton } from "@/components/export-csv-button"
import { OfflineIncomeModal } from "@/components/offline-income-modal"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOfflineIncome() {
  try {
    return await prisma.offlineIncome.findMany({
      orderBy: { receivedAt: "desc" },
      include: { appeal: { select: { title: true } } },
    })
  } catch (error) {
    return []
  }
}

export default async function OfflineIncomePage() {
  const [
    income,
    waterDonations,
    sponsorshipDonations,
    appeals,
    waterProjects,
    waterProjectCountries,
    sponsorshipProjects,
    sponsorshipProjectCountries,
  ] = await Promise.all([
    getOfflineIncome(),
    prisma.waterProjectDonation.findMany({
      where: { collectedVia: "office" },
      orderBy: { createdAt: "desc" },
      include: {
        waterProject: { select: { projectType: true, location: true } },
        country: { select: { country: true } },
      },
    }),
    prisma.sponsorshipDonation.findMany({
      where: { collectedVia: "office" },
      orderBy: { createdAt: "desc" },
      include: {
        sponsorshipProject: { select: { projectType: true, location: true } },
        country: { select: { country: true } },
      },
    }),
    prisma.appeal.findMany({
      where: { archivedAt: null },
      select: { id: true, title: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.waterProject.findMany({
      where: { isActive: true },
      select: { id: true, projectType: true, location: true, description: true },
      orderBy: { projectType: "asc" },
    }),
    prisma.waterProjectCountry.findMany({
      where: { isActive: true },
      select: { id: true, projectType: true, country: true, pricePence: true },
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    }),
    prisma.sponsorshipProject.findMany({
      where: { isActive: true },
      select: { id: true, projectType: true, location: true, description: true },
      orderBy: { projectType: "asc" },
    }),
    prisma.sponsorshipProjectCountry.findMany({
      where: { isActive: true },
      select: { id: true, projectType: true, country: true, pricePence: true, yearlyPricePence: true },
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    }),
  ])

  const waterRows = waterDonations.map((donation) => {
    const labels: Record<string, string> = {
      WATER_PUMP: "Water Pump",
      WATER_WELL: "Water Well",
      WATER_TANK: "Water Tank",
      WUDHU_AREA: "Wudhu Area",
    }
    const projectLabel = labels[donation.waterProject.projectType] || donation.waterProject.projectType
    const location = donation.waterProject.location ? ` - ${donation.waterProject.location}` : ""
    const country = donation.country?.country ? ` (${donation.country.country})` : ""
    return {
      id: `water-${donation.id}`,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      source: donation.paymentMethod,
      receivedAt: donation.createdAt,
      appeal: { title: `Water Project - ${projectLabel}${location}${country}` },
      notes: donation.notes || null,
    }
  })

  const sponsorshipRows = sponsorshipDonations.map((donation) => {
    const labels: Record<string, string> = {
      ORPHANS: "Orphans",
      HIFZ: "Hifz",
      FAMILIES: "Families",
    }
    const projectLabel =
      labels[donation.sponsorshipProject.projectType] || donation.sponsorshipProject.projectType
    const location = donation.sponsorshipProject.location
      ? ` - ${donation.sponsorshipProject.location}`
      : ""
    const country = donation.country?.country ? ` (${donation.country.country})` : ""
    return {
      id: `sponsorship-${donation.id}`,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      source: donation.paymentMethod,
      receivedAt: donation.createdAt,
      appeal: { title: `Sponsorship - ${projectLabel}${location}${country}` },
      notes: donation.notes || null,
    }
  })

  const tableIncome = [...income, ...waterRows, ...sponsorshipRows].sort((a, b) => {
    const aDate = new Date(a.receivedAt as unknown as string | Date).getTime()
    const bDate = new Date(b.receivedAt as unknown as string | Date).getTime()
    return bDate - aDate
  })

  return (
    <>
      <AdminHeader
        title="Offline Income"
        actions={
          <div className="flex items-center gap-2">
            <ExportCsvButton variant="offlineIncome" data={tableIncome} />
            <OfflineIncomeModal
              appeals={appeals}
              waterProjects={waterProjects}
              waterProjectCountries={waterProjectCountries}
              sponsorshipProjects={sponsorshipProjects}
              sponsorshipProjectCountries={sponsorshipProjectCountries}
            />
          </div>
        }
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Offline Income</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Cash and bank transfer income</p>
                </div>
                <div>
                  <OfflineIncomeTable income={tableIncome} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
