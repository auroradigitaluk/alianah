import { getOrganizationSettings } from "@/lib/settings"
import {
  buildOfflineDonationReceiptEmail,
  buildCollectionReceiptEmail,
  buildWaterProjectDonationEmail,
  buildSponsorshipDonationEmail,
  buildAbandonedCheckoutEmail,
  buildDonationConfirmationEmail,
} from "@/lib/email-templates"

const SAMPLE_DATE = new Date()
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export async function getEmailPreviewHtml() {
  const settings = await getOrganizationSettings().catch(() => null)
  const baseUrl = BASE_URL

  const [
    offlineReceipt,
    collectionReceipt,
    waterDonation,
    sponsorshipDonation,
    abandonedCheckout,
    onlineDonation,
  ] = await Promise.all([
      Promise.resolve(
        buildOfflineDonationReceiptEmail(
          {
            donorEmail: "donor@example.com",
            donorName: "John Smith",
            appealTitle: "Ramadan Appeal 2025",
            amountPence: 5000,
            donationType: "SADAQAH",
            receivedAt: SAMPLE_DATE,
            donationNumber: "786-10000001",
            baseUrl,
          },
          settings
        )
      ),
      Promise.resolve(
        buildCollectionReceiptEmail(
          {
            recipientEmail: "masjid@example.com",
            recipientName: "Central Masjid",
            locationName: "Central Masjid",
            collectionType: "JUMMAH",
            collectedAt: SAMPLE_DATE,
            totalPence: 12500,
            sadaqahPence: 5000,
            zakatPence: 3000,
            lillahPence: 2500,
            cardPence: 2000,
            baseUrl,
            printUrl: `${baseUrl}/receipt/collection/print?t=preview`,
          },
          settings
        )
      ),
      Promise.resolve(
        buildWaterProjectDonationEmail(
          {
            donorName: "Ahmed Hassan",
            projectType: "WATER_PUMP",
            location: "Village A",
            country: "Pakistan",
            amount: 25000,
            donationType: "SADAQAH",
            donationNumber: "786-10000002",
            baseUrl,
          },
          settings
        )
      ),
      Promise.resolve(
        buildSponsorshipDonationEmail(
          {
            donorName: "Sarah Khan",
            projectType: "ORPHANS",
            location: "Dhaka",
            country: "Bangladesh",
            amount: 36000,
            donationType: "SADAQAH",
            donationNumber: "786-10000003",
            baseUrl,
          },
          settings
        )
      ),
      Promise.resolve(
        buildAbandonedCheckoutEmail(
          {
            donorName: "Fatima Ahmed",
            orderNumber: "786-20000001",
            items: [
              { title: "Ramadan Appeal 2025", amountPence: 5000 },
              { title: "Ramadan Appeal 2025 • Water bottle", amountPence: 1500, frequency: "One-off" },
            ],
            totalPence: 6500,
            resumeUrl: `${baseUrl}/checkout?order=786-20000001`,
            baseUrl,
          },
          settings
        )
      ),
      Promise.resolve(
        buildDonationConfirmationEmail(
          {
            donorName: "Aisha Khan",
            orderNumber: "786-10000123",
            items: [
              { title: "Ramadan Appeal 2025", amountPence: 10000 },
              { title: "Ramadan Appeal 2025 • Family pack", amountPence: 2500, frequency: "One-off" },
            ],
            totalPence: 12500,
            giftAid: true,
            baseUrl,
          },
          settings
        )
      ),
    ])

  return {
    "offline-receipt": offlineReceipt.html,
    "collection-receipt": collectionReceipt.html,
    "water-donation": waterDonation.html,
    "sponsorship-donation": sponsorshipDonation.html,
    "abandoned-checkout": abandonedCheckout.html,
    "online-donation": onlineDonation.html,
  }
}
