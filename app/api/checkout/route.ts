import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      appealId: z.string(),
      appealTitle: z.string(),
      fundraiserId: z.string().optional(),
      productId: z.string().optional(),
      productName: z.string().optional(),
      frequency: z.enum(["ONE_OFF", "MONTHLY", "YEARLY"]),
      donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
      amountPence: z.number(),
    })
  ),
  donor: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
    marketingEmail: z.boolean(),
    marketingSMS: z.boolean(),
    giftAid: z.boolean(),
    coverFees: z.boolean(),
  }),
  subtotalPence: z.number(),
  feesPence: z.number(),
  totalPence: z.number(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = checkoutSchema.parse(body)

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create order
    const order = await prisma.demoOrder.create({
      data: {
        orderNumber,
        status: "PENDING",
        subtotalPence: validated.subtotalPence,
        feesPence: validated.feesPence,
        totalPence: validated.totalPence,
        coverFees: validated.donor.coverFees,
        giftAid: validated.donor.giftAid,
        marketingEmail: validated.donor.marketingEmail,
        marketingSMS: validated.donor.marketingSMS,
        donorFirstName: validated.donor.firstName,
        donorLastName: validated.donor.lastName,
        donorEmail: validated.donor.email,
        donorPhone: validated.donor.phone || null,
        donorAddress: validated.donor.address || null,
        donorCity: validated.donor.city || null,
        donorPostcode: validated.donor.postcode || null,
        donorCountry: validated.donor.country || null,
        items: {
          create: validated.items.map((item) => ({
            appealId: item.appealId,
            fundraiserId: item.fundraiserId || null,
            productId: item.productId || null,
            appealTitle: item.appealTitle,
            productName: item.productName || null,
            frequency: item.frequency,
            donationType: item.donationType,
            amountPence: item.amountPence,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }
    console.error("Checkout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
