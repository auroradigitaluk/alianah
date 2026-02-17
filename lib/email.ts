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
  buildOfflineDonationReceiptEmail,
  buildCollectionReceiptEmail,
  buildAdminInviteEmail,
  buildAdminPasswordResetEmail,
  buildAdminLoginOtpEmail,
  escapeHtml,
} from "@/lib/email-templates"
import { getOrganizationSettings } from "@/lib/settings"
import type { OrganizationSettings } from "@/lib/settings"
import { createCollectionReceiptToken } from "@/lib/collection-receipt-token"

/** Base URL for email links. */
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

/** From address with display name for inbox (e.g. "Alianah Humanity Welfare <support@alianah.org>"). */
function getFromAddress(): string {
  const email = process.env.FROM_EMAIL || "noreply@alianah.org"
  const name = process.env.FROM_NAME || "Alianah Humanity Welfare"
  return `${name} <${email}>`
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
  donationNumber: string
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
  const { subject, html } = buildDonationConfirmationEmail({ ...params, baseUrl }, settings)

  try {
    await getResend().emails.send({
      from: getFromAddress(),
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
  const { subject, html } = buildAbandonedCheckoutEmail({ ...params, baseUrl: getEmailBaseUrl(settings) }, settings)

  try {
    await getResend().emails.send({
      from: getFromAddress(),
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
  const { subject, html } = buildRefundConfirmationEmail({ ...params, baseUrl: getEmailBaseUrl(settings) }, settings)

  try {
    await getResend().emails.send({
      from: getFromAddress(),
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

  const { donorEmail, donorName, projectType, location, country, amount, donationType, donationNumber } = params

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
        donationNumber,
        baseUrl: getEmailBaseUrl(settings),
      },
      settings
    )
    await getResend().emails.send({
      from: getFromAddress(),
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
      },
      settings
    )
    await getResend().emails.send({
      from: getFromAddress(),
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
  donationNumber: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { donorEmail, donorName, projectType, location, country, amount, donationType, donationNumber } = params

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
        donationNumber,
        baseUrl: getEmailBaseUrl(settings),
      },
      settings
    )
    await getResend().emails.send({
      from: getFromAddress(),
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
      },
      settings
    )
    await getResend().emails.send({
      from: getFromAddress(),
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
      },
      settings
    )
    await getResend().emails.send({
      from: getFromAddress(),
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
      },
      settings
    )
    await getResend().emails.send({
      from: getFromAddress(),
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
    const { subject, html } = buildFundraiserOtpEmail({ code, baseUrl: getEmailBaseUrl(settings) }, settings)
    await getResend().emails.send({
      from: getFromAddress(),
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
    const { subject, html } = buildAdminInviteEmail({ email, setPasswordUrl, baseUrl: getEmailBaseUrl(settings) }, settings)
    await getResend().emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending admin invite email:", error)
    throw error
  }
}

export async function sendAdminPasswordResetEmail(params: {
  email: string
  resetPasswordUrl: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { email, resetPasswordUrl } = params

  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildAdminPasswordResetEmail(
      { email, resetPasswordUrl, baseUrl: getEmailBaseUrl(settings) },
      settings
    )
    await getResend().emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending admin password reset email:", error)
    throw error
  }
}

export async function sendAdminLoginOtpEmail(params: { email: string; code: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping OTP email")
    return
  }

  const { email, code } = params

  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildAdminLoginOtpEmail(
      { code, baseUrl: getEmailBaseUrl(settings) },
      settings
    )
    await getResend().emails.send({
      from: getFromAddress(),
      to: email,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending admin login OTP email:", error)
    throw error
  }
}

export async function sendOfflineDonationReceiptEmail(params: {
  donorEmail: string
  donorName: string
  appealTitle: string
  amountPence: number
  donationType: string
  receivedAt: Date
  donationNumber: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping offline donation receipt email")
    return
  }
  const { donorEmail } = params
  try {
    const settings = await getOrganizationSettings()
    const { subject, html } = buildOfflineDonationReceiptEmail(
      { ...params, baseUrl: getEmailBaseUrl(settings) },
      settings
    )
    await getResend().emails.send({
      from: getFromAddress(),
      to: donorEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending offline donation receipt email:", error)
    throw error
  }
}

export async function sendCollectionReceiptEmail(params: {
  recipientEmail: string
  recipientName?: string | null
  locationName: string
  collectionType: string
  collectedAt: Date
  totalPence: number
  sadaqahPence: number
  zakatPence: number
  lillahPence: number
  cardPence: number
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping collection receipt email")
    return
  }
  const { recipientEmail } = params
  try {
    const settings = await getOrganizationSettings()
    const baseUrl = getEmailBaseUrl(settings)
    let printUrl: string | undefined
    try {
      const token = createCollectionReceiptToken({
        locationName: params.locationName,
        collectionType: params.collectionType,
        collectedAt: params.collectedAt.toISOString(),
        totalPence: params.totalPence,
        sadaqahPence: params.sadaqahPence,
        zakatPence: params.zakatPence,
        lillahPence: params.lillahPence,
        cardPence: params.cardPence,
      })
      printUrl = `${baseUrl}/receipt/collection/print?t=${encodeURIComponent(token)}`
    } catch {
      // COLLECTION_RECEIPT_SECRET not set; omit print button
    }
    const { subject, html } = buildCollectionReceiptEmail(
      { ...params, baseUrl, printUrl },
      settings
    )
    await getResend().emails.send({
      from: getFromAddress(),
      to: recipientEmail,
      subject,
      html,
    })
  } catch (error) {
    console.error("Error sending collection receipt email:", error)
    throw error
  }
}
