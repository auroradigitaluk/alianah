import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import { generateDonationCertificatePDF } from "@/lib/certificates/generate-donation-certificate"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Download donation certificate PDF for a completed order.
 * Access model:
 * - Public link keyed by orderNumber (same exposure level as existing success page).
 * - Admin APIs can also call this route from the dashboard.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params

    const order = await prisma.demoOrder.findUnique({
      where: { orderNumber },
      include: { items: true },
    })

    if (!order || order.status !== "COMPLETED") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Use first item as primary context; if multiple, fall back to generic label
    const primaryItem = order.items[0]
    const appealTitle =
      order.items.length === 1
        ? primaryItem.appealTitle
        : "Multiple causes (see receipt)"

    const donationType = (primaryItem?.donationType ??
      "GENERAL") as "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"

    const DONATION_TYPE_LABELS: Record<string, string> = {
      GENERAL: "General",
      SADAQAH: "Sadaqah",
      ZAKAT: "Zakat",
      LILLAH: "Lillah",
    }

    const payload = {
      donorName: `${order.donorFirstName} ${order.donorLastName}`.trim(),
      amountPence: order.totalPence,
      formattedAmount: formatCurrency(order.totalPence),
      appealTitle,
      donationType,
      donationDate: formatDate(order.createdAt),
      dedicationName: null,
      referenceNumber: order.orderNumber,
      donationTypeLabel: DONATION_TYPE_LABELS[donationType] ?? donationType,
    }

    const pdfBuffer = await generateDonationCertificatePDF(payload)

    const response = new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="donation-certificate-${order.orderNumber}.pdf"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    })

    return response
  } catch (error) {
    console.error("Donation certificate error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

