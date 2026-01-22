import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      appealId: z.string().optional(), // Optional for water projects
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

    // Get or create donor
    let donor = await prisma.donor.findUnique({
      where: { email: validated.donor.email },
    })

    if (!donor) {
      donor = await prisma.donor.create({
        data: {
          firstName: validated.donor.firstName,
          lastName: validated.donor.lastName,
          email: validated.donor.email,
          phone: validated.donor.phone || null,
          address: validated.donor.address || null,
          city: validated.donor.city || null,
          postcode: validated.donor.postcode || null,
          country: validated.donor.country || null,
        },
      })
    } else {
      // Update donor info if provided
      donor = await prisma.donor.update({
        where: { id: donor.id },
        data: {
          firstName: validated.donor.firstName,
          lastName: validated.donor.lastName,
          phone: validated.donor.phone || donor.phone,
          address: validated.donor.address || donor.address,
          city: validated.donor.city || donor.city,
          postcode: validated.donor.postcode || donor.postcode,
          country: validated.donor.country || donor.country,
        },
      })
    }

    // Create order (for tracking)
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
          create: validated.items
            .filter((item) => item.appealId) // Only include appeal donations in demo order
            .map((item) => ({
              appealId: item.appealId!,
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

    // Create real Donation records for each item (only for appeal donations, not water projects)
    const donations = await Promise.all(
      validated.items
        .filter((item) => item.appealId) // Only process appeal donations here
        .map(async (item) => {
          // Determine payment method based on item
          const paymentMethod = "STRIPE" // Default, can be updated based on actual payment processing

          // Create donation record
          const donation = await prisma.donation.create({
            data: {
              donorId: donor.id,
              appealId: item.appealId!,
              fundraiserId: item.fundraiserId || null,
              productId: item.productId || null,
              amountPence: item.amountPence,
              donationType: item.donationType,
              frequency: item.frequency,
              paymentMethod: paymentMethod,
              status: "PENDING", // Will be updated to COMPLETED when payment is confirmed
              giftAid: validated.donor.giftAid,
              orderNumber: orderNumber,
            },
          })

          // If it's a recurring donation, create RecurringDonation record
          // Note: RecurringDonation model doesn't have fundraiserId field, only appealId
          if (item.frequency === "MONTHLY" || item.frequency === "YEARLY") {
            await prisma.recurringDonation.create({
              data: {
                donorId: donor.id,
                appealId: item.appealId!,
                amountPence: item.amountPence,
                donationType: item.donationType,
                frequency: item.frequency,
                paymentMethod: paymentMethod,
                status: "PENDING", // Will be activated when first payment is confirmed
              },
            })
          }

          return donation
        })
    )

    return NextResponse.json({ 
      orderId: order.id, 
      orderNumber: order.orderNumber,
      donations: donations.map(d => d.id)
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }
    console.error("Checkout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
