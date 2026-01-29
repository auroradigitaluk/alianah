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
          select: {
            id: true,
            amountPence: true,
            donationType: true,
            frequency: true,
            status: true,
            paymentMethod: true,
            collectedVia: true,
            transactionId: true,
            orderNumber: true,
            giftAid: true,
            createdAt: true,
            completedAt: true,
            appeal: { select: { title: true } },
            product: { select: { name: true } },
            fundraiser: { select: { fundraiserName: true, title: true } },
          },
        },
        recurringDonations: {
          select: {
            id: true,
            amountPence: true,
            donationType: true,
            frequency: true,
            status: true,
            paymentMethod: true,
            subscriptionId: true,
            nextPaymentDate: true,
            lastPaymentDate: true,
            createdAt: true,
            updatedAt: true,
            appeal: { select: { title: true } },
            product: { select: { name: true } },
          },
        },
        waterProjectDonations: {
          select: {
            id: true,
            amountPence: true,
            donationType: true,
            paymentMethod: true,
            collectedVia: true,
            transactionId: true,
            giftAid: true,
            status: true,
            createdAt: true,
            completedAt: true,
            waterProject: { select: { projectType: true } },
            country: { select: { country: true } },
            fundraiser: { select: { fundraiserName: true, title: true } },
          },
        },
        sponsorshipDonations: {
          select: {
            id: true,
            amountPence: true,
            donationType: true,
            paymentMethod: true,
            collectedVia: true,
            transactionId: true,
            giftAid: true,
            status: true,
            createdAt: true,
            completedAt: true,
            sponsorshipProject: { select: { projectType: true } },
            country: { select: { country: true } },
          },
        },
      },
    })

    const donorsByEmail = new Map<
      string,
      {
        id: string
        title?: string | null
        firstName: string
        lastName: string
        email: string
        phone?: string | null
        address?: string | null
        city?: string | null
        postcode?: string | null
        country?: string | null
        totalAmountDonated: number
        totalRecurringAmount: number
        donationCount: number
        giftAidCount: number
        lastDonationAt: string | null
        firstDonationAt: string | null
        donations: Array<{
          id: string
          category: string
          amountPence: number
          donationType?: string | null
          frequency?: string | null
          status?: string | null
          paymentMethod?: string | null
          collectedVia?: string | null
          transactionId?: string | null
          orderNumber?: string | null
          giftAid?: boolean | null
          createdAt: string
          completedAt?: string | null
          reference?: string | null
        }>
        recurringDonationCount: number
        donorIds: string[]
      }
    >()

    const isDonationCompleted = (status?: string | null) =>
      !status || status === "COMPLETED" || status === "COMPLETE"

    donors.forEach((donor) => {
      const emailKey = donor.email.trim().toLowerCase()
      const generalDonations = donor.donations.map((donation) => ({
        id: donation.id,
        category: "General",
        amountPence: donation.amountPence,
        donationType: donation.donationType,
        frequency: donation.frequency,
        status: donation.status,
        paymentMethod: donation.paymentMethod,
        collectedVia: donation.collectedVia,
        transactionId: donation.transactionId,
        orderNumber: donation.orderNumber,
        giftAid: donation.giftAid,
        createdAt: donation.createdAt.toISOString(),
        completedAt: donation.completedAt?.toISOString() ?? null,
        reference:
          donation.appeal?.title ||
          donation.product?.name ||
          donation.fundraiser?.title ||
          donation.fundraiser?.fundraiserName ||
          null,
      }))

      const waterDonations = donor.waterProjectDonations.map((donation) => ({
        id: donation.id,
        category: "Water Project",
        amountPence: donation.amountPence,
        donationType: donation.donationType,
        status: donation.status,
        paymentMethod: donation.paymentMethod,
        collectedVia: donation.collectedVia,
        transactionId: donation.transactionId,
        giftAid: donation.giftAid,
        createdAt: donation.createdAt.toISOString(),
        completedAt: donation.completedAt?.toISOString() ?? null,
        reference: [
          donation.waterProject?.projectType,
          donation.country?.country,
          donation.fundraiser?.title || donation.fundraiser?.fundraiserName,
        ]
          .filter(Boolean)
          .join(" • ") || null,
      }))

      const sponsorshipDonations = donor.sponsorshipDonations.map((donation) => ({
        id: donation.id,
        category: "Sponsorship",
        amountPence: donation.amountPence,
        donationType: donation.donationType,
        status: donation.status,
        paymentMethod: donation.paymentMethod,
        collectedVia: donation.collectedVia,
        transactionId: donation.transactionId,
        giftAid: donation.giftAid,
        createdAt: donation.createdAt.toISOString(),
        completedAt: donation.completedAt?.toISOString() ?? null,
        reference: [donation.sponsorshipProject?.projectType, donation.country?.country]
          .filter(Boolean)
          .join(" • ") || null,
      }))

      const recurringDonations = donor.recurringDonations.map((recurring) => ({
        id: recurring.id,
        category: "Recurring",
        amountPence: recurring.amountPence,
        donationType: recurring.donationType,
        frequency: recurring.frequency,
        status: recurring.status,
        paymentMethod: recurring.paymentMethod,
        giftAid: false,
        createdAt: recurring.createdAt.toISOString(),
        completedAt: recurring.lastPaymentDate?.toISOString() ?? null,
        reference: recurring.appeal?.title || recurring.product?.name || null,
      }))

      const donationItems = [
        ...generalDonations,
        ...waterDonations,
        ...sponsorshipDonations,
        ...recurringDonations,
      ]

      const completedGeneralTotal = generalDonations.reduce((sum, donation) => {
        return donation.status === "COMPLETED" ? sum + donation.amountPence : sum
      }, 0)

      const completedWaterTotal = waterDonations.reduce((sum, donation) => {
        return isDonationCompleted(donation.status) ? sum + donation.amountPence : sum
      }, 0)

      const completedSponsorshipTotal = sponsorshipDonations.reduce((sum, donation) => {
        return isDonationCompleted(donation.status) ? sum + donation.amountPence : sum
      }, 0)

      const activeRecurringTotal = recurringDonations.reduce((sum, donation) => {
        return donation.status === "ACTIVE" ? sum + donation.amountPence : sum
      }, 0)

      const donationDates = donationItems
        .map((donation) => new Date(donation.createdAt))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())

      const giftAidCount = donationItems.filter((donation) => donation.giftAid).length

      const entry = donorsByEmail.get(emailKey)
      if (entry) {
        entry.donations.push(...donationItems)
        entry.totalAmountDonated += completedGeneralTotal + completedWaterTotal + completedSponsorshipTotal
        entry.totalRecurringAmount += activeRecurringTotal
        entry.donationCount += donationItems.length
        entry.recurringDonationCount += recurringDonations.length
        entry.giftAidCount += giftAidCount
        entry.donorIds.push(donor.id)

        if (!entry.title && donor.title) entry.title = donor.title
        if (!entry.phone && donor.phone) entry.phone = donor.phone
        if (!entry.address && donor.address) entry.address = donor.address
        if (!entry.city && donor.city) entry.city = donor.city
        if (!entry.postcode && donor.postcode) entry.postcode = donor.postcode
        if (!entry.country && donor.country) entry.country = donor.country
        if ((!entry.firstName || entry.firstName === "Unknown") && donor.firstName) entry.firstName = donor.firstName
        if ((!entry.lastName || entry.lastName === "Unknown") && donor.lastName) entry.lastName = donor.lastName

        if (donationDates.length > 0) {
          const firstDate = donationDates[0]
          const lastDate = donationDates[donationDates.length - 1]
          if (!entry.firstDonationAt || firstDate < new Date(entry.firstDonationAt)) {
            entry.firstDonationAt = firstDate.toISOString()
          }
          if (!entry.lastDonationAt || lastDate > new Date(entry.lastDonationAt)) {
            entry.lastDonationAt = lastDate.toISOString()
          }
        }
      } else {
        const firstDonationAt = donationDates.length > 0 ? donationDates[0].toISOString() : null
        const lastDonationAt =
          donationDates.length > 0 ? donationDates[donationDates.length - 1].toISOString() : null

        donorsByEmail.set(emailKey, {
          id: `email:${emailKey}`,
          title: donor.title,
          firstName: donor.firstName || "Unknown",
          lastName: donor.lastName || "Donor",
          email: donor.email,
          phone: donor.phone,
          address: donor.address,
          city: donor.city,
          postcode: donor.postcode,
          country: donor.country,
          totalAmountDonated: completedGeneralTotal + completedWaterTotal + completedSponsorshipTotal,
          totalRecurringAmount: activeRecurringTotal,
          donationCount: donationItems.length,
          giftAidCount,
          lastDonationAt,
          firstDonationAt,
          donations: donationItems,
          recurringDonationCount: recurringDonations.length,
          donorIds: [donor.id],
        })
      }
    })

    return Array.from(donorsByEmail.values()).map((donor) => ({
      ...donor,
      totalAmountDonated: donor.totalAmountDonated + donor.totalRecurringAmount,
    }))
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
