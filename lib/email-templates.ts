type EmailDoc = { subject: string; html: string }

// Brand / UI-aligned palette (email-safe)
const BRAND = {
  primary: "#009900", // brand green
  primaryText: "#ffffff",
  background: "#f6f7fb",
  surface: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  infoBg: "#eff6ff",
  infoBorder: "#bfdbfe",
}

function logoTextHtml() {
  // Match app sidebar wordmark: `text-base font-semibold`
  return `<span style="display:block; text-align:center; font-size:16px; font-weight:600; color:${BRAND.text};">Alianah Humanity Welfare</span>`
}

function getPublicBaseUrl() {
  // Prefer runtime origin when available (email preview page), otherwise use configured public URL.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

function logoImageHtml(baseUrl?: string) {
  // Public asset in /public (space must be URL-encoded).
  const src = `${baseUrl || getPublicBaseUrl()}/logo%20light.png`
  return `
    <img
      src="${src}"
      alt="Alianah Humanity Welfare"
      width="80"
      style="display:block; width:80px; max-width:100%; height:auto; margin:0 auto 8px auto;"
    />
  `
}

function escapeHtml(input: string) {
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

function layout(params: {
  preheader: string
  title: string
  introHtml: string
  contentHtml: string
  footerHtml?: string
}): string {
  const { preheader, title, introHtml, contentHtml, footerHtml } = params
  const standardFooter = `
    Need help or want to update your details? Email support@alianah.org.
    This mailbox is not monitored. Please use the email above for any questions.
    <div style="margin-top: 8px;">
      <a href="https://www.alianah.org" target="_blank" rel="noopener noreferrer" style="color:${BRAND.primary}; text-decoration:none;">www.alianah.org</a>
    </div>
  `

  // Table-based layout for best client compatibility.
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
                ${logoTextHtml()}
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
                    © ${new Date().getFullYear()} Alianah Humanity Welfare
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

function card(params: { title?: string; bodyHtml: string; variant?: "default" | "success" | "info" }) {
  const variant = params.variant ?? "default"
  const bg =
    variant === "success" ? BRAND.successBg : variant === "info" ? BRAND.infoBg : "#f9fafb"
  const border =
    variant === "success" ? BRAND.successBorder : variant === "info" ? BRAND.infoBorder : BRAND.border

  return `
<div style="background:${bg}; border: 1px solid ${border}; border-radius: 12px; padding: 16px;">
  ${params.title ? `<div style="font-weight: 700; margin-bottom: 8px;">${escapeHtml(params.title)}</div>` : ""}
  ${params.bodyHtml}
</div>
  `
}

function button(params: { href: string; label: string }) {
  const href = escapeHtml(params.href)
  const label = escapeHtml(params.label)
  return `
<a href="${href}" target="_blank" rel="noopener noreferrer"
  style="display:inline-block; background:${BRAND.primary}; color:${BRAND.primaryText}; text-decoration:none; padding: 12px 16px; border-radius: 10px; font-weight: 700;">
  ${label}
</a>
  `
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

export function buildDonationConfirmationEmail(params: DonationConfirmationEmailParams): EmailDoc {
  const donorName = escapeHtml(params.donorName)
  const orderNumber = escapeHtml(params.orderNumber)
  const preheader = `Your donation has been received. Ref ${params.orderNumber}`
  const subject = "Donation confirmation - Alianah Humanity Welfare"

  const rows = params.items
    .map((i) => {
      const title = escapeHtml(i.title)
      const amount = moneyPence(i.amountPence)
      const freq = i.frequency ? ` <span style="color:${BRAND.muted}; font-size: 12px;">(${escapeHtml(i.frequency)})</span>` : ""
      return `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border};">
            <div style="font-weight: 600;">${title}${freq}</div>
          </td>
          <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-weight: 700;">
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

  const giftAidLine = params.giftAid
    ? `<div style="margin-top: 10px; color:${BRAND.primary}; font-size: 13px; font-weight: 600;">
         Gift Aid claimed — your donation is worth 25% more at no extra cost to you.
       </div>`
    : `<div style="margin-top: 10px; color:${BRAND.muted}; font-size: 13px;">
         Gift Aid not claimed.
       </div>`

  const manage =
    params.manageSubscriptionUrl
      ? `
        <div style="margin-top: 18px; border-top: 1px solid ${BRAND.border}; padding-top: 14px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">Manage your recurring donation</div>
          <div style="font-size: 13px; color:${BRAND.muted}; margin-bottom: 12px;">
            Update your payment method or cancel anytime.
          </div>
          ${button({ href: params.manageSubscriptionUrl, label: "Manage subscription" })}
        </div>
      `
      : ""

  const receiptDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Donate Confirmation - Alianah Humanity Welfare</title>
  </head>
  <body style="margin:0; padding:0; background:${BRAND.background}; color:${BRAND.text}; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height:1.5;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff; padding: 24px 12px; margin:0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px;">
            <tr>
              <td style="padding: 0 8px 12px 8px;">
                ${logoImageHtml(params.baseUrl)}
                ${logoTextHtml()}
              </td>
            </tr>

            <tr>
              <td style="background:#f2fbf2; border: 1px solid ${BRAND.border}; border-radius: 16px; overflow:hidden;">
                <div style="padding: 24px;">
                  <div style="text-align:center;">
                    <div style="display:inline-flex; align-items:center; justify-content:center; width: 48px; height: 48px; border-radius: 999px; background:${BRAND.primary};">
                      <span style="display:inline-block; color:${BRAND.primaryText}; font-size: 20px; font-weight: 700;">✓</span>
                    </div>
                    <div style="margin-top: 12px; font-weight: 700; font-size: 22px; letter-spacing:-0.02em;">Donation confirmed</div>
                    <div style="margin-top: 6px; color:${BRAND.muted}; font-size: 14px;">
                      Dear ${donorName}, we’ve received your donation.
                    </div>
                    <div style="margin-top: 10px; color:${BRAND.muted}; font-size: 12px;">
                      Reference: <span style="font-weight: 700; color:${BRAND.text};">${orderNumber}</span>
                      • Date: <span style="font-weight: 600; color:${BRAND.text};">${receiptDate}</span>
                    </div>
                  </div>
                </div>

                <div style="padding: 0 24px 24px 24px;">
                  <div style="background:#ffffff; border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 16px;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 10px;">Donation summary</div>
                    ${summaryTable}
                    ${giftAidLine}
                  </div>
                  ${manage ? `<div style="margin-top: 14px;">${manage}</div>` : ""}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding: 12px 8px 0 8px;">
                <div style="color:${BRAND.muted}; font-size: 12px; line-height: 1.6;">
                  Need help or want to update your details? Email support@alianah.org.
                  This mailbox is not monitored. Please use the email above for any questions.
                  <div style="margin-top: 8px;">
                    <a href="https://www.alianah.org" target="_blank" rel="noopener noreferrer" style="color:${BRAND.primary}; text-decoration:none;">www.alianah.org</a>
                  </div>
                  <div style="margin-top: 10px;">
                    © ${new Date().getFullYear()} Alianah Humanity Welfare
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

  return {
    subject,
    html,
  }
}

// ---- Other email templates (migrated to the same layout) ----

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
}

export function buildWaterProjectDonationEmail(params: WaterProjectDonationEmailParams): EmailDoc {
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
    ${card({ title: "Donation details", bodyHtml: details })}
    <div style="height: 12px;"></div>
    ${card({
      variant: "success",
      title: "What happens next",
      bodyHtml: `<div style="color:${BRAND.muted}; font-size: 14px;">Your donation is now being reviewed by our team. We will keep you updated on the progress of this project.</div>`,
    })}
  `

  return {
    subject,
    html: layout({
      preheader,
      title: "Thank you for your donation",
      introHtml,
      contentHtml,
      footerHtml: "Need help or want to update your details? Email support@alianah.org. This mailbox is not monitored. Please use the email above for any questions.<br/><a href=\"https://www.alianah.org\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:#009900; text-decoration:none;\">www.alianah.org</a>",
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
}

export function buildSponsorshipDonationEmail(params: SponsorshipDonationEmailParams): EmailDoc {
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
    ${card({ title: "Sponsorship details", bodyHtml: details })}
    <div style="height: 12px;"></div>
    ${card({
      variant: "success",
      title: "What happens next",
      bodyHtml: `<div style="color:${BRAND.muted}; font-size: 14px;">Your sponsorship is now being reviewed by our team. We will keep you updated on the progress.</div>`,
    })}
  `

  return {
    subject,
    html: layout({
      preheader,
      title: "Thank you for your sponsorship",
      introHtml,
      contentHtml,
      footerHtml: "Need help or want to update your details? Email support@alianah.org. This mailbox is not monitored. Please use the email above for any questions.<br/><a href=\"https://www.alianah.org\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:#009900; text-decoration:none;\">www.alianah.org</a>",
    }),
  }
}

export type FundraiserWelcomeEmailParams = {
  fundraiserName: string
  fundraiserTitle: string
  appealTitle: string
  fundraiserUrl: string
}

export function buildFundraiserWelcomeEmail(params: FundraiserWelcomeEmailParams): EmailDoc {
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
    ${card({
      variant: "info",
      title: "Your fundraising link",
      bodyHtml: `
        <div style="margin-bottom: 12px; color:${BRAND.muted}; font-size: 14px;">Share this link with friends and family:</div>
        ${button({ href: params.fundraiserUrl, label: "View fundraising page" })}
        <div style="margin-top: 10px; font-size: 12px; color:${BRAND.muted}; word-break: break-all;">
          Or copy this link: ${escapeHtml(params.fundraiserUrl)}
        </div>
      `,
    })}
  `

  return {
    subject,
    html: layout({
      preheader,
      title: "Your fundraising page is ready",
      introHtml,
      contentHtml,
      footerHtml: "Need help or want to update your details? Email support@alianah.org. This mailbox is not monitored. Please use the email above for any questions.<br/><a href=\"https://www.alianah.org\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:#009900; text-decoration:none;\">www.alianah.org</a>",
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
}

export function buildFundraiserDonationNotificationEmail(
  params: FundraiserDonationNotificationEmailParams
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
    ${card({ variant: "success", title: "Donation received", bodyHtml: details })}
    <div style="height: 12px;"></div>
    ${card({
      variant: "info",
      title: "View your fundraising page",
      bodyHtml: `${button({ href: params.fundraiserUrl, label: "Open fundraising page" })}`,
    })}
  `

  return {
    subject,
    html: layout({
      preheader,
      title: "New donation received",
      introHtml,
      contentHtml,
      footerHtml: "Need help or want to update your details? Email support@alianah.org. This mailbox is not monitored. Please use the email above for any questions.<br/><a href=\"https://www.alianah.org\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:#009900; text-decoration:none;\">www.alianah.org</a>",
    }),
  }
}

export type FundraiserOtpEmailParams = {
  code: string
}

export function buildFundraiserOtpEmail(params: FundraiserOtpEmailParams): EmailDoc {
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
    ${card({ title: "Your login code", bodyHtml: codeBox })}
    <div style="margin-top: 12px; color:${BRAND.muted}; font-size: 12px;">
      If you didn’t request this code, you can safely ignore this email.
    </div>
  `

  return {
    subject,
    html: layout({
      preheader,
      title: "Your login code",
      introHtml,
      contentHtml,
      footerHtml: "Need help or want to update your details? Email support@alianah.org. This mailbox is not monitored. Please use the email above for any questions.<br/><a href=\"https://www.alianah.org\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:#009900; text-decoration:none;\">www.alianah.org</a>",
    }),
  }
}

export type AbandonedCheckoutEmailParams = {
  donorName: string
  orderNumber: string
  items: Array<{ title: string; amountPence: number; frequency?: string }>
  totalPence: number
  resumeUrl: string
}

export function buildAbandonedCheckoutEmail(params: AbandonedCheckoutEmailParams): EmailDoc {
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
    ${card({ title: "Your intended donation", bodyHtml: summaryTable })}
    <div style="height: 14px;"></div>
    ${button({ href: params.resumeUrl, label: "Complete donation" })}
    <div style="margin-top: 10px; font-size: 12px; color:${BRAND.muted};">
      Donation reference: <strong>${orderNumber}</strong>
    </div>
  `

  return {
    subject,
    html: layout({
      preheader,
      title: "Complete your donation",
      introHtml,
      contentHtml,
      footerHtml: "Need help or want to update your details? Email support@alianah.org. This mailbox is not monitored. Please use the email above for any questions.<br/><a href=\"https://www.alianah.org\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:#009900; text-decoration:none;\">www.alianah.org</a>",
    }),
  }
}

export type RefundConfirmationEmailParams = {
  donorName: string
  amountPence: number
  orderNumber?: string | null
  donateUrl: string
}

export function buildRefundConfirmationEmail(params: RefundConfirmationEmailParams): EmailDoc {
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
    ${card({
      title: "Refund summary",
      bodyHtml: `
        <div style="color:${BRAND.muted}; font-size: 14px;">
          Refund amount: <strong style="color:${BRAND.text};">${moneyPence(params.amountPence)}</strong>
        </div>
      `,
    })}
    <div style="height: 14px;"></div>
    ${button({ href: params.donateUrl, label: "Make a donation" })}
  `

  return {
    subject,
    html: layout({
      preheader,
      title: "Refund processed",
      introHtml,
      contentHtml,
      footerHtml: "Need help or want to update your details? Email support@alianah.org. This mailbox is not monitored. Please use the email above for any questions.<br/><a href=\"https://www.alianah.org\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:#009900; text-decoration:none;\">www.alianah.org</a>",
    }),
  }
}

