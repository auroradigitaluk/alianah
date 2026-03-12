import jsPDF from "jspdf"
import path from "path"
import fs from "fs/promises"

export interface DonationCertificatePayload {
  donorName: string
  amountPence: number
  formattedAmount: string
  appealTitle: string
  donationType: "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"
  donationDate: string
  referenceNumber: string
  donationTypeLabel?: string
}

interface CertificateLayout {
  pageOrientation: "portrait" | "landscape"
  pageFormat: "a4" | string
  donorNameLabelY: number
  donorNameY: number
  amountLabelY: number
  amountY: number
  appealLabelY: number
  appealTitleY: number
  donationTypeY: number
  closingLineY: number
  bottomMetaY: number
}

// Single place to tweak layout/positions later.
const LAYOUT: CertificateLayout = {
  pageOrientation: "landscape",
  pageFormat: "a4",
  // All Y values tuned for a landscape A4 with the provided background.
  // Content is kept in a central band with generous top/bottom margins.
  donorNameLabelY: 95,
  donorNameY: 107,
  amountLabelY: 121,
  amountY: 133,
  appealLabelY: 148,
  appealTitleY: 157,
  donationTypeY: 165,
  closingLineY: 181,
  bottomMetaY: 190,
}

// Helper to load the background image from /public/certificate.png
async function loadCertificateBackground(): Promise<{ dataUrl: string; format: "PNG" | "JPEG" }> {
  try {
    const filePath = path.join(process.cwd(), "public", "certificate.png")
    const buffer = await fs.readFile(filePath)
    const base64 = buffer.toString("base64")
    const dataUrl = `data:image/png;base64,${base64}`
    return { dataUrl, format: "PNG" }
  } catch (error) {
    console.error("Donation certificate background missing or failed to load:", error)
    throw new Error("Certificate background not available")
  }
}

export async function generateDonationCertificatePDF(
  payload: DonationCertificatePayload
): Promise<Buffer> {
  const { pageOrientation, pageFormat } = LAYOUT

  const doc = new jsPDF({
    orientation: pageOrientation,
    unit: "mm",
    format: pageFormat,
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Try to add background; fail gracefully if not available.
  try {
    const bg = await loadCertificateBackground()
    doc.addImage(bg.dataUrl, bg.format, 0, 0, pageWidth, pageHeight)
  } catch {
    // Background missing – continue with plain page but do not crash.
  }

  // Common text styling
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "normal")

  const center = pageWidth / 2

  // Small helper for centered text
  const centerText = (text: string, y: number, fontSize: number, fontWeight: "normal" | "bold" | "italic" = "normal") => {
    doc.setFontSize(fontSize)
    doc.setFont("helvetica", fontWeight)
    doc.text(text, center, y, { align: "center" })
  }

  const formattedDate = payload.donationDate
  const amountText = payload.formattedAmount || `£${(payload.amountPence / 100).toFixed(2)}`

  // Presented to
  centerText("Presented to", LAYOUT.donorNameLabelY, 12, "normal")
  // Donor name (largest)
  centerText(payload.donorName, LAYOUT.donorNameY, 26, "bold")

  // Amount block
  centerText("In recognition of your generous donation of", LAYOUT.amountLabelY, 12, "normal")
  centerText(amountText, LAYOUT.amountY, 24, "bold")

  // Towards block
  centerText("Towards", LAYOUT.appealLabelY, 12, "normal")
  centerText(payload.appealTitle, LAYOUT.appealTitleY, 18, "bold")

  if (payload.donationTypeLabel) {
    centerText(`Donation type: ${payload.donationTypeLabel}`, LAYOUT.donationTypeY, 12, "normal")
  }

  // Closing line near bottom center
  centerText(
    "May Allah accept this charity and reward you abundantly.",
    LAYOUT.closingLineY,
    10,
    "normal"
  )

  // Bottom metadata (small, but still centered)
  const meta = `Date: ${formattedDate}    •    Reference: ${payload.referenceNumber}`
  centerText(meta, LAYOUT.bottomMetaY, 9, "normal")

  // Output as Node Buffer for API response
  const arrayBuffer = doc.output("arraybuffer")
  return Buffer.from(arrayBuffer)
}

