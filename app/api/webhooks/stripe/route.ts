import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Lazy initialization to avoid errors during build when API key is not available
let stripe: any = null

function getStripe() {
  if (!stripe) {
    const Stripe = require("stripe")
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    stripe = new Stripe(apiKey, {
      apiVersion: "2024-12-18.acacia",
    })
  }
  return stripe
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event: any

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        
        // Find donation by order number or transaction ID
        const orderNumber = session.metadata?.orderNumber
        const transactionId = session.payment_intent as string

        if (orderNumber) {
          // Update all donations for this order
          await prisma.donation.updateMany({
            where: {
              orderNumber: orderNumber,
              status: "PENDING",
            },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              transactionId: transactionId,
            },
          })

          // Update demo order status
          await prisma.demoOrder.updateMany({
            where: {
              orderNumber: orderNumber,
            },
            data: {
              status: "COMPLETED",
            },
          })

          // Activate recurring donations if any
          await prisma.recurringDonation.updateMany({
            where: {
              donor: {
                email: session.customer_email || undefined,
              },
              status: "PENDING",
            },
            data: {
              status: "ACTIVE",
              lastPaymentDate: new Date(),
            },
          })
        }

        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object
        
        // Update donation by transaction ID
        if (paymentIntent.metadata?.donationId) {
          await prisma.donation.update({
            where: {
              id: paymentIntent.metadata.donationId,
            },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              transactionId: paymentIntent.id,
            },
          })
        }

        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object
        
        // Handle recurring donation payment
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription as string
          
          await prisma.recurringDonation.updateMany({
            where: {
              subscriptionId: subscriptionId,
            },
            data: {
              lastPaymentDate: new Date(),
              status: "ACTIVE",
            },
          })
        }

        break
      }

      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const subscription = event.data.object
        
        if (subscription.id) {
          await prisma.recurringDonation.updateMany({
            where: {
              subscriptionId: subscription.id,
            },
            data: {
              status: "FAILED",
            },
          })
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
