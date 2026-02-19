import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/checkout/resume?orderNumber=XXX
 * Returns items (and donor info) for an abandoned/pending order so the user can resume checkout.
 * Only allowed for orders with status PENDING or ABANDONED.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get("orderNumber")?.trim()
    if (!orderNumber) {
      return NextResponse.json({ error: "orderNumber required" }, { status: 400 })
    }

    const order = await prisma.demoOrder.findUnique({
      where: { orderNumber },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.status !== "PENDING" && order.status !== "ABANDONED") {
      return NextResponse.json(
        { error: "This order can no longer be resumed" },
        { status: 400 }
      )
    }

    const items = order.items.map((item) => ({
      appealId: item.appealId ?? undefined,
      appealTitle: item.appealTitle,
      fundraiserId: item.fundraiserId ?? undefined,
      productId: item.productId ?? undefined,
      productName: item.productName ?? undefined,
      frequency: item.frequency as "ONE_OFF" | "MONTHLY" | "YEARLY" | "DAILY",
      donationType: item.donationType as "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH",
      amountPence: item.amountPence,
      dailyGivingEndDate: item.dailyGivingEndDate ?? undefined,
      isAnonymous: item.isAnonymous ?? undefined,
      waterProjectId: item.waterProjectId ?? undefined,
      waterProjectCountryId: item.waterProjectCountryId ?? undefined,
      plaqueName: item.plaqueName ?? undefined,
      sponsorshipProjectId: item.sponsorshipProjectId ?? undefined,
      sponsorshipCountryId: item.sponsorshipCountryId ?? undefined,
      sponsorshipProjectType: item.sponsorshipProjectType ?? undefined,
      qurbaniCountryId: item.qurbaniCountryId ?? undefined,
      qurbaniSize: item.qurbaniSize as "ONE_SEVENTH" | "SMALL" | "LARGE" | undefined,
      qurbaniNames: item.qurbaniNames ?? undefined,
    }))

    return NextResponse.json({
      orderNumber: order.orderNumber,
      items,
      donor: {
        firstName: order.donorFirstName,
        lastName: order.donorLastName,
        email: order.donorEmail,
        phone: order.donorPhone ?? undefined,
        address: order.donorAddress ?? undefined,
        city: order.donorCity ?? undefined,
        postcode: order.donorPostcode ?? undefined,
        country: order.donorCountry ?? undefined,
      },
    })
  } catch (error) {
    console.error("Checkout resume error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
