import { NextRequest, NextResponse } from "next/server"
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

const EMAIL_TYPES = [
  "offline-receipt",
  "online-donation",
  "collection-receipt",
  "water-donation",
  "sponsorship-donation",
  "abandoned-checkout",
] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params
    if (!EMAIL_TYPES.includes(type as (typeof EMAIL_TYPES)[number])) {
      return NextResponse.json({ error: "Unknown email type" }, { status: 404 })
    }

    const settings = await getOrganizationSettings().catch(() => null)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    let html: string
    let subject: string

    switch (type) {
    case "offline-receipt": {
      const doc = buildOfflineDonationReceiptEmail(
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
      subject = doc.subject
      html = doc.html
      break
    }
    case "online-donation": {
      const doc = buildDonationConfirmationEmail(
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
      subject = doc.subject
      html = doc.html
      break
    }
    case "collection-receipt": {
      const doc = buildCollectionReceiptEmail(
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
        },
        settings
      )
      subject = doc.subject
      html = doc.html
      break
    }
    case "water-donation": {
      const doc = buildWaterProjectDonationEmail(
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
      subject = doc.subject
      html = doc.html
      break
    }
    case "sponsorship-donation": {
      const doc = buildSponsorshipDonationEmail(
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
      subject = doc.subject
      html = doc.html
      break
    }
    case "abandoned-checkout": {
      const doc = buildAbandonedCheckoutEmail(
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
      subject = doc.subject
      html = doc.html
      break
    }
    default:
      return NextResponse.json({ error: "Unknown email type" }, { status: 404 })
  }

    if (!html || typeof html !== "string") {
      const fallback = "<!DOCTYPE html><html><body><p>Preview: no HTML generated</p></body></html>"
      return new NextResponse(fallback, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Email-Subject": subject,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const errorHtml = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;"><h1>Preview failed</h1><p>${message}</p></body></html>`
    return new NextResponse(errorHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }
}
