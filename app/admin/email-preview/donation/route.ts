import { NextRequest, NextResponse } from "next/server"
import { buildDonationConfirmationEmail } from "@/lib/email-templates"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const donorName = searchParams.get("donorName") || "Muhammad Ali"
  const orderNumber = searchParams.get("orderNumber") || "786-112345678"
  const itemTitle = searchParams.get("itemTitle") || "Palestine Emergency Relief"
  const amountPence = Number(searchParams.get("amountPence") || "2500")
  const frequency = searchParams.get("frequency") || ""
  const giftAid = (searchParams.get("giftAid") || "1") === "1"
  const includeManageLink = (searchParams.get("includeManageLink") || "0") === "1"

  const manageSubscriptionUrl = includeManageLink
    ? "https://example.com/manage-subscription?token=example"
    : undefined

  const { html } = buildDonationConfirmationEmail({
    donorName,
    orderNumber,
    items: [
      {
        title: itemTitle,
        amountPence: Number.isFinite(amountPence) ? amountPence : 2500,
        ...(frequency ? { frequency } : {}),
      },
    ],
    totalPence: Number.isFinite(amountPence) ? amountPence : 2500,
    giftAid,
    ...(manageSubscriptionUrl ? { manageSubscriptionUrl } : {}),
  })

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Email previews shouldn't be cached.
      "cache-control": "no-store",
    },
  })
}

