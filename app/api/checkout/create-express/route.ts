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

const itemSchema = z.object({
  appealId: z.string().optional(),
  appealTitle: z.string(),
  fundraiserId: z.string().optional(),
  isAnonymous: z.boolean().optional(),
  productId: z.string().optional(),
  productName: z.string().optional(),
  frequency: z.enum(["ONE_OFF", "MONTHLY", "YEARLY"]),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
  amountPence: z.number().int().positive(),
  waterProjectId: z.string().optional(),
  waterProjectCountryId: z.string().optional(),
  plaqueName: z.string().optional(),
  sponsorshipProjectId: z.string().optional(),
  sponsorshipCountryId: z.string().optional(),
  sponsorshipProjectType: z.string().optional(),
})

const expressSchema = z.object({
  items: z.array(itemSchema).min(1),
  email: z.string().email(),
  subtotalPence: z.number().int().nonnegative(),
  coverFees: z.boolean().optional().default(false),
})

function isWaterProjectItem(item: z.infer<typeof itemSchema>) {
  return Boolean(item.waterProjectId)
}

function isSponsorshipItem(item: z.infer<typeof itemSchema>) {
  return Boolean(item.sponsorshipProjectId)
}

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
  throw new Error("Failed to generate donation number")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = expressSchema.parse(body)

    const allOneOff = validated.items.every((i) => i.frequency === "ONE_OFF")
    if (!allOneOff) {
      return NextResponse.json(
        { error: "Express checkout is only available for one-off donations." },
        { status: 400 }
      )
    }

    const feesPence = validated.coverFees
      ? Math.round(validated.subtotalPence * 0.012) + 20
      : 0
    const totalPence = validated.subtotalPence + feesPence

    await Promise.all(
      validated.items
        .filter(isWaterProjectItem)
        .map(async (item) => {
          if (!item.waterProjectId || !item.waterProjectCountryId) {
            throw new Error("Water project item is missing required information")
          }
          const [project, country] = await Promise.all([
            prisma.waterProject.findUnique({ where: { id: item.waterProjectId } }),
            prisma.waterProjectCountry.findUnique({ where: { id: item.waterProjectCountryId } }),
          ])
          if (!project) throw new Error("Water project not found")
          if (!country) throw new Error("Water project country not found")
          if (country.projectType !== project.projectType) {
            throw new Error("Water project country does not match project type")
          }
          if (item.amountPence !== country.pricePence) {
            throw new Error("Water project amount does not match selected country price")
          }
          return null
        })
    )

    await Promise.all(
      validated.items
        .filter(isSponsorshipItem)
        .map(async (item) => {
          if (!item.sponsorshipProjectId || !item.sponsorshipCountryId) {
            throw new Error("Sponsorship item is missing required information")
          }
          const [project, country] = await Promise.all([
            prisma.sponsorshipProject.findUnique({ where: { id: item.sponsorshipProjectId } }),
            prisma.sponsorshipProjectCountry.findUnique({ where: { id: item.sponsorshipCountryId } }),
          ])
          if (!project) throw new Error("Sponsorship project not found")
          if (!country) throw new Error("Sponsorship country not found")
          if (country.projectType !== project.projectType) {
            throw new Error("Sponsorship country does not match project type")
          }
          if (item.amountPence !== country.pricePence) {
            throw new Error("Sponsorship amount does not match selected country price")
          }
          return null
        })
    )

    const orderNumber = await generateOrderNumber()

    let donor = await prisma.donor.findUnique({
      where: { email: validated.email },
    })

    if (!donor) {
      donor = await prisma.donor.create({
        data: {
          firstName: "Express",
          lastName: "Donor",
          email: validated.email,
        },
      })
    } else {
      donor = await prisma.donor.update({
        where: { id: donor.id },
        data: { firstName: "Express", lastName: "Donor" },
      })
    }

    const order = await prisma.demoOrder.create({
      data: {
        orderNumber,
        status: "PENDING",
        subtotalPence: validated.subtotalPence,
        feesPence,
        totalPence,
        coverFees: validated.coverFees,
        giftAid: false,
        marketingEmail: false,
        marketingSMS: false,
        donorFirstName: "Express",
        donorLastName: "Donor",
        donorEmail: validated.email,
        donorPhone: null,
        donorAddress: null,
        donorCity: null,
        donorPostcode: null,
        donorCountry: null,
        items: {
          create: validated.items.map((item) => ({
            appealId: item.appealId || null,
            fundraiserId: item.fundraiserId || null,
            productId: item.productId || null,
            appealTitle: item.appealTitle,
            productName: item.productName || null,
            frequency: item.frequency,
            donationType: item.donationType,
            amountPence: item.amountPence,
            isAnonymous: item.isAnonymous ?? false,
            waterProjectId: item.waterProjectId || null,
            waterProjectCountryId: item.waterProjectCountryId || null,
            sponsorshipProjectId: item.sponsorshipProjectId || null,
            sponsorshipCountryId: item.sponsorshipCountryId || null,
            sponsorshipProjectType: item.sponsorshipProjectType || null,
            plaqueName: item.plaqueName || null,
          })),
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
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }
    console.error("Create express checkout error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
