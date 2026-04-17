import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { getAdminUser } from "@/lib/admin-auth"
import { formatAdminUserName } from "@/lib/utils"
import { OfflineIncomeTable } from "@/components/offline-income-table"
import { OfflineIncomeModal } from "@/components/offline-income-modal"
import { StaffFilterSelect } from "@/components/staff-filter-select"
import { ExportCsvButton } from "@/components/export-csv-modal"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOfflineIncome(staffId: string | null) {
  try {
    return await prisma.offlineIncome.findMany({
      where: staffId ? { addedByAdminUserId: staffId } : undefined,
      orderBy: { receivedAt: "desc" },
      include: {
        appeal: { select: { title: true } },
        addedBy: { select: { email: true, firstName: true, lastName: true } },
        donor: {
          select: {
            title: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            postcode: true,
            country: true,
          },
        },
      },
    })
  } catch (error) {
    return []
  }
}

export default async function OfflineIncomePage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string }>
}) {
  const user = await getAdminUser()
  const isStaff = user?.role === "STAFF"
  const params = await searchParams
  const staffParam = params?.staff
  const staffId = isStaff ? user!.id : staffParam || null

  const staffUsers = user?.role === "ADMIN"
    ? await prisma.adminUser.findMany({
        where: { role: { in: ["ADMIN", "STAFF"] } },
        orderBy: { email: "asc" },
        select: { id: true, email: true, role: true, firstName: true, lastName: true },
      })
    : []

  const [
    income,
    fundraiserCashDonations,
    waterDonations,
    sponsorshipDonations,
    qurbaniDonations,
    appeals,
    waterProjects,
    waterProjectCountries,
    sponsorshipProjects,
    sponsorshipProjectCountries,
    qurbaniCountries,
  ] = await Promise.all([
    getOfflineIncome(staffId),
    prisma.fundraiserCashDonation.findMany({
      where: {
        status: "APPROVED",
        ...(staffId ? { reviewedByAdminUserId: staffId } : {}),
      },
      orderBy: { receivedAt: "desc" },
      include: {
        fundraiser: {
          select: {
            title: true,
            fundraiserName: true,
            appeal: { select: { title: true } },
            waterProject: { select: { projectType: true } },
          },
        },
        reviewedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.waterProjectDonation.findMany({
      where: {
        collectedVia: "office",
        ...(staffId ? { addedByAdminUserId: staffId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        waterProject: { select: { projectType: true, location: true } },
        country: { select: { country: true } },
        addedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.sponsorshipDonation.findMany({
      where: {
        collectedVia: "office",
        ...(staffId ? { addedByAdminUserId: staffId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        sponsorshipProject: { select: { projectType: true, location: true } },
        country: { select: { country: true } },
        addedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.qurbaniDonation.findMany({
      where: {
        collectedVia: "office",
        ...(staffId ? { addedByAdminUserId: staffId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        qurbaniCountry: { select: { country: true } },
        donor: { select: { firstName: true, lastName: true, email: true, phone: true } },
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
    prisma.qurbaniCountry.findMany({
      where: { isActive: true },
      select: {
        id: true,
        country: true,
        priceOneSeventhPence: true,
        priceSmallPence: true,
        priceLargePence: true,
        labelOneSeventh: true,
        labelSmall: true,
        labelLarge: true,
      },
      orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
    }),
  ])

  const waterRows = waterDonations.map((donation) => {
    const labels: Record<string, string> = {
      WATER_PUMP: "Water Pump",
      WATER_WELL: "Water Well",
      WATER_TANK: "Water Tank",
      WUDHU_AREA: "Wudhu Area",
    }
    const projectLabel = donation.waterProject
      ? (labels[donation.waterProject.projectType] || donation.waterProject.projectType)
      : "Deleted project"
    const location = donation.waterProject?.location ? ` - ${donation.waterProject.location}` : ""
    const country = donation.country?.country ? ` (${donation.country.country})` : ""
    return {
      id: `water-${donation.id}`,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      source: donation.paymentMethod,
      receivedAt: donation.createdAt,
      orderNumber: donation.donationNumber ?? null,
      appeal: { title: `Water Project - ${projectLabel}${location}${country}` },
      notes: donation.notes || null,
      addedByName: formatAdminUserName(donation.addedBy),
      itemType: "water" as const,
    }
  })

  const sponsorshipRows = sponsorshipDonations.map((donation) => {
    const labels: Record<string, string> = {
      ORPHANS: "Orphans",
      HIFZ: "Hifz",
      FAMILIES: "Families",
    }
    const projectLabel = donation.sponsorshipProject
      ? (labels[donation.sponsorshipProject.projectType] || donation.sponsorshipProject.projectType)
      : "Deleted project"
    const location = donation.sponsorshipProject?.location
      ? ` - ${donation.sponsorshipProject.location}`
      : ""
    const country = donation.country?.country ? ` (${donation.country.country})` : ""
    return {
      id: `sponsorship-${donation.id}`,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      source: donation.paymentMethod,
      receivedAt: donation.createdAt,
      orderNumber: donation.donationNumber ?? null,
      appeal: { title: `Sponsorship - ${projectLabel}${location}${country}` },
      notes: donation.notes || null,
      addedByName: formatAdminUserName(donation.addedBy),
      itemType: "sponsorship" as const,
    }
  })

  const qurbaniRows = qurbaniDonations.map((donation) => {
    const sizeLabel: Record<string, string> = {
      ONE_SEVENTH: "1/7th",
      SMALL: "Small",
      LARGE: "Large",
    }
    return {
      id: `qurbani-${donation.id}`,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      source: donation.paymentMethod,
      receivedAt: donation.createdAt,
      orderNumber: donation.donationNumber ?? null,
      appeal: { title: `Qurbani - ${donation.qurbaniCountry.country} (${sizeLabel[donation.size] || donation.size})` },
      notes: donation.notes || donation.qurbaniNames || null,
      addedByName: null as string | null,
      itemType: "qurbani" as const,
      donor: donation.donor
        ? {
            firstName: donation.donor.firstName ?? undefined,
            lastName: donation.donor.lastName ?? undefined,
            email: donation.donor.email ?? undefined,
            phone: donation.donor.phone ?? undefined,
          }
        : undefined,
    }
  })

  const qurbaniAdderIds = Array.from(
    new Set(
      qurbaniDonations
        .map((donation) => donation.addedByAdminUserId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  )
  const qurbaniAdders = qurbaniAdderIds.length
    ? await prisma.adminUser.findMany({
        where: { id: { in: qurbaniAdderIds } },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
    : []
  const qurbaniAdderMap = new Map(qurbaniAdders.map((user) => [user.id, formatAdminUserName(user)]))
  const qurbaniRowsWithAddedBy = qurbaniRows.map((row, index) => ({
    ...row,
    addedByName: qurbaniAdderMap.get(qurbaniDonations[index].addedByAdminUserId ?? "") ?? "—",
  }))

  const incomeRows = income.map((item) => ({
    id: item.id,
    amountPence: item.amountPence,
    donationType: item.donationType,
    source: item.source,
    receivedAt: item.receivedAt,
    orderNumber: item.donationNumber ?? null,
    appeal: item.appeal,
    appealId: item.appealId,
    notes: item.notes,
    addedByName: formatAdminUserName(item.addedBy),
    itemType: "appeal" as const,
    giftAid: item.giftAid,
    donor: item.donor
      ? {
          title: item.donor.title ?? undefined,
          firstName: item.donor.firstName ?? undefined,
          lastName: item.donor.lastName ?? undefined,
          email: item.donor.email ?? undefined,
          phone: item.donor.phone ?? undefined,
          address: item.donor.address ?? undefined,
          city: item.donor.city ?? undefined,
          postcode: item.donor.postcode ?? undefined,
          country: item.donor.country ?? undefined,
        }
      : undefined,
  }))

  const fundraiserCashRows = fundraiserCashDonations.map((d) => {
    const f = d.fundraiser
    const campaignTitle = f?.appeal?.title ?? (f?.waterProject ? f.waterProject.projectType.replace(/_/g, " ") : null) ?? f?.title ?? "Fundraiser"
    return {
      id: `fundraiser_cash-${d.id}`,
      amountPence: d.amountPence,
      donationType: d.donationType,
      source: d.paymentMethod,
      receivedAt: d.receivedAt,
      orderNumber: d.donationNumber ?? null,
      appeal: { title: `Fundraiser: ${campaignTitle}` },
      notes: d.notes,
      addedByName: formatAdminUserName(d.reviewedBy),
      itemType: "fundraiser_cash" as const,
      donorName: d.donorName ?? undefined,
      donorEmail: d.donorEmail ?? undefined,
      donorPhone: d.donorPhone ?? undefined,
    }
  })

  const tableIncome = [...incomeRows, ...fundraiserCashRows, ...waterRows, ...sponsorshipRows, ...qurbaniRowsWithAddedBy].sort((a, b) => {
    const aDate = new Date(a.receivedAt as unknown as string | Date).getTime()
    const bDate = new Date(b.receivedAt as unknown as string | Date).getTime()
    return bDate - aDate
  })

  return (
    <>
      <AdminHeader
        title="Offline Income"
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Offline Income</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Cash and bank transfer income</p>
                  </div>
                  <div className="flex flex-nowrap items-end gap-2">
                    {staffUsers.length > 0 && (
                      <StaffFilterSelect staffUsers={staffUsers} />
                    )}
                    <ExportCsvButton exportType="offline-income" />
                    <OfflineIncomeModal
                      appeals={appeals}
                      waterProjects={waterProjects}
                      waterProjectCountries={waterProjectCountries}
                      sponsorshipProjects={sponsorshipProjects}
                      sponsorshipProjectCountries={sponsorshipProjectCountries}
                      qurbaniCountries={qurbaniCountries}
                    />
                  </div>
                </div>
                <div>
                  <OfflineIncomeTable
                    income={tableIncome}
                    showLoggedBy={user?.role !== "STAFF"}
                    canEdit={user?.role === "ADMIN" || user?.role === "STAFF"}
                    appeals={appeals}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
