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
 * Returns why a water fundraiser cannot be consolidated (for user-facing message). Call when ensureWaterFundraiserConsolidated returns null.
 */
export async function getWaterFundraiserConsolidateReason(
  fundraiserId: string
): Promise<string> {
  const fundraiser = await prisma.fundraiser.findUnique({
    where: { id: fundraiserId },
    include: { waterProjectCountry: true, waterProject: true },
  })
  if (!fundraiser) return "Fundraiser not found."
  if (fundraiser.consolidatedWaterProjectDonationId != null)
    return "Already added to water projects."
  if (!fundraiser.waterProjectId || !fundraiser.waterProject)
    return "Not a water project fundraiser or project was removed."
  if (!fundraiser.waterProjectCountryId || !fundraiser.waterProjectCountry)
    return "No country selected for this water fundraiser. Edit the fundraiser and choose a country, then try again."
  const target = fundraiser.targetAmountPence ?? 0
  if (target <= 0) return "No target amount set."
  const { totalRaisedPence } = await getFundraiserTotalRaisedAndCount(fundraiserId, true)
  if (totalRaisedPence < target)
    return `Total raised (£${(totalRaisedPence / 100).toFixed(2)}) is below target (£${(target / 100).toFixed(2)}).`
  return "Unable to consolidate."
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
  if (!fundraiser) return null
  if (fundraiser.consolidatedWaterProjectDonationId != null) return null
  if (!fundraiser.waterProjectId || !fundraiser.waterProject)
    return null // not a water fundraiser or project deleted
  if (!fundraiser.waterProjectCountryId || !fundraiser.waterProjectCountry)
    return null // no country selected for this water fundraiser

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
