import { Resend } from "resend"
import {
  buildAbandonedCheckoutEmail,
  buildRefundConfirmationEmail,
  buildDonationConfirmationEmail,
  buildFundraiserDonationNotificationEmail,
  buildFundraiserOtpEmail,
  buildFundraiserWelcomeEmail,
  buildSponsorshipDonationEmail,
  buildSponsorshipCompletionEmail,
  buildWaterProjectCompletionEmail,
  buildWaterProjectDonationEmail,
  buildAdminInviteEmail,
  escapeHtml,
} from "@/lib/email-templates"
import { getOrganizationSettings } from "@/lib/settings"
import type { OrganizationSettings } from "@/lib/settings"
import { getLogoDataUris } from "@/lib/email-logo-server"

/** Base URL for email assets (logo, links). Use same logic everywhere so logo always loads. */
function getEmailBaseUrl(settings: OrganizationSettings | null): string {
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl && !vercelUrl.startsWith("localhost")) {
    return `https://${vercelUrl.replace(/\/$/, "")}`
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  }
  if (settings?.websiteUrl) {
    try {
      return new URL(settings.websiteUrl).origin
    } catch {
      // fall through
    }
  }
  return "https://www.alianah.org"
}

// Lazy initialization to avoid errors during build when API key is not available
let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set")
    }
    resend = new Resend(apiKey)
  }
  return resend
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  WATER_PUMP: "Water Pump",
  WATER_WELL: "Water Well",
  WATER_TANK: "Water Tank",
  WUDHU_AREA: "Wudhu Area",
}

const SPONSORSHIP_TYPE_LABELS: Record<string, string> = {
  ORPHANS: "Orphans",
  HIFZ: "Hifz",
  FAMILIES: "Families",
}

const DONATION_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General Donation",
  SADAQAH: "Sadaqah",
  ZAKAT: "Zakat",
  LILLAH: "Lillah",
}

interface DonationEmailParams {
  donorEmail: string
  donorName: string
  projectType: string
  location?: string | null
  country: string
  amount: number
  donationType: string
}

interface CompletionEmailParams {
  donorEmail: string
  donorName: string
  projectType: string
  location?: string | null
  country: string
  images: string[]
  report: string
  completionReportPDF?: string | null
  googleDriveLink?: string
}

interface FundraiserWelcomeEmailParams {
  fundraiserEmail: string
  fundraiserName: string
  fundraiserTitle: string
  appealTitle: string
  fundraiserUrl: string
}

interface FundraiserDonationNotificationParams {
  fundraiserEmail: string
  fundraiserName: string
  fundraiserTitle: string
  donorName: string
  amount: number
  donationType: string
  fundraiserUrl: string
}

interface FundraiserOTPEmailParams {
  email: string
  code: string
}

export async function sendDonationConfirmationEmail(params: {
  donorEmail: string
  donorName: string
  orderNumber: string
  items: Array<{ title: string; amountPence: number; frequency?: string }>
  totalPence: number
  giftAid: boolean
  manageSubscriptionUrl?: string
  baseUrl?: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { donorEmail } = params
  const settings = await getOrganizationSettings()
  const baseUrl = params.baseUrl ?? getEmailBaseUrl(settings)
  const logoDataUris = getLogoDataUris()
  const { subject, html } = buildDonationConfirmationEmail({ ...params, baseUrl, logoDataUris }, settings)

  try {
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: donorEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending donation confirmation email:", error)
    throw error
  }
}

export async function sendAbandonedCheckoutEmail(params: {
  donorEmail: string
  donorName: string
  orderNumber: string
  items: Array<{ title: string; amountPence: number; frequency?: string }>
  totalPence: number
  resumeUrl: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { donorEmail } = params
  const settings = await getOrganizationSettings()
  const { subject, html } = buildAbandonedCheckoutEmail({ ...params, baseUrl: getEmailBaseUrl(settings), logoDataUris: getLogoDataUris() }, settings)

  try {
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: donorEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending abandoned checkout email:", error)
    throw error
  }
}

export async function sendRefundConfirmationEmail(params: {
  donorEmail: string
  donorName: string
  amountPence: number
  orderNumber?: string | null
  donateUrl: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { donorEmail } = params
  const settings = await getOrganizationSettings()
  const { subject, html } = buildRefundConfirmationEmail({ ...params, baseUrl: getEmailBaseUrl(settings), logoDataUris: getLogoDataUris() }, settings)

  try {
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: donorEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending refund confirmation email:", error)
    throw error
  }
}

export async function sendWaterProjectDonationEmail(params: DonationEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { donorEmail, donorName, projectType, location, country, amount, donationType } = params

  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildWaterProjectDonationEmail(
      {
        donorName,
        projectType,
        location,
        country,
        amount,
        donationType,
        baseUrl: getEmailBaseUrl(settings),
        logoDataUris: getLogoDataUris(),
      },
      settings
    )
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: donorEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending donation email:", error)
    throw error
  }
}

export async function sendWaterProjectCompletionEmail(params: CompletionEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildWaterProjectCompletionEmail(
      {
        donorName: params.donorName,
        projectType: params.projectType,
        location: params.location,
        country: params.country,
        images: params.images,
        report: params.report,
        completionReportPDF: params.completionReportPDF,
        googleDriveLink: params.googleDriveLink,
        baseUrl: getEmailBaseUrl(settings),
        logoDataUris: getLogoDataUris(),
      },
      settings
    )
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: params.donorEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending completion email:", error)
    throw error
  }
}

export async function sendSponsorshipDonationEmail(params: {
  donorEmail: string
  donorName: string
  projectType: string
  location?: string | null
  country: string
  amount: number
  donationType: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { donorEmail, donorName, projectType, location, country, amount, donationType } = params

  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildSponsorshipDonationEmail(
      {
        donorName,
        projectType,
        location,
        country,
        amount,
        donationType,
        baseUrl: getEmailBaseUrl(settings),
        logoDataUris: getLogoDataUris(),
      },
      settings
    )
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: donorEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending sponsorship donation email:", error)
    throw error
  }
}

export async function sendSponsorshipCompletionEmail(params: {
  donorEmail: string
  donorName: string
  projectType: string
  location?: string | null
  country: string
  images: string[]
  report: string
  completionReportPDF?: string | null
  googleDriveLink?: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildSponsorshipCompletionEmail(
      {
        donorName: params.donorName,
        projectType: params.projectType,
        location: params.location,
        country: params.country,
        images: params.images,
        report: params.report,
        completionReportPDF: params.completionReportPDF,
        googleDriveLink: params.googleDriveLink,
        baseUrl: getEmailBaseUrl(settings),
        logoDataUris: getLogoDataUris(),
      },
      settings
    )
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: params.donorEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending sponsorship completion email:", error)
    throw error
  }
}

export async function sendFundraiserWelcomeEmail(params: FundraiserWelcomeEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { fundraiserEmail, fundraiserName, fundraiserTitle, appealTitle, fundraiserUrl } = params

  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildFundraiserWelcomeEmail(
      {
        fundraiserName,
        fundraiserTitle,
        appealTitle,
        fundraiserUrl,
        baseUrl: getEmailBaseUrl(settings),
        logoDataUris: getLogoDataUris(),
      },
      settings
    )
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: fundraiserEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending fundraiser welcome email:", error)
    throw error
  }
}

export async function sendFundraiserDonationNotification(params: FundraiserDonationNotificationParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { fundraiserEmail, fundraiserName, fundraiserTitle, donorName, amount, donationType, fundraiserUrl } = params

  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildFundraiserDonationNotificationEmail(
      {
        fundraiserName,
        fundraiserTitle,
        donorName,
        amount,
        donationType,
        fundraiserUrl,
        baseUrl: getEmailBaseUrl(settings),
        logoDataUris: getLogoDataUris(),
      },
      settings
    )
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: fundraiserEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending fundraiser donation notification:", error)
    throw error
  }
}

export async function sendFundraiserOTPEmail(params: FundraiserOTPEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { email, code } = params

  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildFundraiserOtpEmail({ code, baseUrl: getEmailBaseUrl(settings), logoDataUris: getLogoDataUris() }, settings)
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: email,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending OTP email:", error)
    throw error
  }
}

export async function sendAdminInviteEmail(params: {
  email: string
  setPasswordUrl: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { email, setPasswordUrl } = params

  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildAdminInviteEmail({ email, setPasswordUrl, baseUrl: getEmailBaseUrl(settings), logoDataUris: getLogoDataUris() }, settings)
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: email,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending admin invite email:", error)
    throw error
  }
}
