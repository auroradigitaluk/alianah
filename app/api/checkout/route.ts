import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { COLLECTION_SOURCES, PAYMENT_METHODS } from "@/lib/utils"
import { z } from "zod"
import Stripe from "stripe"

// Ensure Node runtime for Stripe SDK
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
  productId: z.string().optional(),
  productName: z.string().optional(),
  frequency: z.enum(["ONE_OFF", "MONTHLY", "YEARLY"]),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
  amountPence: z.number().int().positive(),

  // Water project
  waterProjectId: z.string().optional(),
  waterProjectCountryId: z.string().optional(),
  plaqueName: z.string().optional(),

  // Sponsorship
  sponsorshipProjectId: z.string().optional(),
  sponsorshipCountryId: z.string().optional(),
  sponsorshipProjectType: z.string().optional(),
})

const checkoutSchema = z.object({
  items: z.array(itemSchema).min(1),
  donor: z.object({
    title: z.string().optional(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
    billingAddress: z.string().optional(),
    billingCity: z.string().optional(),
    billingPostcode: z.string().optional(),
    billingCountry: z.string().optional(),
    marketingEmail: z.boolean(),
    marketingSMS: z.boolean(),
    giftAid: z.boolean(),
    coverFees: z.boolean(),
  }),
  subtotalPence: z.number().int().nonnegative(),
  feesPence: z.number().int().nonnegative(),
  totalPence: z.number().int().nonnegative(),
})

function isAppealItem(item: z.infer<typeof itemSchema>) {
  return Boolean(item.appealId)
}

function isWaterProjectItem(item: z.infer<typeof itemSchema>) {
  return Boolean(item.waterProjectId)
}

function isSponsorshipItem(item: z.infer<typeof itemSchema>) {
  return Boolean(item.sponsorshipProjectId)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = checkoutSchema.parse(body)

    const billing = {
      address: validated.donor.billingAddress || validated.donor.address || null,
      city: validated.donor.billingCity || validated.donor.city || null,
      postcode: validated.donor.billingPostcode || validated.donor.postcode || null,
      country: validated.donor.billingCountry || validated.donor.country || null,
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Get or create donor
    let donor = await prisma.donor.findUnique({
      where: { email: validated.donor.email },
    })

    if (!donor) {
      donor = await prisma.donor.create({
        data: {
          title: validated.donor.title || null,
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
      donor = await prisma.donor.update({
        where: { id: donor.id },
        data: {
          title: validated.donor.title || donor.title,
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
            appealId: item.appealId || null,
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
      include: { items: true },
    })

    const paymentMethod = PAYMENT_METHODS.WEBSITE_STRIPE
    const collectedVia = COLLECTION_SOURCES.WEBSITE

    // Stripe Checkout can't mix one-off + subscription items in one session.
    const frequencies = new Set(validated.items.map((i) => i.frequency))
    if (frequencies.size !== 1) {
      return NextResponse.json(
        { error: "Please checkout items with the same frequency together (one-off vs recurring)." },
        { status: 400 }
      )
    }
    const checkoutFrequency = validated.items[0]!.frequency

    // Appeal donations (+ recurring)
    const recurringDonationIds: string[] = []
    await Promise.all(
      validated.items
        .filter(isAppealItem)
        .map(async (item) => {
          const donation = await prisma.donation.create({
            data: {
              donorId: donor.id,
              appealId: item.appealId!,
              fundraiserId: item.fundraiserId || null,
              productId: item.productId || null,
              amountPence: item.amountPence,
              donationType: item.donationType,
              frequency: item.frequency,
              paymentMethod,
              collectedVia,
              status: "PENDING",
              giftAid: validated.donor.giftAid,
              billingAddress: billing.address,
              billingCity: billing.city,
              billingPostcode: billing.postcode,
              billingCountry: billing.country,
              orderNumber,
            },
          })

          if (item.frequency === "MONTHLY" || item.frequency === "YEARLY") {
            const recurring = await prisma.recurringDonation.create({
              data: {
                donorId: donor.id,
                appealId: item.appealId!,
                amountPence: item.amountPence,
                donationType: item.donationType,
                frequency: item.frequency,
                paymentMethod,
                status: "PENDING",
              },
            })
            recurringDonationIds.push(recurring.id)
          }

          void donation
        })
    )

    // Water project donations
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

          const donation = await prisma.waterProjectDonation.create({
            data: {
              waterProjectId: item.waterProjectId,
              countryId: item.waterProjectCountryId,
              donorId: donor.id,
              amountPence: item.amountPence,
              donationType: item.donationType,
              paymentMethod,
              collectedVia,
              transactionId: null,
              giftAid: validated.donor.giftAid,
              billingAddress: billing.address,
              billingCity: billing.city,
              billingPostcode: billing.postcode,
              billingCountry: billing.country,
              emailSent: false,
              reportSent: false,
              status: "PENDING",
              notes: [
                item.plaqueName ? `Plaque Name: ${item.plaqueName}` : null,
                `OrderNumber:${orderNumber}`,
              ]
                .filter(Boolean)
                .join(" | ") || null,
            },
            include: {
              waterProject: true,
              country: true,
              donor: true,
            },
          })

          // Email + project status updates happen after successful payment via Stripe webhook.
          void donation
        })
    )

    // Sponsorship donations
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

          const donation = await prisma.sponsorshipDonation.create({
            data: {
              sponsorshipProjectId: item.sponsorshipProjectId,
              countryId: item.sponsorshipCountryId,
              donorId: donor.id,
              amountPence: item.amountPence,
              donationType: item.donationType,
              paymentMethod,
              collectedVia,
              transactionId: null,
              giftAid: validated.donor.giftAid,
              billingAddress: billing.address,
              billingCity: billing.city,
              billingPostcode: billing.postcode,
              billingCountry: billing.country,
              emailSent: false,
              reportSent: false,
              status: "PENDING",
              notes: `OrderNumber:${orderNumber}`,
            },
            include: {
              sponsorshipProject: true,
              country: true,
              donor: true,
            },
          })

          // Email + project status updates happen after successful payment via Stripe webhook.
          void donation
        })
    )

    const isSubscription = checkoutFrequency === "MONTHLY" || checkoutFrequency === "YEARLY"

    if (!isSubscription) {
      const paymentIntent = await getStripe().paymentIntents.create({
        amount: validated.totalPence,
        currency: "gbp",
        // Enable wallets (Apple Pay / Google Pay) + best available methods.
        automatic_payment_methods: { enabled: true },
        receipt_email: validated.donor.email,
        description: `Donation ${orderNumber}`,
        metadata: {
          orderId: order.id,
          orderNumber,
          frequency: checkoutFrequency,
        },
      })

      if (!paymentIntent.client_secret) {
        throw new Error("Failed to create PaymentIntent client secret")
      }

      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        mode: "payment",
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      })
    }

    const recurringInterval: "month" | "year" =
      checkoutFrequency === "YEARLY" ? "year" : "month"

    const customer = await getStripe().customers.create({
      email: validated.donor.email,
      name: `${validated.donor.firstName} ${validated.donor.lastName}`,
      phone: validated.donor.phone || undefined,
      address: billing.address
        ? {
            line1: billing.address,
            city: billing.city || undefined,
            postal_code: billing.postcode || undefined,
            country: billing.country || undefined,
          }
        : undefined,
      metadata: {
        orderNumber,
      },
    })

    // Create Stripe Prices for subscription items (supports custom monthly/yearly amounts)
    const createdPrices = await Promise.all(
      [
        ...validated.items.map(async (item) => {
          const name = item.productName
            ? `${item.appealTitle} • ${item.productName}`
            : item.appealTitle
          const price = await getStripe().prices.create({
            currency: "gbp",
            unit_amount: item.amountPence,
            recurring: { interval: recurringInterval },
            product_data: { name },
            metadata: { orderNumber },
          })
          return { priceId: price.id }
        }),
        ...(validated.feesPence > 0
          ? [
              (async () => {
                const price = await getStripe().prices.create({
                  currency: "gbp",
                  unit_amount: validated.feesPence,
                  recurring: { interval: recurringInterval },
                  product_data: { name: "Processing fees cover" },
                  metadata: { orderNumber },
                })
                return { priceId: price.id }
              })(),
            ]
          : []),
      ]
    )

    const subscription = await getStripe().subscriptions.create({
      customer: customer.id,
      payment_behavior: "default_incomplete",
      collection_method: "charge_automatically",
      payment_settings: {
        // Allow card-based wallets on the underlying PaymentIntent.
        save_default_payment_method: "on_subscription",
      },
      metadata: {
        orderId: order.id,
        orderNumber,
        frequency: checkoutFrequency,
      },
      items: createdPrices.map((p) => ({ price: p.priceId, quantity: 1 })),
      expand: ["latest_invoice.payment_intent"],
    })

    // Stripe TS types vary by version; ensure `payment_intent` is accessible.
    const latestInvoice = subscription.latest_invoice as (Stripe.Invoice & {
      payment_intent?: string | Stripe.PaymentIntent | null
    }) | null
    const paymentIntent =
      latestInvoice && typeof latestInvoice.payment_intent !== "string"
        ? latestInvoice.payment_intent
        : null

    if (!paymentIntent?.client_secret) {
      throw new Error("Failed to create subscription payment client secret")
    }

    if (recurringDonationIds.length > 0) {
      await prisma.recurringDonation.updateMany({
        where: { id: { in: recurringDonationIds } },
        data: { subscriptionId: subscription.id },
      })
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      mode: "subscription",
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      subscriptionId: subscription.id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }
    console.error("Checkout error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
