import { prisma } from "@/lib/prisma"
import { isPlaceholderDonorEmail } from "@/lib/utils"
import {
  sendOfflineDonationReceiptEmail,
  sendWaterProjectDonationEmail,
  sendSponsorshipDonationEmail,
} from "@/lib/email"

export type OfflineIncomeReceiptItemType =
  | "appeal"
  | "water"
  | "sponsorship"
  | "qurbani"
  | "fundraiser_cash"

function donorDisplayName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Donor"
}

/** Sends the appropriate receipt email for an offline income table row id. */
export async function resendOfflineIncomeReceipt(
  compositeId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (compositeId.startsWith("fundraiser_cash-")) {
    const donationId = compositeId.replace("fundraiser_cash-", "")
    const donation = await prisma.fundraiserCashDonation.findUnique({
      where: { id: donationId },
      include: {
        fundraiser: {
          select: {
            appeal: { select: { title: true } },
            waterProject: { select: { projectType: true } },
            title: true,
          },
        },
      },
    })
    if (!donation) {
      return { ok: false, error: "Not found", status: 404 }
    }
    const email = donation.donorEmail?.trim()
    if (!email || isPlaceholderDonorEmail(email)) {
      return { ok: false, error: "No valid donor email on this entry", status: 400 }
    }
    const campaignTitle =
      donation.fundraiser?.appeal?.title ??
      (donation.fundraiser?.waterProject
        ? donation.fundraiser.waterProject.projectType.replace(/_/g, " ")
        : null) ??
      donation.fundraiser?.title ??
      "Fundraiser"
    await sendOfflineDonationReceiptEmail({
      donorEmail: email,
      donorName: donation.donorName?.trim() || "Donor",
      appealTitle: campaignTitle,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      receivedAt: donation.receivedAt,
      donationNumber:
        donation.donationNumber ?? `FC-${donation.id.slice(-8).toUpperCase()}`,
    })
    return { ok: true }
  }

  if (compositeId.startsWith("water-")) {
    const donationId = compositeId.replace("water-", "")
    const donation = await prisma.waterProjectDonation.findUnique({
      where: { id: donationId },
      include: {
        donor: true,
        waterProject: { select: { projectType: true, location: true } },
        country: { select: { country: true } },
      },
    })
    if (!donation) {
      return { ok: false, error: "Not found", status: 404 }
    }
    if (!donation.donor || isPlaceholderDonorEmail(donation.donor.email)) {
      return { ok: false, error: "No valid donor email on this entry", status: 400 }
    }
    await sendWaterProjectDonationEmail({
      donorEmail: donation.donor.email,
      donorName: donorDisplayName(donation.donor.firstName, donation.donor.lastName),
      projectType: donation.waterProject?.projectType ?? "WATER_PROJECT",
      location: donation.waterProject?.location ?? null,
      country: donation.country?.country ?? donation.countryName ?? "",
      amount: donation.amountPence,
      donationType: donation.donationType,
      donationNumber: donation.donationNumber ?? donation.id,
    })
    await prisma.waterProjectDonation.update({
      where: { id: donationId },
      data: { emailSent: true },
    })
    return { ok: true }
  }

  if (compositeId.startsWith("sponsorship-")) {
    const donationId = compositeId.replace("sponsorship-", "")
    const donation = await prisma.sponsorshipDonation.findUnique({
      where: { id: donationId },
      include: {
        donor: true,
        sponsorshipProject: { select: { projectType: true, location: true } },
        country: { select: { country: true } },
      },
    })
    if (!donation) {
      return { ok: false, error: "Not found", status: 404 }
    }
    if (!donation.donor || isPlaceholderDonorEmail(donation.donor.email)) {
      return { ok: false, error: "No valid donor email on this entry", status: 400 }
    }
    await sendSponsorshipDonationEmail({
      donorEmail: donation.donor.email,
      donorName: donorDisplayName(donation.donor.firstName, donation.donor.lastName),
      projectType: donation.sponsorshipProject?.projectType ?? donation.projectTypeSnapshot ?? "ORPHANS",
      location: donation.sponsorshipProject?.location ?? null,
      country: donation.country?.country ?? donation.countryName ?? "",
      amount: donation.amountPence,
      donationType: donation.donationType,
      donationNumber: donation.donationNumber ?? donation.id,
    })
    await prisma.sponsorshipDonation.update({
      where: { id: donationId },
      data: { emailSent: true },
    })
    return { ok: true }
  }

  if (compositeId.startsWith("qurbani-")) {
    const donationId = compositeId.replace("qurbani-", "")
    const donation = await prisma.qurbaniDonation.findUnique({
      where: { id: donationId },
      include: {
        donor: true,
        qurbaniCountry: { select: { country: true } },
      },
    })
    if (!donation) {
      return { ok: false, error: "Not found", status: 404 }
    }
    if (!donation.donor || isPlaceholderDonorEmail(donation.donor.email)) {
      return { ok: false, error: "No valid donor email on this entry", status: 400 }
    }
    await sendOfflineDonationReceiptEmail({
      donorEmail: donation.donor.email,
      donorName: donorDisplayName(donation.donor.firstName, donation.donor.lastName),
      appealTitle: `Qurbani - ${donation.qurbaniCountry.country}`,
      amountPence: donation.amountPence,
      donationType: donation.donationType,
      receivedAt: donation.createdAt,
      donationNumber: donation.donationNumber ?? donation.id,
    })
    return { ok: true }
  }

  const item = await prisma.offlineIncome.findUnique({
    where: { id: compositeId },
    include: {
      donor: true,
      appeal: { select: { title: true } },
    },
  })
  if (!item) {
    return { ok: false, error: "Not found", status: 404 }
  }
  if (!item.donor || !item.appeal || isPlaceholderDonorEmail(item.donor.email)) {
    return { ok: false, error: "No valid donor email on this entry", status: 400 }
  }
  await sendOfflineDonationReceiptEmail({
    donorEmail: item.donor.email,
    donorName: donorDisplayName(item.donor.firstName, item.donor.lastName),
    appealTitle: item.appeal.title,
    amountPence: item.amountPence,
    donationType: item.donationType,
    receivedAt: item.receivedAt,
    donationNumber: item.donationNumber ?? item.id,
  })
  return { ok: true }
}
