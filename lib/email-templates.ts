import type { OrganizationSettings } from "@/lib/settings"

type EmailDoc = { subject: string; html: string }

const DEFAULT_CHARITY_NAME = "Alianah Humanity Welfare"
const DEFAULT_SUPPORT_EMAIL = "support@alianah.org"
const DEFAULT_WEBSITE_URL = "https://www.alianah.org"

/**
 * Absolute public URL for email logo. Email clients cannot load local/relative paths.
 * Deploy: upload public/logo-light.png and public/logo-dark.png to production at
 * /public_html/email-assets/ so https://alianah.org/email-assets/logo-light.png (and logo-dark.png) are live.
 */
const EMAIL_LOGO_LIGHT_URL = "https://alianah.org/email-assets/logo-light.png"

// Brand / UI-aligned palette (email-safe) – Alianah greens
const BRAND = {
  primary: "#009900", // brand green
  primaryText: "#ffffff",
  primaryTint: "#f2fbf2", // light green card background
  background: "#f6f7fb",
  surface: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  infoBg: "#e8f5e9", // green tint for info blocks (brand-aligned)
  infoBorder: "#a7f3d0",
}

function logoTextHtml(settings?: OrganizationSettings | null) {
  const name = settings?.charityName ?? DEFAULT_CHARITY_NAME
  return `<span style="display:block; text-align:center; font-size:16px; font-weight:600; color:${BRAND.text};">${escapeHtml(name)}</span>`
}

export function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function moneyPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`
}

function layout(
  params: {
    preheader: string
    title: string
    introHtml: string
    contentHtml: string
    footerHtml?: string
  },
  settings?: OrganizationSettings | null
): string {
  const { preheader, title, introHtml, contentHtml, footerHtml } = params
  const supportEmail = settings?.supportEmail ?? DEFAULT_SUPPORT_EMAIL
  const websiteUrl = settings?.websiteUrl ?? DEFAULT_WEBSITE_URL
  const charityName = settings?.charityName ?? DEFAULT_CHARITY_NAME
  const displayUrl = websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")

  const standardFooter = `
    Need help or want to update your details? Email ${escapeHtml(supportEmail)}.
    This mailbox is not monitored. Please use the email above for any questions.
    <div style="margin-top: 8px;">
      <a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer" style="color:${BRAND.primary}; text-decoration:none;">${escapeHtml(displayUrl)}</a>
    </div>
  `

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0; padding:0; background:#ffffff; color:${BRAND.text}; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height:1.5;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND.background}; padding: 24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px;">
            <tr>
              <td style="padding: 8px 8px 16px 8px;">
                ${logoTextHtml(settings)}
              </td>
            </tr>

            <tr>
              <td style="background:${BRAND.surface}; border: 1px solid ${BRAND.border}; border-radius: 16px; overflow:hidden;">
                <div style="padding: 24px;">
                  <h1 style="margin: 0 0 8px 0; font-size: 22px; line-height: 1.25; letter-spacing:-0.02em;">
                    ${escapeHtml(title)}
                  </h1>
                  ${introHtml}
                </div>

                <div style="padding: 0 24px 24px 24px;">
                  ${contentHtml}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding: 16px 8px 0 8px;">
                <div style="color:${BRAND.muted}; font-size: 12px; line-height: 1.6;">
                  ${footerHtml ?? standardFooter}
                  <div style="margin-top: 10px;">
                    © ${new Date().getFullYear()} ${escapeHtml(charityName)}
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `
}

// Clean-style helpers (H&M-style: no cards, sections with labels + spacing only)
const CLEAN = {
  text: "#111827",
  muted: "#6b7280",
}

/** Section: bold uppercase label + content, no border/background (H&M-style). */
function section(params: { title?: string; bodyHtml: string }) {
  return `
<div style="margin-bottom: 24px;">
  ${params.title ? `<div style="font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color:${CLEAN.muted}; margin-bottom: 8px;">${escapeHtml(params.title)}</div>` : ""}
  <div style="font-size: 14px; color:${CLEAN.text}; line-height: 1.5;">${params.bodyHtml}</div>
</div>
  `
}

function button(params: { href: string; label: string }) {
  const href = escapeHtml(params.href)
  const label = escapeHtml(params.label)
  return `
<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background:${BRAND.primary}; color:#ffffff; text-decoration:none; padding: 14px 28px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">${label}</a>
  `
}

/** Clean, minimal donation confirmation layout (single version, no dark mode). Logo at top, clear sections, one CTA. */
function donationConfirmationLayout(
  params: {
    preheader: string
    charityName: string
    supportEmail: string
    websiteUrl: string
    displayUrl: string
    logoUrl: string
    heading: string
    orderNumber: string
    orderDate: string
    introParagraph: string
    ctaHtml: string
    summaryRowsHtml: string
    totalPence: number
    giftAidHtml: string
    manageSubscriptionHtml: string
  }
): string {
  const totalFormatted = moneyPence(params.totalPence)
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(params.heading)} - ${escapeHtml(params.charityName)}</title>
  </head>
  <body style="margin:0; padding:0; background:#f5f5f5; color:#111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.5;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapeHtml(params.preheader)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f5;">
      <tr>
        <td align="center" style="padding: 32px 16px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">
            <tr>
              <td align="left" style="padding-bottom: 32px;">
                <img src="${escapeHtml(params.logoUrl)}" alt="${escapeHtml(params.charityName)}" width="60" height="auto" style="display:block; max-width:60px; height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 24px; font-weight: 700; font-size: 18px; letter-spacing: 0.02em; text-transform: uppercase; color:#111827;">${escapeHtml(params.heading)}</td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color:#6b7280;">Donation number</td>
            </tr>
            <tr>
              <td style="padding: 0 0 20px; font-size: 14px; font-weight: 700; color:#111827;">${params.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 0 0 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color:#6b7280;">Donation date</td>
            </tr>
            <tr>
              <td style="padding: 0 0 24px; font-size: 14px; color:#111827;">${params.orderDate}</td>
            </tr>
            <tr>
              <td style="padding: 0 0 28px; font-size: 14px; color:#374151;">${params.introParagraph}</td>
            </tr>
            ${params.ctaHtml ? `<tr><td style="padding: 0 0 32px;">${params.ctaHtml}</td></tr>` : ""}
            <tr>
              <td style="padding: 0 0 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color:#6b7280;">Donation summary</td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
                  ${params.summaryRowsHtml}
                  <tr>
                    <td style="padding: 12px 0 0; border-top: 1px solid #e5e7eb; font-weight: 700; color:#111827;">Total</td>
                    <td align="right" style="padding: 12px 0 0; border-top: 1px solid #e5e7eb; font-weight: 700; font-size: 16px; color:#111827;">${totalFormatted}</td>
                  </tr>
                </table>
              </td>
            </tr>
            ${params.giftAidHtml ? `<tr><td style="padding: 0 0 20px; font-size: 13px;">${params.giftAidHtml}</td></tr>` : ""}
            ${params.manageSubscriptionHtml ? `<tr><td style="padding: 0 0 32px;">${params.manageSubscriptionHtml}</td></tr>` : ""}
            <tr>
              <td style="padding: 24px 0 0; border-top: 1px solid #e5e7eb; font-size: 12px; color:#6b7280;">
                Need help? Email <a href="mailto:${escapeHtml(params.supportEmail)}" style="color:${BRAND.primary}; text-decoration:none;">${escapeHtml(params.supportEmail)}</a>.
                <div style="margin-top: 8px;"><a href="${escapeHtml(params.websiteUrl)}" style="color:${BRAND.primary}; text-decoration:none;">${escapeHtml(params.displayUrl)}</a></div>
                <div style="margin-top: 12px;">© ${new Date().getFullYear()} ${escapeHtml(params.charityName)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `
}

/** Clean layout for all emails: logo left, heading, optional intro, content, same footer. Single version, no dark mode. */
function cleanLayout(
  params: {
    preheader: string
    charityName: string
    supportEmail: string
    websiteUrl: string
    displayUrl: string
    logoUrl: string
    title: string
    heading: string
    aboveContentHtml?: string
    ctaHtml?: string
    contentHtml: string
  }
): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(params.title)} - ${escapeHtml(params.charityName)}</title>
  </head>
  <body style="margin:0; padding:0; background:#f5f5f5; color:#111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.5;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapeHtml(params.preheader)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f5;">
      <tr>
        <td align="center" style="padding: 32px 16px 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">
            <tr>
              <td align="left" style="padding-bottom: 32px;">
                <img src="${escapeHtml(params.logoUrl)}" alt="${escapeHtml(params.charityName)}" width="60" height="auto" style="display:block; max-width:60px; height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 24px; font-weight: 700; font-size: 18px; letter-spacing: 0.02em; text-transform: uppercase; color:#111827;">${escapeHtml(params.heading)}</td>
            </tr>
            ${params.aboveContentHtml ? `<tr><td style="padding: 0 0 24px; font-size: 14px; color:#374151;">${params.aboveContentHtml}</td></tr>` : ""}
            ${params.ctaHtml ? `<tr><td style="padding: 0 0 24px;">${params.ctaHtml}</td></tr>` : ""}
            <tr>
              <td style="padding: 0 0 32px;">${params.contentHtml}</td>
            </tr>
            <tr>
              <td style="padding: 24px 0 0; border-top: 1px solid #e5e7eb; font-size: 12px; color:#6b7280;">
                Need help? Email <a href="mailto:${escapeHtml(params.supportEmail)}" style="color:${BRAND.primary}; text-decoration:none;">${escapeHtml(params.supportEmail)}</a>.
                <div style="margin-top: 8px;"><a href="${escapeHtml(params.websiteUrl)}" style="color:${BRAND.primary}; text-decoration:none;">${escapeHtml(params.displayUrl)}</a></div>
                <div style="margin-top: 12px;">© ${new Date().getFullYear()} ${escapeHtml(params.charityName)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `
}

function getCleanLayoutDefaults(settings?: OrganizationSettings | null, _baseUrl?: string) {
  const charityName = settings?.charityName ?? DEFAULT_CHARITY_NAME
  const supportEmail = settings?.supportEmail ?? DEFAULT_SUPPORT_EMAIL
  const websiteUrl = settings?.websiteUrl ?? DEFAULT_WEBSITE_URL
  const displayUrl = websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
  return { charityName, supportEmail, websiteUrl, displayUrl, logoUrl: EMAIL_LOGO_LIGHT_URL }
}

export type DonationConfirmationEmailParams = {
  donorName: string
  orderNumber: string
  items: Array<{ title: string; amountPence: number; frequency?: string }>
  totalPence: number
  giftAid: boolean
  manageSubscriptionUrl?: string
  baseUrl?: string
}

export function buildDonationConfirmationEmail(
  params: DonationConfirmationEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const orderNumber = escapeHtml(params.orderNumber)
  const preheader = `Your donation has been received. Ref ${params.orderNumber}`
  const charityName = settings?.charityName ?? DEFAULT_CHARITY_NAME
  const supportEmail = settings?.supportEmail ?? DEFAULT_SUPPORT_EMAIL
  const websiteUrl = settings?.websiteUrl ?? DEFAULT_WEBSITE_URL
  const displayUrl = websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
  const subject = `Donation confirmation - ${charityName}`

  const logoUrl = EMAIL_LOGO_LIGHT_URL

  const receiptDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  const summaryRowsHtml = params.items
    .map((i) => {
      const title = escapeHtml(i.title)
      const amount = moneyPence(i.amountPence)
      const freq = i.frequency ? ` <span style="color:#6b7280; font-size: 12px;">(${escapeHtml(i.frequency)})</span>` : ""
      return `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color:#111827;">${title}${freq}</td><td align="right" style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color:#111827;">${amount}</td></tr>`
    })
    .join("")

  const giftAidHtml = params.giftAid
    ? `<span style="color:${BRAND.primary}; font-weight: 600;">Gift Aid claimed</span> — your donation is worth 25% more at no extra cost to you.`
    : `Gift Aid not claimed.`

  const ctaHtml = params.manageSubscriptionUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td style="border-radius: 4px; background:${BRAND.primary};"><a href="${escapeHtml(params.manageSubscriptionUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #ffffff; text-decoration: none;">Manage subscription</a></td></tr></table>`
    : ""

  const manageSubscriptionHtml = ""

  const html = donationConfirmationLayout({
    preheader,
    charityName,
    supportEmail,
    websiteUrl,
    displayUrl,
    logoUrl,
    heading: "Thank you for your donation",
    orderNumber: params.orderNumber,
    orderDate: receiptDate,
    introParagraph: "We have received your donation. Below is your donation summary.",
    ctaHtml,
    summaryRowsHtml,
    totalPence: params.totalPence,
    giftAidHtml,
    manageSubscriptionHtml,
  })

  return {
    subject,
    html,
  }
}

// ---- Other email templates (unified layout) ----
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

export type WaterProjectDonationEmailParams = {
  donorName: string
  projectType: string
  location?: string | null
  country: string
  amount: number
  donationType: string
  baseUrl?: string
}

export function buildWaterProjectDonationEmail(
  params: WaterProjectDonationEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const projectLabel = PROJECT_TYPE_LABELS[params.projectType] || params.projectType
  const preheader = `Thank you for supporting our ${projectLabel} project.`
  const subject = `Thank you for your ${projectLabel} donation`

  const introHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      Dear ${escapeHtml(params.donorName)},
      <br />
      Thank you for your generous donation towards our <strong style="color:${BRAND.text};">${escapeHtml(projectLabel)}</strong>
      project${params.location ? ` in ${escapeHtml(params.location)}, ${escapeHtml(params.country)}` : ` in ${escapeHtml(params.country)}`}.
    </div>
  `

  const details = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Donation type</td><td align="right" style="padding: 6px 0; font-weight: 700;">${escapeHtml(DONATION_TYPE_LABELS[params.donationType] || params.donationType)}</td></tr>
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Project</td><td align="right" style="padding: 6px 0; font-weight: 700;">${escapeHtml(projectLabel)}</td></tr>
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Location</td><td align="right" style="padding: 6px 0; font-weight: 700;">${escapeHtml(params.location ? `${params.location}, ${params.country}` : params.country)}</td></tr>
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Amount</td><td align="right" style="padding: 6px 0; font-weight: 700;">${moneyPence(params.amount)}</td></tr>
    </table>
  `

  const contentHtml = `
    ${section({ title: "Donation details", bodyHtml: details })}
    <div style="height: 12px;"></div>
    ${section({
      title: "What happens next",
      bodyHtml: `<div style="color:${CLEAN.muted}; font-size: 14px;">Your donation is now being reviewed by our team. We will keep you updated on the progress of this project.</div>`,
    })}
  `

  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "Thank you for your donation",
      heading: "Thank you for your donation",
      aboveContentHtml: introHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

export type SponsorshipDonationEmailParams = {
  donorName: string
  projectType: string
  location?: string | null
  country: string
  amount: number
  donationType: string
  baseUrl?: string
}

export function buildSponsorshipDonationEmail(
  params: SponsorshipDonationEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const projectLabel = SPONSORSHIP_TYPE_LABELS[params.projectType] || params.projectType
  const preheader = `Thank you for your ${projectLabel} sponsorship.`
  const subject = `Thank you for your ${projectLabel} sponsorship`

  const introHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      Dear ${escapeHtml(params.donorName)},
      <br />
      Thank you for your generous sponsorship towards our <strong style="color:${BRAND.text};">${escapeHtml(projectLabel)}</strong>
      programme${params.location ? ` in ${escapeHtml(params.location)}, ${escapeHtml(params.country)}` : ` in ${escapeHtml(params.country)}`}.
    </div>
  `

  const details = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Donation type</td><td align="right" style="padding: 6px 0; font-weight: 700;">${escapeHtml(DONATION_TYPE_LABELS[params.donationType] || params.donationType)}</td></tr>
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Programme</td><td align="right" style="padding: 6px 0; font-weight: 700;">${escapeHtml(projectLabel)}</td></tr>
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Location</td><td align="right" style="padding: 6px 0; font-weight: 700;">${escapeHtml(params.location ? `${params.location}, ${params.country}` : params.country)}</td></tr>
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Amount</td><td align="right" style="padding: 6px 0; font-weight: 700;">${moneyPence(params.amount)}</td></tr>
    </table>
  `

  const contentHtml = `
    ${section({ title: "Sponsorship details", bodyHtml: details })}
    <div style="height: 12px;"></div>
    ${section({
      title: "What happens next",
      bodyHtml: `<div style="color:${CLEAN.muted}; font-size: 14px;">Your sponsorship is now being reviewed by our team. We will keep you updated on the progress.</div>`,
    })}
  `

  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "Thank you for your sponsorship",
      heading: "Thank you for your sponsorship",
      aboveContentHtml: introHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

export type FundraiserWelcomeEmailParams = {
  fundraiserName: string
  fundraiserTitle: string
  appealTitle: string
  fundraiserUrl: string
  baseUrl?: string
}

export function buildFundraiserWelcomeEmail(
  params: FundraiserWelcomeEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const preheader = `Your fundraising page is ready: ${params.fundraiserTitle}`
  const subject = `Your fundraising page is ready: ${params.fundraiserTitle}`

  const introHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      Dear ${escapeHtml(params.fundraiserName)},
      <br />
      Thank you for setting up a fundraiser for <strong style="color:${BRAND.text};">${escapeHtml(params.appealTitle)}</strong>.
    </div>
  `

  const contentHtml = `
    ${section({
      title: "Your fundraising link",
      bodyHtml: `
        <div style="margin-bottom: 12px; color:${CLEAN.muted}; font-size: 14px;">Share this link with friends and family:</div>
        ${button({ href: params.fundraiserUrl, label: "View fundraising page" })}
        <div style="margin-top: 10px; font-size: 12px; color:${CLEAN.muted}; word-break: break-all;">
          Or copy this link: ${escapeHtml(params.fundraiserUrl)}
        </div>
      `,
    })}
  `

  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "Your fundraising page is ready",
      heading: "Your fundraising page is ready",
      aboveContentHtml: introHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

export type FundraiserDonationNotificationEmailParams = {
  fundraiserName: string
  fundraiserTitle: string
  donorName: string
  amount: number
  donationType: string
  fundraiserUrl: string
  baseUrl?: string
}

export function buildFundraiserDonationNotificationEmail(
  params: FundraiserDonationNotificationEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const preheader = `New donation to ${params.fundraiserTitle}`
  const subject = `New donation to ${params.fundraiserTitle}!`

  const introHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      Dear ${escapeHtml(params.fundraiserName)},
      <br />
      Someone just made a donation to your fundraiser <strong style="color:${BRAND.text};">${escapeHtml(params.fundraiserTitle)}</strong>.
    </div>
  `

  const details = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Donor</td><td align="right" style="padding: 6px 0; font-weight: 700;">${escapeHtml(params.donorName || "Anonymous")}</td></tr>
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Amount</td><td align="right" style="padding: 6px 0; font-weight: 700;">${moneyPence(params.amount)}</td></tr>
      <tr><td style="padding: 6px 0; color:${BRAND.muted};">Donation type</td><td align="right" style="padding: 6px 0; font-weight: 700;">${escapeHtml(DONATION_TYPE_LABELS[params.donationType] || params.donationType)}</td></tr>
    </table>
  `

  const contentHtml = `
    ${section({ title: "Donation received", bodyHtml: details })}
    ${section({
      title: "View your fundraising page",
      bodyHtml: `${button({ href: params.fundraiserUrl, label: "Open fundraising page" })}`,
    })}
  `

  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "New donation received",
      heading: "New donation received",
      aboveContentHtml: introHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

export type FundraiserOtpEmailParams = {
  code: string
  baseUrl?: string
}

export function buildFundraiserOtpEmail(
  params: FundraiserOtpEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const preheader = "Your login code is below (expires soon)."
  const subject = "Your Fundraiser Login Code"

  const introHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      You requested a login code for your fundraiser account. Use the code below to sign in:
    </div>
  `

  const codeBox = `
    <div style="text-align:center; padding: 14px; border-radius: 12px; border: 1px solid ${BRAND.border}; background:${BRAND.surface};">
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color:${BRAND.text};">
        ${escapeHtml(params.code)}
      </div>
      <div style="margin-top: 8px; font-size: 12px; color:${BRAND.muted};">
        This code will expire in 10 minutes.
      </div>
    </div>
  `

  const contentHtml = `
    ${section({ title: "Your login code", bodyHtml: codeBox })}
    <div style="margin-top: 12px; color:${BRAND.muted}; font-size: 12px;">
      If you didn’t request this code, you can safely ignore this email.
    </div>
  `

  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "Your login code",
      heading: "Your login code",
      aboveContentHtml: introHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

export type AdminLoginOtpEmailParams = {
  code: string
  baseUrl?: string
}

export function buildAdminLoginOtpEmail(
  params: AdminLoginOtpEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const preheader = "Your portal login code (expires in 10 minutes)."
  const subject = "Your portal login code"

  const introHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      You're signing in to the admin portal. Use the code below to complete login:
    </div>
  `

  const codeBox = `
    <div style="text-align:center; padding: 14px; border-radius: 12px; border: 1px solid #e5e7eb; background:#f9fafb;">
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color:${CLEAN.text};">
        ${escapeHtml(params.code)}
      </div>
      <div style="margin-top: 8px; font-size: 12px; color:${CLEAN.muted};">
        This code will expire in 10 minutes.
      </div>
    </div>
  `

  const contentHtml = `
    ${section({ title: "Your login code", bodyHtml: codeBox })}
    <div style="margin-top: 12px; color:${CLEAN.muted}; font-size: 12px;">
      If you didn't request this code, you can safely ignore this email. Your password has not been changed.
    </div>
  `

  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "Your login code",
      heading: "Your login code",
      aboveContentHtml: introHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

export type AbandonedCheckoutEmailParams = {
  donorName: string
  orderNumber: string
  items: Array<{ title: string; amountPence: number; frequency?: string }>
  totalPence: number
  resumeUrl: string
  baseUrl?: string
}

export function buildAbandonedCheckoutEmail(
  params: AbandonedCheckoutEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const donorName = escapeHtml(params.donorName)
  const orderNumber = escapeHtml(params.orderNumber)
  const preheader = "You were so close to completing your donation."
  const subject = "Complete your donation to Alianah Humanity Welfare"

  const rows = params.items
    .map((i) => {
      const title = escapeHtml(i.title)
      const amount = moneyPence(i.amountPence)
      const freq = i.frequency
        ? ` <span style="color:${BRAND.muted}; font-size: 12px;">(${escapeHtml(i.frequency)})</span>`
        : ""
      return `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid ${BRAND.border};">
            <div style="font-weight: 600;">${title}${freq}</div>
          </td>
          <td align="right" style="padding: 8px 0; border-bottom: 1px solid ${BRAND.border}; font-weight: 700;">
            ${amount}
          </td>
        </tr>
      `
    })
    .join("")

  const summaryTable = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      ${rows}
      <tr>
        <td style="padding: 12px 0 0 0; border-top: 1px solid ${BRAND.border}; font-weight: 700;">
          Total
        </td>
        <td align="right" style="padding: 12px 0 0 0; border-top: 1px solid ${BRAND.border}; font-weight: 700;">
          ${moneyPence(params.totalPence)}
        </td>
      </tr>
    </table>
  `

  const introHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      Dear ${donorName},
      <br />
      It looks like you were close to completing your donation. If you still wish to support this appeal, you can finish your donation below.
    </div>
  `

  const contentHtml = `
    ${section({ title: "Your intended donation", bodyHtml: summaryTable })}
    <div style="height: 14px;"></div>
    ${button({ href: params.resumeUrl, label: "Complete donation" })}
    <div style="margin-top: 10px; font-size: 12px; color:${BRAND.muted};">
      Donation number: <strong>${orderNumber}</strong>
    </div>
  `

  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "Complete your donation",
      heading: "Complete your donation",
      aboveContentHtml: introHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

export type RefundConfirmationEmailParams = {
  donorName: string
  amountPence: number
  orderNumber?: string | null
  donateUrl: string
  baseUrl?: string
}

export function buildRefundConfirmationEmail(
  params: RefundConfirmationEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const donorName = escapeHtml(params.donorName)
  const preheader = "Your refund has been processed."
  const subject = "Your refund has been processed"

  const introHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      Dear ${donorName},
      <br />
      We’ve processed your refund for <strong style="color:${BRAND.text};">${moneyPence(params.amountPence)}</strong>.
      ${params.orderNumber ? `Your reference is <strong>${escapeHtml(params.orderNumber)}</strong>.` : ""}
    </div>
  `

  const contentHtml = `
    ${section({
      title: "Refund summary",
      bodyHtml: `
        <div style="color:${CLEAN.muted}; font-size: 14px;">
          Refund amount: <strong style="color:${CLEAN.text};">${moneyPence(params.amountPence)}</strong>
        </div>
      `,
    })}
    ${button({ href: params.donateUrl, label: "Make a donation" })}
  `

  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "Refund processed",
      heading: "Refund processed",
      aboveContentHtml: introHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

export type AdminInviteEmailParams = {
  email: string
  setPasswordUrl: string
  baseUrl?: string
}

export function buildAdminInviteEmail(
  params: AdminInviteEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const email = escapeHtml(params.email)
  const preheader = "You've been invited to the admin panel. Set your password to get started."
  const subject = "Set your admin password"
  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)

  const introHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      You've been invited to access the ${escapeHtml(charityName)} admin panel.
      <br /><br />
      Click the button below to set your password and sign in. This link expires in 7 days.
    </div>
  `

  const contentHtml = `
    ${section({
      title: "Set your password",
      bodyHtml: `
        <div style="color:${CLEAN.muted}; font-size: 14px; margin-bottom: 12px;">
          Account: <strong style="color:${CLEAN.text};">${email}</strong>
        </div>
      `,
    })}
    ${button({ href: params.setPasswordUrl, label: "Set password" })}
    <div style="margin-top: 16px; color:${BRAND.muted}; font-size: 12px;">
      If you didn't expect this invite, you can safely ignore this email.
    </div>
  `
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "Set your admin password",
      heading: "Set your admin password",
      aboveContentHtml: introHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

// ---- Completion emails (clean layout) ----

export type WaterProjectCompletionEmailParams = {
  donorName: string
  projectType: string
  location?: string | null
  country: string
  images: string[]
  report: string
  completionReportPDF?: string | null
  googleDriveLink?: string
  baseUrl?: string
}

export function buildWaterProjectCompletionEmail(
  params: WaterProjectCompletionEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const projectLabel = PROJECT_TYPE_LABELS[params.projectType] ?? params.projectType
  const preheader = `Your ${projectLabel} project is complete!`
  const subject = `Your ${projectLabel} project is complete!`
  const locationText = params.location
    ? `${escapeHtml(params.location)}, ${escapeHtml(params.country)}`
    : escapeHtml(params.country)

  const subtitleHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      Dear ${escapeHtml(params.donorName)},
      <br />
      We are delighted to inform you that the <strong style="color:${BRAND.text};">${escapeHtml(projectLabel)}</strong>
      project${params.location ? ` in ${locationText}` : ` in ${escapeHtml(params.country)}`} has been completed!
    </div>
  `

  const imagesHtml =
    params.images.length > 0
      ? params.images
          .filter((img) => img.startsWith("https://"))
          .map(
            (img) =>
              `<img src="${escapeHtml(img)}" alt="Project completion" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 5px;" />`
          )
          .join("")
      : ""
  const safePdfUrl = params.completionReportPDF?.startsWith("https://") ? params.completionReportPDF : ""
  const safeDriveUrl = params.googleDriveLink?.startsWith("https://") ? params.googleDriveLink : ""

  const pdfBlock = safePdfUrl
    ? `
    <div style="background-color:${BRAND.infoBg}; padding: 15px; border-radius: 5px; margin: 16px 0; border-left: 4px solid ${BRAND.primary};">
      <p style="margin: 0 0 10px 0;"><strong>Completion Report PDF:</strong></p>
      <p style="margin: 0;"><a href="${escapeHtml(safePdfUrl)}" style="color: ${BRAND.primary}; text-decoration: underline; word-break: break-all;">Download your custom completion report (PDF)</a></p>
    </div>
  `
    : ""
  const reportBlock =
    params.report && params.report.trim()
      ? `
    <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 16px 0;">
      <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(params.report)}</p>
    </div>
  `
      : ""
  const driveBlock = safeDriveUrl
    ? `
    <div style="background-color:${BRAND.infoBg}; padding: 15px; border-radius: 5px; margin: 16px 0; border-left: 4px solid ${BRAND.primary};">
      <p style="margin: 0 0 10px 0;"><strong>View All Project Content:</strong></p>
      <p style="margin: 0;"><a href="${escapeHtml(safeDriveUrl)}" style="color: ${BRAND.primary}; text-decoration: underline; word-break: break-all;">${escapeHtml(safeDriveUrl)}</a></p>
    </div>
  `
    : ""

  const contentHtml = `
    ${section({
      title: "Project details",
      bodyHtml: `
        <div style="color:${CLEAN.muted}; font-size: 14px;">
          <p style="margin: 0 0 4px 0;">Type: <strong style="color:${CLEAN.text};">${escapeHtml(projectLabel)}</strong></p>
          <p style="margin: 0;">Country: <strong style="color:${CLEAN.text};">${escapeHtml(params.location ? `${params.location}, ${params.country}` : params.country)}</strong></p>
        </div>
      `,
    })}
    ${imagesHtml ? `<div style="margin: 16px 0;">${imagesHtml}</div>` : ""}
    ${pdfBlock}
    ${reportBlock}
    ${driveBlock}
    <div style="color:${BRAND.muted}; font-size: 14px; margin-top: 16px;">
      Thank you for your generous support. Your donation has made a real difference in the lives of those in need.
      <br /><br />
      May Allah (SWT) accept your donation and reward you abundantly.
    </div>
  `

  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "Project Complete!",
      heading: "Project complete",
      aboveContentHtml: subtitleHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

export type SponsorshipCompletionEmailParams = {
  donorName: string
  projectType: string
  location?: string | null
  country: string
  images: string[]
  report: string
  completionReportPDF?: string | null
  googleDriveLink?: string
  baseUrl?: string
}

export function buildSponsorshipCompletionEmail(
  params: SponsorshipCompletionEmailParams,
  settings?: OrganizationSettings | null
): EmailDoc {
  const projectLabel = SPONSORSHIP_TYPE_LABELS[params.projectType] ?? params.projectType
  const preheader = `Your ${projectLabel} sponsorship update`
  const subject = `Your ${projectLabel} sponsorship update`
  const locationText = params.location
    ? `${escapeHtml(params.location)}, ${escapeHtml(params.country)}`
    : escapeHtml(params.country)

  const subtitleHtml = `
    <div style="color:${BRAND.muted}; font-size: 14px; margin: 0 0 16px 0;">
      Dear ${escapeHtml(params.donorName)},
      <br />
      We are delighted to share an update on your <strong style="color:${BRAND.text};">${escapeHtml(projectLabel)}</strong>
      sponsorship${params.location ? ` in ${locationText}` : ` in ${escapeHtml(params.country)}`}.
    </div>
  `

  const imagesHtml =
    params.images.length > 0
      ? params.images
          .filter((img) => img.startsWith("https://"))
          .map(
            (img) =>
              `<img src="${escapeHtml(img)}" alt="Sponsorship completion" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 5px;" />`
          )
          .join("")
      : ""
  const safePdfUrl = params.completionReportPDF?.startsWith("https://") ? params.completionReportPDF : ""
  const safeDriveUrl = params.googleDriveLink?.startsWith("https://") ? params.googleDriveLink : ""

  const pdfBlock = safePdfUrl
    ? `
    <div style="background-color:${BRAND.infoBg}; padding: 15px; border-radius: 5px; margin: 16px 0; border-left: 4px solid ${BRAND.primary};">
      <p style="margin: 0 0 10px 0;"><strong>Completion Report PDF:</strong></p>
      <p style="margin: 0;"><a href="${escapeHtml(safePdfUrl)}" style="color: ${BRAND.primary}; text-decoration: underline; word-break: break-all;">Download your report (PDF)</a></p>
    </div>
  `
    : ""
  const reportBlock =
    params.report && params.report.trim()
      ? `
    <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 16px 0;">
      <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(params.report)}</p>
    </div>
  `
      : ""
  const driveBlock = safeDriveUrl
    ? `
    <div style="background-color:${BRAND.infoBg}; padding: 15px; border-radius: 5px; margin: 16px 0; border-left: 4px solid ${BRAND.primary};">
      <p style="margin: 0 0 10px 0;"><strong>View All Content:</strong></p>
      <p style="margin: 0;"><a href="${escapeHtml(safeDriveUrl)}" style="color: ${BRAND.primary}; text-decoration: underline; word-break: break-all;">${escapeHtml(safeDriveUrl)}</a></p>
    </div>
  `
    : ""

  const contentHtml = `
    ${section({
      title: "Sponsorship details",
      bodyHtml: `
        <div style="color:${CLEAN.muted}; font-size: 14px;">
          <p style="margin: 0 0 4px 0;">Type: <strong style="color:${CLEAN.text};">${escapeHtml(projectLabel)}</strong></p>
          <p style="margin: 0;">Country: <strong style="color:${CLEAN.text};">${escapeHtml(params.location ? `${params.location}, ${params.country}` : params.country)}</strong></p>
        </div>
      `,
    })}
    ${imagesHtml ? `<div style="margin: 16px 0;">${imagesHtml}</div>` : ""}
    ${pdfBlock}
    ${reportBlock}
    ${driveBlock}
    <div style="color:${BRAND.muted}; font-size: 14px; margin-top: 16px;">
      Thank you for your generous support.
      <br /><br />
      May Allah (SWT) accept your donation and reward you abundantly.
    </div>
  `

  const { charityName, supportEmail, websiteUrl, displayUrl, logoUrl } = getCleanLayoutDefaults(settings, params.baseUrl)
  return {
    subject,
    html: cleanLayout({
      preheader,
      charityName,
      supportEmail,
      websiteUrl,
      displayUrl,
      logoUrl,
      title: "Sponsorship Update",
      heading: "Sponsorship update",
      aboveContentHtml: subtitleHtml.replace(/^<div[^>]*>|<\/div>$/g, "").trim(),
      contentHtml,
    }),
  }
}

