import { Resend } from "resend"

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

export async function sendWaterProjectDonationEmail(params: DonationEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email")
    return
  }

  const { donorEmail, donorName, projectType, location, country, amount, donationType } = params

  try {
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: donorEmail,
      subject: `Thank you for your ${PROJECT_TYPE_LABELS[projectType]} donation`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">Thank You for Your Donation</h1>
            <p>Dear ${donorName},</p>
            <p>Thank you for your generous donation towards our ${PROJECT_TYPE_LABELS[projectType]} project${location ? ` in ${location}, ${country}` : ` in ${country}`}.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Donation Details:</strong></p>
              <p style="margin: 5px 0;">Type: ${PROJECT_TYPE_LABELS[projectType]}</p>
              <p style="margin: 5px 0;">Country: ${country}${location ? `, ${location}` : ""}</p>
              <p style="margin: 5px 0;">Amount: £${(amount / 100).toFixed(2)}</p>
              <p style="margin: 5px 0;">Donation Type: ${DONATION_TYPE_LABELS[donationType]}</p>
            </div>
            <p>Your donation is now being reviewed by our team. We will keep you updated on the progress of this project.</p>
            <p>May Allah (SWT) accept your donation and reward you abundantly.</p>
            <p style="margin-top: 30px;">Best regards,<br>Alianah Humanity Welfare</p>
          </body>
        </html>
      `,
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

  const { donorEmail, donorName, projectType, location, country, images, report, completionReportPDF, googleDriveLink } = params

  const imagesHtml = images.length > 0
    ? images
        .map(
          (img) =>
            `<img src="${img}" alt="Project completion" style="max-width: 100%; height: auto; margin: 10px 0; border-radius: 5px;" />`
        )
        .join("")
    : ""

  try {
    await getResend().emails.send({
      from: process.env.FROM_EMAIL || "noreply@alianah.org",
      to: donorEmail,
      subject: `Your ${PROJECT_TYPE_LABELS[projectType]} project is complete!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #16a34a;">Project Complete!</h1>
            <p>Dear ${donorName},</p>
            <p>We are delighted to inform you that the ${PROJECT_TYPE_LABELS[projectType]} project${location ? ` in ${location}, ${country}` : ` in ${country}`} has been completed!</p>
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <p style="margin: 0;"><strong>Project Details:</strong></p>
              <p style="margin: 5px 0;">Type: ${PROJECT_TYPE_LABELS[projectType]}</p>
              <p style="margin: 5px 0;">Country: ${country}${location ? `, ${location}` : ""}</p>
            </div>
            ${imagesHtml ? `<div style="margin: 20px 0;">${imagesHtml}</div>` : ""}
            ${completionReportPDF ? `<div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 10px 0;"><strong>📄 Completion Report PDF:</strong></p>
              <p style="margin: 0;"><a href="${completionReportPDF}" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">Download your custom completion report (PDF)</a></p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">This PDF contains all project details, images, and completion information with Alianah branding.</p>
            </div>` : ""}
            ${report ? `<div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;"><p style="white-space: pre-wrap;">${report}</p></div>` : ""}
            ${googleDriveLink ? `<div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 10px 0;"><strong>View All Project Content:</strong></p>
              <p style="margin: 0;"><a href="${googleDriveLink}" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">${googleDriveLink}</a></p>
            </div>` : ""}
            <p>Thank you for your generous support. Your donation has made a real difference in the lives of those in need.</p>
            <p>May Allah (SWT) accept your donation and reward you abundantly.</p>
            <p style="margin-top: 30px;">Best regards,<br>Alianah Humanity Welfare</p>
          </body>
        </html>
      `,
    })
  } catch (error) {
    console.error("Error sending completion email:", error)
    throw error
  }
}
