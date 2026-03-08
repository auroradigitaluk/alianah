import { prisma } from "@/lib/prisma"
import { getFundraiserTotalRaisedAndCount } from "@/lib/fundraiser-totals"
import { generateDonationNumber } from "@/lib/donation-number"
import { PAYMENT_METHODS, COLLECTION_SOURCES } from "@/lib/utils"
import type { WaterProjectDonation } from "@prisma/client"

export type ConsolidateOptions = {
  /** When provided (e.g. from order finalization), use these for the consolidated donation. */
  paymentMethod?: string
  collectedVia?: string | null
  transactionId?: string | null
  donationNumber?: string | null
  notesSuffix?: string
}

/**
 * When a water fundraiser reaches its target (online + approved offline), create one
 * WaterProjectDonation (consolidated) so it appears on the water pumps/wells/tanks/wudhu
 * admin page for processing and ordering. Idempotent: if already consolidated, no-op.
 * Call after: online payment finalization (for fundraisers in that order), or when
 * approving an offline/cash donation that may push the fundraiser over target.
 */
export async function ensureWaterFundraiserConsolidated(
  fundraiserId: string,
  options?: ConsolidateOptions
): Promise<WaterProjectDonation | null> {
  const fundraiser = await prisma.fundraiser.findUnique({
    where: { id: fundraiserId },
    include: {
      waterProjectCountry: true,
      waterProject: true,
    },
  })
  if (
    !fundraiser?.waterProjectId ||
    !fundraiser.waterProjectCountryId ||
    !fundraiser.waterProject ||
    !fundraiser.waterProjectCountry ||
    fundraiser.consolidatedWaterProjectDonationId != null
  )
    return null

  const target = fundraiser.targetAmountPence ?? 0
  if (target <= 0) return null

  const { totalRaisedPence } = await getFundraiserTotalRaisedAndCount(fundraiserId, true)
  if (totalRaisedPence < target) return null

  const fundraiserDonor =
    (await prisma.donor.findUnique({ where: { email: fundraiser.email } })) ??
    (await prisma.donor.create({
      data: {
        firstName: fundraiser.fundraiserName.split(" ")[0] ?? "Fundraiser",
        lastName: fundraiser.fundraiserName.split(" ").slice(1).join(" ") || fundraiser.fundraiserName,
        email: fundraiser.email,
      },
    }))

  const paymentMethod = options?.paymentMethod ?? PAYMENT_METHODS.CASH
  const collectedVia = options?.collectedVia ?? COLLECTION_SOURCES.FUNDRAISING
  const transactionId = options?.transactionId ?? null
  const donationNumber =
    options?.donationNumber ?? (await generateDonationNumber())
  const notes =
    options?.notesSuffix != null
      ? `Consolidated (fundraiser target met) | ${options.notesSuffix}`
      : "Consolidated (fundraiser target met)"

  const consolidated = await prisma.waterProjectDonation.create({
    data: {
      waterProjectId: fundraiser.waterProjectId,
      countryId: fundraiser.waterProjectCountryId,
      countryName: fundraiser.waterProjectCountry.country,
      projectTypeSnapshot: fundraiser.waterProject.projectType,
      donorId: fundraiserDonor.id,
      fundraiserId: fundraiserId,
      amountPence: fundraiser.waterProjectCountry.pricePence,
      donationType: "GENERAL",
      paymentMethod,
      collectedVia,
      transactionId,
      giftAid: false,
      isAnonymous: false,
      plaqueName: fundraiser.plaqueName || null,
      billingAddress: null,
      billingCity: null,
      billingPostcode: null,
      billingCountry: null,
      emailSent: false,
      reportSent: false,
      status: "WAITING_TO_REVIEW",
      donationNumber,
      notes,
    },
    include: {
      waterProject: true,
      country: true,
      donor: true,
      fundraiser: true,
    },
  })

  await prisma.fundraiser.update({
    where: { id: fundraiserId },
    data: { consolidatedWaterProjectDonationId: consolidated.id },
  })

  return consolidated
}
