import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import Stripe from "stripe"
import { randomInt } from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not set")
    stripe = new Stripe(apiKey, {
      apiVersion: "2024-12-18.acacia" as unknown as Stripe.LatestApiVersion,
    })
  }
  return stripe
}

const bodySchema = z.object({
  amountPence: z.number().int().positive(),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
  isAnonymous: z.boolean().optional().default(false),
  giftAid: z.boolean().optional().default(false),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
})

async function generateOrderNumber() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const n = randomInt(0, 100_000_000)
    const candidate = `786-1${String(n).padStart(8, "0")}`
    const exists = await prisma.demoOrder.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    })
    if (!exists) return candidate
  }
  throw new Error("Failed to generate order number")
}

/**
 * Create order + PaymentIntent for inline fundraiser donation (card).
 * Client will use returned paymentClientSecret with Stripe.confirmPayment().
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fundraiserId } = await params
    const body = await request.json()
    const validated = bodySchema.parse(body)

    const fundraiser = await prisma.fundraiser.findFirst({
      where: { id: fundraiserId, isActive: true },
      include: {
        appeal: { select: { id: true, title: true } },
      },
    })

    if (!fundraiser) {
      return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })
    }

    if (!fundraiser.appeal) {
      return NextResponse.json(
        { error: "Inline donation is only for appeal fundraisers" },
        { status: 400 }
      )
    }

    const orderNumber = await generateOrderNumber()

    let donor = await prisma.donor.findUnique({
      where: { email: validated.email },
    })
    if (!donor) {
      donor = await prisma.donor.create({
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          email: validated.email,
          address: validated.address ?? null,
          city: validated.city ?? null,
          postcode: validated.postcode ?? null,
          country: validated.country ?? null,
        },
      })
    } else {
      donor = await prisma.donor.update({
        where: { id: donor.id },
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          address: validated.address ?? undefined,
          city: validated.city ?? undefined,
          postcode: validated.postcode ?? undefined,
          country: validated.country ?? undefined,
        },
      })
    }

    const feesPence = 0
    const totalPence = validated.amountPence + feesPence

    const order = await prisma.demoOrder.create({
      data: {
        orderNumber,
        status: "PENDING",
        subtotalPence: validated.amountPence,
        feesPence,
        totalPence,
        coverFees: false,
        giftAid: validated.giftAid,
        marketingEmail: false,
        marketingSMS: false,
        donorFirstName: validated.firstName,
        donorLastName: validated.lastName,
        donorEmail: validated.email,
        donorPhone: null,
        donorAddress: validated.address ?? null,
        donorCity: validated.city ?? null,
        donorPostcode: validated.postcode ?? null,
        donorCountry: validated.country ?? null,
        items: {
          create: {
            appealId: fundraiser.appeal.id,
            appealTitle: fundraiser.appeal.title,
            fundraiserId: fundraiser.id,
            frequency: "ONE_OFF",
            donationType: validated.donationType,
            amountPence: validated.amountPence,
            isAnonymous: validated.isAnonymous,
          },
        },
      },
      include: { items: true },
    })

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: totalPence,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      receipt_email: validated.email,
      description: `Donation ${orderNumber}`,
      metadata: {
        orderId: order.id,
        orderNumber,
        frequency: "ONE_OFF",
      },
    })

    if (!paymentIntent.client_secret) {
      throw new Error("Failed to create PaymentIntent client secret")
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentClientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Fundraiser donate-inline error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
