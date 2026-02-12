import { NextRequest, NextResponse } from "next/server"
import {
  buildDonationConfirmationEmail,
  buildWaterProjectDonationEmail,
  buildWaterProjectCompletionEmail,
  buildSponsorshipDonationEmail,
  buildSponsorshipCompletionEmail,
  buildFundraiserWelcomeEmail,
  buildFundraiserDonationNotificationEmail,
  buildFundraiserOtpEmail,
  buildAbandonedCheckoutEmail,
  buildRefundConfirmationEmail,
  buildAdminInviteEmail,
} from "@/lib/email-templates"
import { getOrganizationSettings } from "@/lib/settings"
import { getLogoDataUris } from "@/lib/email-logo-server"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const url = new URL(req.url)
  const { searchParams } = url
  const baseUrl = url.origin
  const settings = await getOrganizationSettings()
  const logoDataUris = getLogoDataUris()

  const get = (key: string, def: string) => searchParams.get(key) ?? def
  const getNum = (key: string, def: number) => {
    const v = searchParams.get(key)
    return v ? Number(v) : def
  }
  const getBool = (key: string, def: boolean) => (searchParams.get(key) ?? String(def)) === "1"

  let html: string
  let subject = ""

  switch (type) {
    case "donation": {
      const { subject: s, html: h } = buildDonationConfirmationEmail(
        {
          donorName: get("donorName", "Muhammad Ali"),
          orderNumber: get("orderNumber", "786-112345678"),
          items: [
            {
              title: get("itemTitle", "Palestine Emergency Relief"),
              amountPence: getNum("amountPence", 2500),
              frequency: get("frequency", "MONTHLY") || undefined,
            },
          ],
          totalPence: getNum("totalPence", 2500),
          giftAid: getBool("giftAid", true),
          manageSubscriptionUrl: getBool("includeManageLink", false)
            ? "https://example.com/manage-subscription?token=example"
            : undefined,
          baseUrl,
          logoDataUris,
        },
        settings
      )
      subject = s
      html = h
      break
    }
    case "water-donation": {
      const { subject: s, html: h } = buildWaterProjectDonationEmail(
        {
          donorName: get("donorName", "Muhammad Ali"),
          projectType: get("projectType", "WATER_PUMP"),
          location: get("location", "Village A"),
          country: get("country", "Pakistan"),
          amount: getNum("amountPence", 5000),
          donationType: get("donationType", "SADAQAH"),
          baseUrl,
          logoDataUris,
        },
        settings
      )
      subject = s
      html = h
      break
    }
    case "sponsorship-donation": {
      const { subject: s, html: h } = buildSponsorshipDonationEmail(
        {
          donorName: get("donorName", "Muhammad Ali"),
          projectType: get("projectType", "HIFZ"),
          location: get("location", ""),
          country: get("country", "UK"),
          amount: getNum("amountPence", 3000),
          donationType: get("donationType", "SADAQAH"),
          baseUrl,
          logoDataUris,
        },
        settings
      )
      subject = s
      html = h
      break
    }
    case "sponsorship-completion": {
      const { subject: s, html: h } = buildSponsorshipCompletionEmail(
        {
          donorName: get("donorName", "Muhammad Ali"),
          projectType: get("projectType", "HIFZ"),
          location: get("location", "") || undefined,
          country: get("country", "UK"),
          images: [],
          report: get("report", "Sample completion update.\n\nProject progress has been recorded."),
          completionReportPDF: get("completionReportPDF", "https://example.com/report.pdf") || undefined,
          googleDriveLink: get("googleDriveLink", "https://drive.google.com/example") || undefined,
          baseUrl,
          logoDataUris,
        },
        settings
      )
      subject = s
      html = h
      break
    }
    case "water-completion": {
      const { subject: s, html: h } = buildWaterProjectCompletionEmail(
        {
          donorName: get("donorName", "Muhammad Ali"),
          projectType: get("projectType", "WATER_PUMP"),
          location: get("location", "Village A"),
          country: get("country", "Pakistan"),
          images: [],
          report: get("report", "Sample completion report.\n\nProject completed successfully."),
          completionReportPDF: get("completionReportPDF", "https://example.com/report.pdf") || undefined,
          googleDriveLink: get("googleDriveLink", "https://drive.google.com/example") || undefined,
          baseUrl,
          logoDataUris,
        },
        settings
      )
      subject = s
      html = h
      break
    }
    case "fundraiser-welcome": {
      const { subject: s, html: h } = buildFundraiserWelcomeEmail(
        {
          fundraiserName: get("fundraiserName", "Sarah Khan"),
          fundraiserTitle: get("fundraiserTitle", "Sarah's Palestine Appeal"),
          appealTitle: get("appealTitle", "Palestine Emergency Relief"),
          fundraiserUrl: get("fundraiserUrl", "https://example.com/fundraise/sarahs-palestine"),
          baseUrl,
          logoDataUris,
        },
        settings
      )
      subject = s
      html = h
      break
    }
    case "fundraiser-donation-notification": {
      const { subject: s, html: h } = buildFundraiserDonationNotificationEmail(
        {
          fundraiserName: get("fundraiserName", "Sarah Khan"),
          fundraiserTitle: get("fundraiserTitle", "Sarah's Palestine Appeal"),
          donorName: get("donorName", "Anonymous"),
          amount: getNum("amountPence", 2000),
          donationType: get("donationType", "SADAQAH"),
          fundraiserUrl: get("fundraiserUrl", "https://example.com/fundraise/sarahs-palestine"),
          baseUrl,
          logoDataUris,
        },
        settings
      )
      subject = s
      html = h
      break
    }
    case "fundraiser-otp": {
      const { subject: s, html: h } = buildFundraiserOtpEmail(
        { code: get("code", "123456"), baseUrl, logoDataUris },
        settings
      )
      subject = s
      html = h
      break
    }
    case "abandoned-checkout": {
      const { subject: s, html: h } = buildAbandonedCheckoutEmail(
        {
          donorName: get("donorName", "Muhammad Ali"),
          orderNumber: get("orderNumber", "786-112345678"),
          items: [
            {
              title: get("itemTitle", "Palestine Emergency Relief"),
              amountPence: getNum("amountPence", 2500),
              frequency: get("frequency", "MONTHLY"),
            },
          ],
          totalPence: getNum("totalPence", 2500),
          resumeUrl: get("resumeUrl", "https://example.com/checkout?resume=example"),
          baseUrl,
          logoDataUris,
        },
        settings
      )
      subject = s
      html = h
      break
    }
    case "refund": {
      const { subject: s, html: h } = buildRefundConfirmationEmail(
        {
          donorName: get("donorName", "Muhammad Ali"),
          amountPence: getNum("amountPence", 2500),
          orderNumber: get("orderNumber", "786-112345678"),
          donateUrl: get("donateUrl", "https://example.com"),
          baseUrl,
          logoDataUris,
        },
        settings
      )
      subject = s
      html = h
      break
    }
    case "admin-invite": {
      const { subject: s, html: h } = buildAdminInviteEmail(
        {
          email: get("email", "admin@example.com"),
          setPasswordUrl: get("setPasswordUrl", "https://example.com/login/set-password?token=example"),
          baseUrl,
          logoDataUris,
        },
        settings
      )
      subject = s
      html = h
      break
    }
    default:
      return NextResponse.json({ error: "Unknown email type" }, { status: 404 })
  }

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-email-subject": subject,
    },
  })
}
